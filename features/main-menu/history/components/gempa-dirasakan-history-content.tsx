import EarthquakeMap from "@/components/ui/earthquake-map";
import { ModalShakeMap } from "@/components/ui/modal-shakemap";
import { DetailItem, StatItem } from "@/components/ui/quake-card";
import { getApp } from "@/config/firebase-init";
import type { MapViewType } from "@/constants/map";
import { checkTextAssetAvailable } from "@/features/main-menu/earthquake/utils/text-asset-utils";
import { buildNarasiUrl } from "@/features/main-menu/home/utils/coord-utils";
import { useCardAnimation } from "@/hooks/use-card-animation";
import {
    formatLatText,
    formatLonText,
    haversineDistanceKm,
    parseCoordinateText,
} from "@/utils/geo";
import {
    endAt,
    get,
    getDatabase,
    orderByChild,
    query,
    ref,
    startAt,
} from "@react-native-firebase/database";
import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { dedupeByKey } from "../utils/dedupe";
import {
    buildDirasakanDateRange,
    getNowYearMonth,
    matchesDirasakanMonth,
    normalizeFilterMonths,
} from "../utils/filter";
import styles from "./styles/gempa-dirasakan-history-content";

// ─── Constants ────────────────────────────────────────────────────────────────

const SHAKEMAP_BASE = "https://bmkg-content-inatews.storage.googleapis.com";
const DB_PATH = "gempa_dirasakan/items";
const MAX_POINTS = 20;
const REFERENCE_LOCATION = { latitude: -6.9175, longitude: 107.6191 };
const LIST_HIDE_TO_CARD_DELAY_MS = 340;

// ─── Types ────────────────────────────────────────────────────────────────────

type QuakeItem = {
  eventId: string;
  latitude: number;
  longitude: number;
  distanceKm: string;
  magnitude: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  kedalaman: string;
  felt: string;
  latText: string;
  lonText: string;
  shakemap: string | null;
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
  shakemap: string | null;
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
  onOpenNarasi?: (url: string) => void;
  externalSelection?: ExternalSelection | null;
  isActive?: boolean;
  filterYear?: number;
  filterMonths?: number[];
  /** Called by parent when this tab is switched TO — triggers fly-in to newest quake */
  onTabActivate?: (flyToNewest: () => void) => void;
};

// ─── Module-level helpers ─────────────────────────────────────────────────────

function parseQuakeCoords(
  candidate: any,
): { latitude: number; longitude: number } | null {
  const coordStr = String(candidate?.point?.coordinates ?? "");
  const [lonStr, latStr] = coordStr.split(",");

  let latitude = parseCoordinateText(latStr);
  if (latitude === null)
    latitude = parseCoordinateText(candidate?.latitude ?? candidate?.lat);
  if (latitude === null)
    latitude = parseCoordinateText(candidate?.coordinates?.latitude);

  let longitude = parseCoordinateText(lonStr);
  if (longitude === null)
    longitude = parseCoordinateText(candidate?.longitude ?? candidate?.lon);
  if (longitude === null)
    longitude = parseCoordinateText(candidate?.coordinates?.longitude);

  if (latitude === null || longitude === null) return null;
  return { latitude, longitude };
}

function buildQuakeItem(
  candidate: any,
  index: number,
  haversine: (a: number, b: number, c: number, d: number) => number,
): QuakeItem | null {
  const coords = parseQuakeCoords(candidate);
  if (!coords) return null;
  const { latitude, longitude } = coords;

  const distanceKm = haversine(
    REFERENCE_LOCATION.latitude,
    REFERENCE_LOCATION.longitude,
    latitude,
    longitude,
  ).toFixed(1);

  return {
    eventId: String(
      candidate?.eventId ??
        candidate?.id ??
        candidate?.eventid ??
        `${candidate?.tanggal ?? candidate?.date ?? ""}-${candidate?.jam ?? candidate?.time ?? ""}-${index}`,
    ),
    latitude,
    longitude,
    distanceKm,
    magnitude: String(candidate?.magnitude ?? candidate?.mag ?? ""),
    wilayah: String(
      candidate?.wilayah ??
        candidate?.area ??
        candidate?.lokasi ??
        candidate?.place ??
        "",
    ),
    tanggal: String(candidate?.tanggal ?? candidate?.date ?? ""),
    jam: String(candidate?.jam ?? candidate?.time ?? ""),
    kedalaman: String(candidate?.kedalaman ?? candidate?.depth ?? ""),
    felt: String(candidate?.felt ?? ""),
    latText: formatLatText(latitude),
    lonText: formatLonText(longitude),
    shakemap: candidate?.shakemap ? String(candidate.shakemap) : null,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GempaDirasakanHistoryContent({
  tabBar,
  onLoadingChange,
  onListDataChange,
  selectedListEventId,
  onListSelectionHandled,
  onCardClose,
  onCardOpen,
  onOpenNarasi,
  externalSelection,
  isActive = true,
  filterYear,
  filterMonths,
  onTabActivate,
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
        "dirasakan",
        now,
      ),
    [effectiveYear, fallback.month, filterMonths, now],
  );
  const ranges = useMemo(
    () =>
      effectiveMonths.map((month) => ({
        month,
        ...buildDirasakanDateRange(effectiveYear, month),
      })),
    [effectiveMonths, effectiveYear],
  );

  // ── State ──────────────────────────────────────────────────────────────────

  const [quakes, setQuakes] = useState<QuakeItem[]>([]);
  const [shakeMapVisible, setShakeMapVisible] = useState(false);
  const [narasiUrl, setNarasiUrl] = useState<string | null>(null);
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
    btnOpacity,
    panResponder,
    openCard: openCardAnimation,
    dismissCard: dismissCardAnimation,
    closeCardForReplacement,
    hideCardImmediately,
  } = useCardAnimation({ onSwipeDismiss: handleSwipeDismiss });

  // ── Derived ────────────────────────────────────────────────────────────────

  const activeQuake: QuakeItem | null =
    selectedIndex !== null && quakes[selectedIndex]
      ? quakes[selectedIndex]
      : overrideQuake;

  const shakeMapUrl = activeQuake?.shakemap
    ? `${SHAKEMAP_BASE}/${activeQuake.shakemap}`
    : null;

  useEffect(() => {
    const candidateNarasiUrl = activeQuake?.shakemap
      ? buildNarasiUrl(activeQuake.shakemap)
      : null;

    setNarasiUrl(null);
    if (!candidateNarasiUrl) return;

    const controller = new AbortController();

    void checkTextAssetAvailable(candidateNarasiUrl, controller.signal).then(
      (availableUrl) => {
        if (!controller.signal.aborted) {
          setNarasiUrl(availableUrl);
        }
      },
    );

    return () => controller.abort();
  }, [activeQuake?.eventId, activeQuake?.shakemap]);

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
        jarak: `${q.distanceKm} km dari Bandung`,
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
      // Re-centre map without offset when card closes
      if (showCardRef.current && activeQuake) {
        mapRef.current?.animateToRegion(
          {
            latitude: activeQuake.latitude,
            longitude: activeQuake.longitude,
            latitudeDelta: 2.5,
            longitudeDelta: 2.5,
          },
          400,
        );
      }

      dismissCardAnimation(() => {
        clearCardSelection();
        onCardClose?.();
        callback?.();
      });
    },
    [
      activeQuake,
      clearCardSelection,
      dismissCardAnimation,
      onCardClose,
      showCardRef,
    ],
  );

  // ── Fly-to-marker with offset ──────────────────────────────────────────────

  const flyToAndOpen = useCallback(
    (quake: QuakeItem, delay = 300, notifyParent = true) => {
      if (openCardTimeoutRef.current) {
        clearTimeout(openCardTimeoutRef.current);
      }

      mapRef.current?.animateToRegion(
        {
          latitude: quake.latitude - 0.15,
          longitude: quake.longitude,
          latitudeDelta: 2.5,
          longitudeDelta: 2.5,
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

  // ── Hide card when tab goes inactive ──────────────────────────────────────

  useEffect(() => {
    if (!isActive) {
      hideCardImmediately();
      clearCardSelection();
      isFirstLoad.current = true; // Re-arm fly-in for next activation
    }
  }, [clearCardSelection, hideCardImmediately, isActive]);

  // ── Fly to newest quake when tab becomes active ────────────────────────────

  useEffect(() => {
    if (!isActive) return;
    // If data is already loaded, fly immediately; otherwise isFirstLoad handles it
    if (quakes.length === 0) return;
    const newest = quakes[0];
    mapRef.current?.animateToRegion(
      {
        latitude: newest.latitude - 0.15,
        longitude: newest.longitude,
        latitudeDelta: 2.5,
        longitudeDelta: 2.5,
      },
      800,
    );
    isFirstLoad.current = false;
    // Only re-run when isActive flips to true — not on every quakes change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // ── External selection (from history list row press) ─────────────────────

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
            distanceKm: externalSelection.distanceKm,
            magnitude: externalSelection.magnitude,
            wilayah: externalSelection.lokasi,
            tanggal: externalSelection.tanggal,
            jam: externalSelection.jam,
            kedalaman: externalSelection.kedalaman,
            felt: externalSelection.felt,
            latText: formatLatText(externalSelection.latitude),
            lonText: formatLonText(externalSelection.longitude),
            shakemap: externalSelection.shakemap,
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

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isActive) return;
    isMountedRef.current = true;

    const app = getApp();
    const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
    const db = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);

    const runFetch = async () => {
      onLoadingChange?.(true);

      const snapshots = await Promise.all(
        ranges.map(async (rangeItem) =>
          get(
            query(
              ref(db, DB_PATH),
              orderByChild("date"),
              startAt(rangeItem.start),
              endAt(rangeItem.end),
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
        return Array.isArray(raw)
          ? raw
          : raw && typeof raw === "object"
            ? Object.values(raw)
            : [];
      });

      if (candidates.length === 0) {
        setQuakes([]);
        onLoadingChange?.(false);
        return;
      }

      const merged = candidates
        .sort((a, b) => {
          const keyA = String(
            a?.eventid ??
              a?.eventId ??
              a?.timesent ??
              `${a?.tanggal ?? a?.date ?? ""} ${a?.jam ?? a?.time ?? ""}`,
          );
          const keyB = String(
            b?.eventid ??
              b?.eventId ??
              b?.timesent ??
              `${b?.tanggal ?? b?.date ?? ""} ${b?.jam ?? b?.time ?? ""}`,
          );
          return keyB.localeCompare(keyA);
        })
        .filter((candidate) =>
          effectiveMonths.some((month) =>
            matchesDirasakanMonth(
              candidate?.tanggal ?? candidate?.date,
              effectiveYear,
              month,
            ),
          ),
        )
        .reduce<QuakeItem[]>((acc, candidate, index) => {
          const item = buildQuakeItem(candidate, index, haversineDistanceKm);
          if (item) acc.push(item);
          return acc;
        }, [])
        .slice(0, MAX_POINTS);

      const normalized = dedupeByKey(merged, (q) => q.eventId, MAX_POINTS);

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
            latitude: normalized[0].latitude - 0.15,
            longitude: normalized[0].longitude,
            latitudeDelta: 2.5,
            longitudeDelta: 2.5,
          },
          800,
        );
      }

      // Only touch selection when card is open — prevents reopening after dismiss
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

      <View style={styles.topControls}>
        {tabBar}
        {showCard && narasiUrl && onOpenNarasi && (
          <Animated.View style={[styles.mapButtons, { opacity: btnOpacity }]}>
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => onOpenNarasi(narasiUrl)}
            >
              <Feather name="file-text" size={12} color="white" />
              <Text style={styles.mapButtonText}>NARASI RESMI</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

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
          <DetailItem
            icon="walk-outline"
            label="Jarak :"
            value={`${activeQuake.distanceKm} km`}
            styles={styles}
          />
          {!!activeQuake.felt && (
            <DetailItem
              icon="alert-circle-outline"
              label="Wilayah Dirasakan (Skala MMI) :"
              value={activeQuake.felt}
              styles={styles}
            />
          )}

          <TouchableOpacity
            style={[
              styles.simulasiBtn,
              !shakeMapUrl && styles.simulasiBtnDisabled,
            ]}
            activeOpacity={0.8}
            onPress={() => shakeMapUrl && setShakeMapVisible(true)}
            disabled={!shakeMapUrl}
          >
            <Text style={styles.simulasiBtnText}>PETA GUNCANGAN</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <ModalShakeMap
        visible={shakeMapVisible}
        imageUrl={shakeMapUrl}
        onClose={() => setShakeMapVisible(false)}
      />
    </View>
  );
}

export default function GempaDirasakanHistoryRoute() {
  return <GempaDirasakanHistoryContent tabBar={null} />;
}
