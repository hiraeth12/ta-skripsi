import EarthquakeMap from "@/components/earthquake-map";
import { getApp } from "@/config/firebase-init";
import type { MapViewType } from "@/constants/map";
import { useHaversine } from "@/hooks/use-haversine";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
    endAt,
    get,
    getDatabase,
    orderByChild,
    query,
    ref,
    startAt,
} from "@react-native-firebase/database";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Image,
    Modal,
    PanResponder,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import {
    buildDirasakanDateRange,
    getNowYearMonth,
    matchesDirasakanMonth,
    normalizeFilterMonths,
} from "../utils/filter";
import styles from "./styles/gempa-dirasakan-history-content";

// ─── Constants ────────────────────────────────────────────────────────────────

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHAKEMAP_BASE = "https://bmkg-content-inatews.storage.googleapis.com";
const DB_PATH = "gempa_dirasakan/items";
const MAX_POINTS = 20;
const REFERENCE_LOCATION = { latitude: -6.9175, longitude: 107.6191 };

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
  externalSelection?: ExternalSelection | null;
  isActive?: boolean;
  filterYear?: number;
  filterMonths?: number[];
  /** Called by parent when this tab is switched TO — triggers fly-in to newest quake */
  onTabActivate?: (flyToNewest: () => void) => void;
};

// ─── Module-level helpers ─────────────────────────────────────────────────────

function parseWithHemisphere(value: unknown, negToken: string, posToken: string): number {
  const raw = String(value ?? "").trim();
  if (!raw) return NaN;
  const numeric = parseFloat(raw.replace(",", "."));
  if (isNaN(numeric)) return NaN;
  const upper = raw.toUpperCase();
  if (upper.includes(negToken)) return -Math.abs(numeric);
  if (upper.includes(posToken)) return Math.abs(numeric);
  return numeric;
}

function parseQuakeCoords(candidate: any): { latitude: number; longitude: number } | null {
  const coordStr = String(candidate?.point?.coordinates ?? "");
  const [lonStr, latStr] = coordStr.split(",");

  let latitude = parseWithHemisphere(latStr, "LS", "LU");
  if (isNaN(latitude)) latitude = parseWithHemisphere(candidate?.latitude ?? candidate?.lat, "LS", "LU");
  if (isNaN(latitude)) latitude = parseWithHemisphere(candidate?.coordinates?.latitude, "LS", "LU");

  let longitude = parseWithHemisphere(lonStr, "BB", "BT");
  if (isNaN(longitude)) longitude = parseWithHemisphere(candidate?.longitude ?? candidate?.lon, "BB", "BT");
  if (isNaN(longitude)) longitude = parseWithHemisphere(candidate?.coordinates?.longitude, "BB", "BT");

  if (isNaN(latitude) || isNaN(longitude)) return null;
  return { latitude, longitude };
}

function buildQuakeItem(candidate: any, index: number, haversine: (a: number, b: number, c: number, d: number) => number): QuakeItem | null {
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
      candidate?.eventId ?? candidate?.id ?? candidate?.eventid ??
      `${candidate?.tanggal ?? candidate?.date ?? ""}-${candidate?.jam ?? candidate?.time ?? ""}-${index}`,
    ),
    latitude,
    longitude,
    distanceKm,
    magnitude: String(candidate?.magnitude ?? candidate?.mag ?? ""),
    wilayah: String(candidate?.wilayah ?? candidate?.area ?? candidate?.lokasi ?? candidate?.place ?? ""),
    tanggal: String(candidate?.tanggal ?? candidate?.date ?? ""),
    jam: String(candidate?.jam ?? candidate?.time ?? ""),
    kedalaman: String(candidate?.kedalaman ?? candidate?.depth ?? ""),
    felt: String(candidate?.felt ?? ""),
    latText: `${Math.abs(latitude).toFixed(2)}°${latitude < 0 ? "LS" : "LU"}`,
    lonText: `${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? "BT" : "BB"}`,
    shakemap: candidate?.shakemap ? String(candidate.shakemap) : null,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatItem = ({ icon, value, label }: { icon: string; value: string; label: string }) => (
  <View style={styles.statTopItem}>
    <MaterialCommunityIcons name={icon as any} size={20} color="#0369A1" />
    <Text style={styles.statTopValue}>{value}</Text>
    <Text style={styles.statTopLabel}>{label}</Text>
  </View>
);

const DetailItem = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon as any} size={18} color="#1E6F9F" style={styles.infoIcon} />
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

// ─── Component ────────────────────────────────────────────────────────────────

export function GempaDirasakanHistoryContent({
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
  onTabActivate,
}: Props) {
  const { haversineDistanceKm } = useHaversine();
  const now = useMemo(() => new Date(), []);
  const fallback = getNowYearMonth(now);
  const effectiveYear = Number.isFinite(filterYear) ? filterYear! : fallback.year;
  const effectiveMonths = useMemo(
    () => normalizeFilterMonths(filterMonths ?? [fallback.month], effectiveYear, "dirasakan", now),
    [effectiveYear, fallback.month, filterMonths, now],
  );
  const ranges = useMemo(
    () => effectiveMonths.map((month) => ({ month, ...buildDirasakanDateRange(effectiveYear, month) })),
    [effectiveMonths, effectiveYear],
  );

  // ── State ──────────────────────────────────────────────────────────────────

  const [quakes, setQuakes] = useState<QuakeItem[]>([]);
  const [showCard, setShowCard] = useState(false);
  const [shakeMapVisible, setShakeMapVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [overrideQuake, setOverrideQuake] = useState<QuakeItem | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────

  const mapRef = useRef<MapViewType | null>(null);
  const showCardRef = useRef(false);
  const selectedEventIdRef = useRef<string | null>(null);
  const lastExternalIdRef = useRef<string | null>(null);
  const dataSignatureRef = useRef<string | null>(null);
  const isFirstLoad = useRef(true);
  const isMountedRef = useRef(true);

  // Animation values
  const translateY = useRef(new Animated.Value(600)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // ── Derived ────────────────────────────────────────────────────────────────

  const activeQuake: QuakeItem | null =
    selectedIndex !== null && quakes[selectedIndex]
      ? quakes[selectedIndex]
      : overrideQuake;

  const shakeMapUrl = activeQuake?.shakemap
    ? `${SHAKEMAP_BASE}/${activeQuake.shakemap}`
    : null;

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

  const openCard = useCallback(() => {
    translateY.setValue(600);
    opacity.setValue(0);
    showCardRef.current = true;
    setShowCard(true);
    onCardOpen?.();
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, bounciness: 4, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [translateY, opacity, onCardOpen]);

  const dismissCard = useCallback(
    (callback?: () => void) => {
      if (!showCardRef.current) {
        onCardClose?.();
        callback?.();
        return;
      }

      // Re-centre map without offset when card closes
      if (activeQuake) {
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

      Animated.parallel([
        Animated.timing(translateY, { toValue: 600, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => {
        showCardRef.current = false;
        setShowCard(false);
        setSelectedIndex(null);        // FIX: clear so polling can't reopen card
        setOverrideQuake(null);
        selectedEventIdRef.current = null; // FIX: clear so polling has nothing to track
        lastExternalIdRef.current = null;  // FIX: allow same item to reopen card after dismiss
        onCardClose?.();
        callback?.();
      });
    },
    [translateY, opacity, onCardClose, activeQuake],
  );

  // ── Fly-to-marker with offset ──────────────────────────────────────────────

  const flyToAndOpen = useCallback(
    (quake: QuakeItem, delay = 0) => {
      mapRef.current?.animateToRegion(
        {
          latitude: quake.latitude - 0.15,
          longitude: quake.longitude,
          latitudeDelta: 2.5,
          longitudeDelta: 2.5,
        },
        400,
      );
      setTimeout(openCard, delay || 300);
    },
    [openCard],
  );

  // ── PanResponder ───────────────────────────────────────────────────────────

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          translateY.setValue(gs.dy);
          opacity.setValue(Math.max(0, 1 - gs.dy / 300));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80) {
          // Dragged far enough — dismiss
          Animated.parallel([
            Animated.timing(translateY, { toValue: 600, duration: 220, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
          ]).start(() => {
            showCardRef.current = false;
            setShowCard(false);
            setSelectedIndex(null);        // FIX
            setOverrideQuake(null);
            selectedEventIdRef.current = null; // FIX
            lastExternalIdRef.current = null;  // FIX: allow same item to reopen card after swipe-dismiss
            onCardClose?.();
          });
        } else {
          // Snap back
          Animated.parallel([
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          ]).start();
        }
      },
    }),
  ).current;

  // ── Marker press ──────────────────────────────────────────────────────────

  const onPressMarker = useCallback(
    (index: number) => {
      const quake = quakes[index];
      if (!quake) return;
      selectedEventIdRef.current = quake.eventId;
      setOverrideQuake(null);
      setSelectedIndex(index);
      flyToAndOpen(quake);
    },
    [quakes, flyToAndOpen],
  );

  const handleMapPress = useCallback(() => dismissCard(), [dismissCard]);
  const handleMarkerPressIndex = useCallback(
    (index: number) => onPressMarker(index),
    [onPressMarker],
  );

  // ── Hide card when tab goes inactive ──────────────────────────────────────

  useEffect(() => {
    if (!isActive) {
      translateY.setValue(600);
      opacity.setValue(0);
      showCardRef.current = false;
      setShowCard(false);
      setSelectedIndex(null);        // FIX
      setOverrideQuake(null);
      selectedEventIdRef.current = null; // FIX
      lastExternalIdRef.current = null;  // FIX: so re-activating tab doesn't block same-item re-open
      isFirstLoad.current = true;    // Re-arm fly-in for next activation
    }
  }, [isActive, translateY, opacity]);

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

    const targetIndex = quakes.findIndex((q) => q.eventId === externalSelection.eventId);

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
            latText: `${Math.abs(externalSelection.latitude).toFixed(2)}°${externalSelection.latitude < 0 ? "LS" : "LU"}`,
            lonText: `${Math.abs(externalSelection.longitude).toFixed(2)}°${externalSelection.longitude >= 0 ? "BT" : "BB"}`,
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
  }, [externalSelection, isActive, quakes, flyToAndOpen, onListSelectionHandled]);

  // ── selectedListEventId (direct list row tap) ─────────────────────────────

  useEffect(() => {
    if (!selectedListEventId || quakes.length === 0) return;
    const targetIndex = quakes.findIndex((q) => q.eventId === selectedListEventId);
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
          const keyA = String(a?.eventid ?? a?.eventId ?? a?.timesent ?? `${a?.tanggal ?? a?.date ?? ""} ${a?.jam ?? a?.time ?? ""}`);
          const keyB = String(b?.eventid ?? b?.eventId ?? b?.timesent ?? `${b?.tanggal ?? b?.date ?? ""} ${b?.jam ?? b?.time ?? ""}`);
          return keyB.localeCompare(keyA);
        })
        .filter((candidate) =>
          effectiveMonths.some((month) => matchesDirasakanMonth(
            candidate?.tanggal ?? candidate?.date,
            effectiveYear,
            month,
          )),
        )
        .reduce<QuakeItem[]>((acc, candidate, index) => {
          const item = buildQuakeItem(candidate, index, haversineDistanceKm);
          if (item) acc.push(item);
          return acc;
        }, [])
        .slice(0, MAX_POINTS);

      // Deduplicate by eventId preserving order
      const seen = new Set<string>();
      const normalized: QuakeItem[] = [];
      for (const q of merged) {
        const k = String(q.eventId ?? "");
        if (!k) continue;
        if (seen.has(k)) continue;
        seen.add(k);
        normalized.push(q);
        if (normalized.length >= MAX_POINTS) break;
      }

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

      <View style={styles.topControls}>{tabBar}</View>

      {showCard && activeQuake && (
        <Animated.View
          style={[styles.locationCard, { transform: [{ translateY }], opacity }]}
        >
          {/* Drag handle */}
          <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
            <View style={styles.dragHandle} />
          </View>

          {/* Stats row */}
          <View style={styles.statsTopRow}>
            <StatItem icon="triangle-wave" value={activeQuake.magnitude} label="Magnitudo" />
            <View style={styles.statTopDivider} />
            <StatItem icon="rss" value={activeQuake.kedalaman} label="Kedalaman" />
            <View style={styles.statTopDivider} />
            <StatItem icon="compass-outline" value={activeQuake.latText} label="LS" />
            <View style={styles.statTopDivider} />
            <StatItem icon="compass-outline" value={activeQuake.lonText} label="BT" />
          </View>

          <View style={styles.separator} />

          <DetailItem icon="location" label="Lokasi Gempa :" value={activeQuake.wilayah} />
          <DetailItem
            icon="time-outline"
            label="Waktu :"
            value={`${activeQuake.tanggal}, ${activeQuake.jam}`}
          />
          <DetailItem icon="walk-outline" label="Jarak :" value={`${activeQuake.distanceKm} km`} />
          {!!activeQuake.felt && (
            <DetailItem
              icon="alert-circle-outline"
              label="Wilayah Dirasakan (Skala MMI) :"
              value={activeQuake.felt}
            />
          )}

          <TouchableOpacity
            style={[styles.simulasiBtn, !shakeMapUrl && styles.simulasiBtnDisabled]}
            activeOpacity={0.8}
            onPress={() => shakeMapUrl && setShakeMapVisible(true)}
            disabled={!shakeMapUrl}
          >
            <Text style={styles.simulasiBtnText}>PETA GUNCANGAN</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ShakeMap modal */}
      <Modal visible={shakeMapVisible} transparent animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View style={[styles.modalCardBottom, { height: SCREEN_HEIGHT * 0.9 }]}>
            <View style={styles.handleBar} />
            <View style={styles.modalHeaderBottom}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitleBottom}>PETA GUNCANGAN</Text>
                <Text style={styles.modalSubtitle}>Sumber data: BMKG ShakeMap</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShakeMapVisible(false)}
                style={styles.modalCloseCircle}
              >
                <Ionicons name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }}>
              {shakeMapUrl && (
                <Image
                  source={{ uri: shakeMapUrl }}
                  style={styles.maximizedImage}
                  resizeMode="contain"
                />
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <Text style={styles.scrollHint}>
                * Data diperbarui secara otomatis dari BMKG ShakeMap
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function GempaDirasakanHistoryRoute() {
  return <GempaDirasakanHistoryContent tabBar={null} />;
}