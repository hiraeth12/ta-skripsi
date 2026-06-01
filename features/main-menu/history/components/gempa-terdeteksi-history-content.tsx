import EarthquakeMap from "@/components/ui/earthquake-map";
import { DetailItem, StatItem } from "@/components/ui/quake-card";
import { getApp } from "@/config/firebase-init";
import type { MapViewType } from "@/constants/map";
import { useCardAnimation } from "@/hooks/use-card-animation";
import { formatLatText, formatLonText, parseCoordinateText } from "@/utils/geo";
import {
    endAt,
    get,
    getDatabase,
    limitToLast,
    orderByChild,
    query,
    ref,
    startAt,
} from "@react-native-firebase/database";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, View } from "react-native";
import { dedupeByKey } from "../utils/dedupe";
import {
    buildTerdeteksiTimeRange,
    getNowYearMonth,
    matchesTerdeteksiMonth,
    normalizeFilterMonths,
} from "../utils/filter";
import styles from "./styles/gempa-terdeteksi-content";

// ─── Constants ────────────────────────────────────────────────────────────────

const DB_PATH = "gempa_terdeteksi/items";
const MAX_POINTS = 20;
const LIST_HIDE_TO_CARD_DELAY_MS = 340;

// ─── Types ────────────────────────────────────────────────────────────────────

type QuakeItem = {
  eventId: string;
  latitude: number;
  longitude: number;
  magnitude: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  kedalaman: string;
  felt: string;
  latText: string;
  lonText: string;
};

type ExternalSelection = {
  eventId: string;
  latitude: number;
  longitude: number;
  magnitude: string;
  lokasi: string;
  tanggal: string;
  jam: string;
  distanceKm: string;
  kedalaman: string;
  felt: string;
};

export type HistoryListItem = {
  eventId: string;
  magnitude: string;
  lokasi: string;
  waktu: string;
  jarak: string;
};

type Props = {
  tabBar: React.ReactNode;
  onLoadingChange?: (loading: boolean) => void;
  onListDataChange?: (items: HistoryListItem[]) => void;
  selectedListEventId?: string | null;
  onListSelectionHandled?: () => void;
  onCardClose?: () => void;
  onCardOpen?: () => void;
  externalSelection?: ExternalSelection | null;
  isActive?: boolean;
  filterYear?: number;
  filterMonths?: number[];
};

// ─── Module-level helpers ─────────────────────────────────────────────────────

function buildQuakeItem(item: any, index: number): QuakeItem | null {
  const coords = item?.geometry?.coordinates || item?.coordinates;
  const latitude = parseCoordinateText(
    item?.latitude ?? item?.lat ?? coords?.latitude ?? coords?.[1],
  );
  const longitude = parseCoordinateText(
    item?.longitude ?? item?.lon ?? coords?.longitude ?? coords?.[0],
  );
  if (latitude === null || longitude === null) return null;

  const props = item?.properties ?? item;
  const [tanggalFromTime, jamRaw] = String(props?.time ?? "").split(" ");
  const jam = (jamRaw ?? "").split(".")[0];

  const eventId = String(
    props?.eventId ??
      props?.id ??
      props?.eventid ??
      `${props?.time ?? ""}-${latitude}-${longitude}-${index}`,
  );

  return {
    eventId,
    latitude,
    longitude,
    magnitude: parseFloat(
      String(props?.mag ?? props?.magnitude ?? "0"),
    ).toFixed(1),
    wilayah: String(props?.place ?? props?.area ?? props?.lokasi ?? ""),
    tanggal: String(props?.tanggal ?? tanggalFromTime ?? ""),
    jam: String(props?.jam ?? jam ?? ""),
    kedalaman: `${parseFloat(String(props?.depth ?? props?.kedalaman ?? "0")).toFixed(1)} km`,
    felt: String(props?.fase ?? props?.felt ?? ""),
    latText: formatLatText(latitude),
    lonText: formatLonText(longitude),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GempaTerdeteksiHistoryContent({
  tabBar,
  onLoadingChange,
  onListDataChange,
  selectedListEventId,
  onListSelectionHandled,
  onCardClose,
  onCardOpen,
  externalSelection,
  isActive = true,
  filterYear,
  filterMonths,
}: Props) {
  const now = useMemo(() => new Date(), []);
  const fallback = getNowYearMonth(now);
  const effectiveYear = Number.isFinite(filterYear)
    ? filterYear!
    : fallback.year;
  const effectiveMonths = useMemo(
    () =>
      normalizeFilterMonths(
        filterMonths ?? [fallback.month],
        effectiveYear,
        "terdeteksi",
        now,
      ),
    [effectiveYear, fallback.month, filterMonths, now],
  );
  const ranges = useMemo(
    () =>
      effectiveMonths.map((month) => ({
        month,
        ...buildTerdeteksiTimeRange(effectiveYear, month),
      })),
    [effectiveMonths, effectiveYear],
  );
  // ── State ──────────────────────────────────────────────────────────────────

  const [quakes, setQuakes] = useState<QuakeItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [overrideQuake, setOverrideQuake] = useState<QuakeItem | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────

  const mapRef = useRef<MapViewType | null>(null);
  const selectedEventIdRef = useRef<string | null>(null);
  const lastExternalIdRef = useRef<string | null>(null);
  const dataSignatureRef = useRef<string | null>(null);
  const isFirstLoad = useRef(true);
  const isMountedRef = useRef(true);
  const openCardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCardSelection = useCallback(() => {
    setSelectedIndex(null);
    setOverrideQuake(null);
    selectedEventIdRef.current = null;
    lastExternalIdRef.current = null;
  }, []);

  const handleSwipeDismiss = useCallback(() => {
    clearCardSelection();
    onCardClose?.();
  }, [clearCardSelection, onCardClose]);

  const {
    showCard,
    showCardRef,
    translateY,
    opacity,
    panResponder,
    openCard: openCardAnimation,
    dismissCard: dismissCardAnimation,
    closeCardForReplacement,
    hideCardImmediately,
  } = useCardAnimation({ onSwipeDismiss: handleSwipeDismiss });

  // ── Derived ────────────────────────────────────────────────────────────────

  // One consistent value used everywhere — no dual-state desync
  const activeQuake: QuakeItem | null =
    selectedIndex !== null && quakes[selectedIndex]
      ? quakes[selectedIndex]
      : overrideQuake;

  const markerCoordinates = useMemo(
    () =>
      quakes.map((q) => ({
        latitude: q.latitude,
        longitude: q.longitude,
        magnitude: q.magnitude,
        depth: q.kedalaman,
        eventId: q.eventId,
      })),
    [quakes],
  );

  const listItems = useMemo(
    () =>
      quakes.map((q) => ({
        eventId: q.eventId,
        magnitude: q.magnitude,
        lokasi: q.wilayah,
        waktu: `${q.jam} • ${q.tanggal}`,
        jarak: "-",
      })),
    [quakes],
  );

  // ── Card animation ─────────────────────────────────────────────────────────

  const openCard = useCallback(
    (notifyParent = true) => {
      if (notifyParent) {
        onCardOpen?.();
      }
      openCardAnimation();
    },
    [onCardOpen, openCardAnimation],
  );

  const dismissCard = useCallback(
    (callback?: () => void) => {
      dismissCardAnimation(() => {
        clearCardSelection();
        onCardClose?.();
        callback?.();
      });
    },
    [clearCardSelection, dismissCardAnimation, onCardClose],
  );

  const flyToAndOpen = useCallback(
    (quake: QuakeItem, delay = 300, notifyParent = true) => {
      if (openCardTimeoutRef.current) {
        clearTimeout(openCardTimeoutRef.current);
      }

      mapRef.current?.animateToRegion(
        {
          latitude: quake.latitude,
          longitude: quake.longitude,
          latitudeDelta: 2,
          longitudeDelta: 2,
        },
        400,
      );
      openCardTimeoutRef.current = setTimeout(() => {
        openCardTimeoutRef.current = null;
        openCard(notifyParent);
      }, delay);
    },
    [openCard],
  );

  useEffect(() => {
    return () => {
      if (openCardTimeoutRef.current) {
        clearTimeout(openCardTimeoutRef.current);
      }
    };
  }, []);

  // ── PanResponder ───────────────────────────────────────────────────────────

  // ── Marker press ──────────────────────────────────────────────────────────

  const onPressMarker = useCallback(
    (index: number) => {
      const quake = quakes[index];
      if (!quake) return;
      selectedEventIdRef.current = quake.eventId;
      onCardOpen?.();
      closeCardForReplacement(() => {
        setOverrideQuake(null);
        setSelectedIndex(index);
        flyToAndOpen(quake, LIST_HIDE_TO_CARD_DELAY_MS, false);
      });
    },
    [closeCardForReplacement, flyToAndOpen, onCardOpen, quakes],
  );

  const handleMapPress = useCallback(() => dismissCard(), [dismissCard]);
  const handleMarkerPressIndex = useCallback(
    (index: number) => onPressMarker(index),
    [onPressMarker],
  );

  useEffect(() => {
    if (!isActive) {
      hideCardImmediately();
      clearCardSelection();
    }
  }, [clearCardSelection, hideCardImmediately, isActive]);

  useEffect(() => {
    if (!externalSelection?.eventId) return;
    if (lastExternalIdRef.current === externalSelection.eventId) return;
    if (!isActive) return;
    lastExternalIdRef.current = externalSelection.eventId;

    const targetIndex = quakes.findIndex(
      (q) => q.eventId === externalSelection.eventId,
    );

    const quake: QuakeItem =
      targetIndex >= 0
        ? quakes[targetIndex]
        : {
            eventId: externalSelection.eventId,
            latitude: externalSelection.latitude,
            longitude: externalSelection.longitude,
            magnitude: externalSelection.magnitude,
            wilayah: externalSelection.lokasi,
            tanggal: externalSelection.tanggal,
            jam: externalSelection.jam,
            kedalaman: externalSelection.kedalaman,
            felt: externalSelection.felt,
            latText: formatLatText(externalSelection.latitude),
            lonText: formatLonText(externalSelection.longitude),
          };

    selectedEventIdRef.current = quake.eventId;

    if (targetIndex >= 0) {
      setOverrideQuake(null);
      setSelectedIndex(targetIndex);
    } else {
      setSelectedIndex(null);
      setOverrideQuake(quake);
    }

    flyToAndOpen(quake);
    onListSelectionHandled?.();
  }, [
    externalSelection,
    isActive,
    quakes,
    flyToAndOpen,
    onListSelectionHandled,
  ]);

  // ── selectedListEventId (direct list row tap) ─────────────────────────────

  useEffect(() => {
    if (!selectedListEventId || quakes.length === 0) return;
    const targetIndex = quakes.findIndex(
      (q) => q.eventId === selectedListEventId,
    );
    if (targetIndex < 0) {
      onListSelectionHandled?.();
      return;
    }
    const quake = quakes[targetIndex];
    selectedEventIdRef.current = quake.eventId;
    setOverrideQuake(null);
    setSelectedIndex(targetIndex);
    flyToAndOpen(quake);
    onListSelectionHandled?.();
  }, [selectedListEventId, quakes, flyToAndOpen, onListSelectionHandled]);

  // ── List data callback ─────────────────────────────────────────────────────

  useEffect(() => {
    onListDataChange?.(listItems);
  }, [listItems, onListDataChange]);

  // ── Polling ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isActive) return;
    isMountedRef.current = true;

    const app = getApp();
    const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
    const db = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);

    const runFetch = async () => {
      const snapshots = await Promise.all(
        ranges.map(async (rangeItem) =>
          get(
            query(
              ref(db, DB_PATH),
              orderByChild("time"),
              startAt(rangeItem.start),
              endAt(rangeItem.end),
              limitToLast(20),
            ),
          ),
        ),
      );

      if (!isMountedRef.current) return;
      if (!snapshots.some((snapshot) => snapshot?.exists?.())) {
        dataSignatureRef.current = null;
        setQuakes([]);
        onLoadingChange?.(false);
        return;
      }

      const candidates: any[] = snapshots.flatMap((snapshot) => {
        if (!snapshot?.exists?.()) return [];
        const raw = snapshot.val();
        const itemsNode = raw?.items ?? raw;
        return Array.isArray(itemsNode)
          ? itemsNode
          : itemsNode && typeof itemsNode === "object"
            ? Object.values(itemsNode)
            : [];
      });

      if (candidates.length === 0) {
        setQuakes([]);
        onLoadingChange?.(false);
        return;
      }

      const merged = [...candidates]
        .filter((candidate) =>
          effectiveMonths.some((month) =>
            matchesTerdeteksiMonth(
              candidate?.time ??
                candidate?.properties?.time ??
                candidate?.tanggal,
              effectiveYear,
              month,
            ),
          ),
        )
        .sort((a, b) =>
          String(b?.time ?? b?.jam ?? "").localeCompare(
            String(a?.time ?? a?.jam ?? ""),
          ),
        );

      const builtItems = merged.reduce<QuakeItem[]>((acc, item) => {
        const built = buildQuakeItem(item, acc.length);
        if (built) acc.push(built);
        return acc;
      }, []);
      const normalized = dedupeByKey(builtItems, (q) => q.eventId, MAX_POINTS);

      const signature = normalized.map((q) => q.eventId).join("|");
      if (signature === dataSignatureRef.current) {
        onLoadingChange?.(false);
        return;
      }
      dataSignatureRef.current = signature;

      const foundIndex = selectedEventIdRef.current
        ? normalized.findIndex((q) => q.eventId === selectedEventIdRef.current)
        : -1;

      if (overrideQuake && foundIndex >= 0) setOverrideQuake(null);

      setQuakes(normalized);
      onLoadingChange?.(false);

      if (isFirstLoad.current && normalized[0]) {
        isFirstLoad.current = false;
        mapRef.current?.animateToRegion(
          {
            latitude: normalized[0].latitude,
            longitude: normalized[0].longitude,
            latitudeDelta: 2,
            longitudeDelta: 2,
          },
          800,
        );
      }

      if (!showCardRef.current) return;
      if (foundIndex >= 0) setSelectedIndex(foundIndex);
    };

    void runFetch();

    return () => {
      isMountedRef.current = false;
    };
  }, [effectiveMonths, effectiveYear, isActive, onLoadingChange, ranges]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <EarthquakeMap
        mapRef={mapRef}
        markerCoordinates={markerCoordinates}
        temporaryMarkerCoordinate={
          overrideQuake && selectedIndex === null
            ? {
                latitude: overrideQuake.latitude,
                longitude: overrideQuake.longitude,
                magnitude: overrideQuake.magnitude,
                depth: overrideQuake.kedalaman,
              }
            : null
        }
        onMapPress={handleMapPress}
        onMarkerPressIndex={handleMarkerPressIndex}
        isCardOpen={showCard}
      />

      <View style={styles.topControls}>{tabBar}</View>

      {showCard && activeQuake && (
        <Animated.View
          style={[
            styles.locationCard,
            { transform: [{ translateY }], opacity },
          ]}
        >
          {/* Drag handle */}
          <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
            <View style={styles.dragHandle} />
          </View>

          {/* Stats row */}
          <View style={styles.statsTopRow}>
            <StatItem
              icon="triangle-wave"
              value={activeQuake.magnitude}
              label="Magnitudo"
              styles={styles}
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="rss"
              value={activeQuake.kedalaman}
              label="Kedalaman"
              styles={styles}
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="compass-outline"
              value={activeQuake.latText}
              label="LS"
              styles={styles}
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="compass-outline"
              value={activeQuake.lonText}
              label="BT"
              styles={styles}
            />
          </View>

          <View style={styles.separator} />

          <DetailItem
            icon="location"
            label="Lokasi Gempa :"
            value={activeQuake.wilayah}
            styles={styles}
          />
          <DetailItem
            icon="time-outline"
            label="Waktu :"
            value={`${activeQuake.tanggal}, ${activeQuake.jam}`}
            styles={styles}
          />
          {!!activeQuake.felt && (
            <DetailItem
              icon="alert-circle-outline"
              label="Fase :"
              value={activeQuake.felt}
              styles={styles}
            />
          )}
        </Animated.View>
      )}
    </View>
  );
}

export default function GempaTerdeteksiHistoryRoute() {
  return <GempaTerdeteksiHistoryContent tabBar={null} />;
}
