import EarthquakeTabBar from "@/components/earthquake-tab-bar";
import { getApp } from "@/config/firebase-init";
import { useUserSession } from "@/features/account/user-session-context";
import {
  CACHE_KEYS,
  getPersistentCache,
  setPersistentCache,
} from "@/utils/cache";
import { haversineDistanceKm, parseCoordinateText } from "@/utils/geo";
import { Ionicons } from "@expo/vector-icons";
import {
  endAt,
  get,
  getDatabase,
  orderByChild,
  query,
  ref,
  startAt,
} from "@react-native-firebase/database";
import { useIsFocused } from "@react-navigation/native";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  memo,
  useRef,
  useState,
  useMemo,
  type ReactElement,
} from "react";
import {
  Animated,
  Easing,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GempaDirasakanHistoryContent,
  GempaTerdeteksiHistoryContent,
  TsunamiHistoryContent,
} from "./components";
import styles from "./styles/history-screen";
import { dedupeByKey } from "./utils/dedupe";
import { readRealtimeNode } from "./utils/read-realtime-node";
import {
  applyTsunamiHistoryFilters,
  normalizeTsunamiHistoryEvents,
  type TsunamiHistoryEvent,
  type TsunamiHistoryFilters,
} from "./utils/tsunami-history";
import {
  buildDirasakanDateRange,
  buildTerdeteksiTimeRange,
  clampYearMonth,
  getNowYearMonth,
  matchesDirasakanMonth,
  matchesTerdeteksiMonth,
  MONTH_NAMES_ID,
  normalizeFilterMonths,
  parseFilterMonthsParam,
  serializeFilterMonths,
  type HistoryTabKey,
} from "./utils/filter";

// ─── Constants ────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL!;
const ITEM_HEIGHT = 74;
const LIST_CONTENT_CONTAINER_STYLE = { paddingHorizontal: 12, paddingBottom: 40 };
const HISTORY_TABS = ["GEMPA DIRASAKAN", "GEMPA TERDETEKSI", "RIWAYAT TSUNAMI"] as const;
type HistoryEarthquakeTab = (typeof HISTORY_TABS)[number];

const TAB_CACHE: Record<HistoryEarthquakeTab, string> = {
  "GEMPA DIRASAKAN": CACHE_KEYS.DIRASAKAN_HISTORY ?? "dirasakan_history",
  "GEMPA TERDETEKSI": CACHE_KEYS.TERDETEKSI_HISTORY,
  "RIWAYAT TSUNAMI": CACHE_KEYS.TSUNAMI_HISTORY,
};
const TSUNAMI_HISTORY_CACHE_VERSION = "v3";

// ─── Types ────────────────────────────────────────────────────────────────────

type ListItem = {
  id: string;
  latitude: number;
  longitude: number;
  magnitude: string;
  lokasi: string;
  waktu: string;
  jarak: string;
  distanceKm: string;
  tanggal: string;
  jam: string;
  kedalaman: string;
  felt: string;
  shakemap?: string | null;
  eventType?: "quake" | "tsunami";
  status?: string;
  headline?: string;
  latestWarningId?: string;
};

type HaversineFn = (a: number, b: number, c: number, d: number) => number;

// ─── Normalize helpers ────────────────────────────────────────────────────────

function normalizeDirasakan(
  rawData: unknown,
  userLat: number,
  userLon: number,
  haversine: HaversineFn,
): ListItem[] {
  const candidates: any[] = Array.isArray(rawData)
    ? rawData
    : rawData && typeof rawData === "object"
      ? Object.values(rawData as object)
      : [];

  return candidates
    .sort((a, b) =>
      String(b?.eventid ?? b?.timesent ?? "").localeCompare(
        String(a?.eventid ?? a?.timesent ?? ""),
      ),
    )
    .reduce<ListItem[]>((acc, candidate, index) => {
      const coordStr = String(candidate?.point?.coordinates ?? "");
      const [lonStr, latStr] = coordStr.split(",");
      const latitude = parseCoordinateText(candidate?.latitude ?? candidate?.lat ?? latStr);
      const longitude = parseCoordinateText(candidate?.longitude ?? candidate?.lon ?? lonStr);
      if (latitude === null || longitude === null) return acc;
      const distanceKm = haversine(userLat, userLon, latitude, longitude).toFixed(1);

      acc.push({
        id: String(candidate?.eventid ?? candidate?.eventId ?? `${candidate?.time ?? ""}-${candidate?.date ?? ""}-${index}`),
        latitude,
        longitude,
        magnitude: String(candidate?.magnitude ?? candidate?.mag ?? ""),
        lokasi: String(candidate?.area ?? candidate?.wilayah ?? candidate?.lokasi ?? ""),
        waktu: `${String(candidate?.time ?? candidate?.jam ?? "")} • ${String(candidate?.date ?? candidate?.tanggal ?? "")}`,
        jarak: `${distanceKm} km dari lokasi Anda`,
        distanceKm,
        tanggal: String(candidate?.date ?? candidate?.tanggal ?? ""),
        jam: String(candidate?.time ?? candidate?.jam ?? ""),
        kedalaman: String(candidate?.depth ?? candidate?.kedalaman ?? ""),
        felt: String(candidate?.felt ?? ""),
        shakemap: candidate?.shakemap ? String(candidate.shakemap) : null,
      });
      return acc;
    }, []);
}

function normalizeTerdeteksi(
  rawData: unknown,
  userLat: number,
  userLon: number,
  haversine: HaversineFn,
): ListItem[] {
  const nodeArray: any[] = Array.isArray(rawData)
    ? rawData
    : rawData && typeof rawData === "object"
      ? Object.values(rawData as object)
      : [];

  return [...nodeArray]
    .sort((a, b) =>
      String(b?.time ?? b?.properties?.time ?? "").localeCompare(
        String(a?.time ?? a?.properties?.time ?? ""),
      ),
    )
    .reduce<ListItem[]>((acc, item, index) => {
      const coords = item?.geometry?.coordinates || item?.coordinates;
      const longitude = parseCoordinateText(
        item?.longitude ?? item?.lon ?? coords?.longitude ?? coords?.[0],
      );
      const latitude = parseCoordinateText(
        item?.latitude ?? item?.lat ?? coords?.latitude ?? coords?.[1],
      );
      if (latitude === null || longitude === null) return acc;

      const props = item?.properties ?? item;
      const [tanggalFromTime, jamRaw] = String(props?.time ?? "").split(" ");
      const jamFromTime = (jamRaw ?? "").split(".")[0];
      const distanceKm = haversine(userLat, userLon, latitude, longitude).toFixed(1);

      acc.push({
        id: String(props?.eventid ?? props?.eventId ?? `${props?.time ?? ""}-${latitude}-${longitude}-${index}`),
        latitude,
        longitude,
        magnitude: String(props?.magnitude ?? props?.mag ?? "0.0"),
        lokasi: String(props?.lokasi ?? props?.place ?? props?.area ?? ""),
        waktu: `${String(props?.jam ?? jamFromTime ?? "")} • ${String(props?.tanggal ?? tanggalFromTime ?? "")}`,
        jarak: `${distanceKm} km dari lokasi Anda`,
        distanceKm,
        tanggal: String(props?.tanggal ?? tanggalFromTime ?? ""),
        jam: String(props?.jam ?? jamFromTime ?? ""),
        kedalaman: String(props?.kedalaman ?? props?.depth ?? ""),
        felt: String(props?.felt ?? props?.fase ?? ""),
      });
      return acc;
    }, []);
}

function normalizeTsunamiList(events: TsunamiHistoryEvent[]): ListItem[] {
  return events.map((event) => ({
    id: event.eventKey,
    latitude: event.latitude,
    longitude: event.longitude,
    magnitude: event.magnitude,
    lokasi: event.area,
    waktu: `${event.time} • ${event.date}`,
    jarak: "",
    distanceKm: "",
    tanggal: event.date,
    jam: event.time,
    kedalaman: event.depth,
    felt: "",
    eventType: "tsunami",
    status: event.latestSubject,
    headline: event.latestHeadline,
    latestWarningId: event.latestWarningId,
  }));
}

function parseTsunamiListIdTime(value: unknown): number {
  const match = String(value ?? "").match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (!match) return Number.NEGATIVE_INFINITY;

  const timestamp = new Date(
    Number.parseInt(match[1], 10),
    Number.parseInt(match[2], 10) - 1,
    Number.parseInt(match[3], 10),
    Number.parseInt(match[4], 10),
    Number.parseInt(match[5], 10),
    Number.parseInt(match[6], 10),
  ).getTime();

  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

function sortTsunamiListItems(items: ListItem[]): ListItem[] {
  return [...items].sort((a, b) => {
    const aTime = parseTsunamiListIdTime(a.id);
    const bTime = parseTsunamiListIdTime(b.id);

    if (aTime !== bTime) return bTime - aTime;
    return String(b.id).localeCompare(String(a.id));
  });
}

function isSameListItem(a: ListItem, b: ListItem): boolean {
  return (
    a.id === b.id &&
    a.latitude === b.latitude &&
    a.longitude === b.longitude &&
    a.magnitude === b.magnitude &&
    a.lokasi === b.lokasi &&
    a.waktu === b.waktu &&
    a.jarak === b.jarak &&
    a.distanceKm === b.distanceKm &&
    a.tanggal === b.tanggal &&
    a.jam === b.jam &&
    a.kedalaman === b.kedalaman &&
    a.felt === b.felt &&
    (a.shakemap ?? null) === (b.shakemap ?? null) &&
    a.eventType === b.eventType &&
    a.status === b.status &&
    a.headline === b.headline &&
    a.latestWarningId === b.latestWarningId
  );
}

function areSameListItems(a: ListItem[], b: ListItem[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  for (let index = 0; index < a.length; index += 1) {
    if (!isSameListItem(a[index], b[index])) return false;
  }

  return true;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });

  return (
    <Animated.View
      style={{
        opacity,
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 10,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
        height: ITEM_HEIGHT - 8,
      }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#CBD5E1", marginRight: 10 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ height: 12, width: "70%", backgroundColor: "#CBD5E1", borderRadius: 4 }} />
        <View style={{ height: 10, width: "50%", backgroundColor: "#E2E8F0", borderRadius: 4 }} />
        <View style={{ height: 9, width: "85%", backgroundColor: "#E2E8F0", borderRadius: 4 }} />
      </View>
    </Animated.View>
  );
}

function SkeletonList() {
  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 4 }}>
      {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
    </View>
  );
}

// ─── List card ────────────────────────────────────────────────────────────────

type EarthquakeListItemProps = {
  item: ListItem;
  onPress: (item: ListItem) => void;
};

const EarthquakeListItem = memo(({
  item,
  onPress,
}: EarthquakeListItemProps) => {
  const magValue = parseFloat(item.magnitude);
  const magColor = magValue >= 5 ? "#EF4444" : "#F59E0B";
  const handlePress = useCallback(() => onPress(item), [item, onPress]);
  const isTsunami = item.eventType === "tsunami";

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 10,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
        height: ITEM_HEIGHT - 8,
      }}
    >
      <View
        style={{
          backgroundColor: magColor,
          width: 40,
          height: 40,
          borderRadius: 20,
          justifyContent: "center",
          alignItems: "center",
          marginRight: 10,
        }}
      >
        <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 14 }}>{item.magnitude}</Text>
        <Text style={{ color: "#FFF", fontSize: 8 }}>Mag</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#0F172A", fontWeight: "bold", fontSize: 13, marginBottom: 2 }} numberOfLines={1}>
          {item.lokasi || "-"}
        </Text>
        <Text style={{ color: "#475569", fontSize: 11, marginBottom: 2 }}>
          {item.tanggal} • {item.jam}
        </Text>
        <Text style={{ color: "#64748B", fontSize: 10 }} numberOfLines={1}>
          {isTsunami
            ? `Kedalaman: ${item.kedalaman} • ${item.status || "-"}`
            : `Kedalaman: ${item.kedalaman} • ${item.distanceKm} km dari Anda`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}, (prev, next) => {
  return prev.onPress === next.onPress && isSameListItem(prev.item, next.item);
});

type HistoryListPanelProps = {
  emptyComponent: ReactElement;
  getItemLayout: (_: unknown, index: number) => {
    length: number;
    offset: number;
    index: number;
  };
  items: ListItem[];
  keyExtractor: (item: ListItem) => string;
  listLoading: boolean;
  renderItem: ({ item }: { item: ListItem }) => ReactElement;
  slideAnim: Animated.Value;
  title: string;
};

const HistoryListPanel = memo(function HistoryListPanel({
  emptyComponent,
  getItemLayout,
  items,
  keyExtractor,
  listLoading,
  renderItem,
  slideAnim,
  title,
}: HistoryListPanelProps) {
  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "40%",
        backgroundColor: "#0C4A6E",
        paddingTop: 12,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        zIndex: 10,
        transform: [{
          translateY: slideAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 500],
          }),
        }],
      }}
    >
      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 14, textAlign: "center" }}>
          {title}
        </Text>
      </View>

      {listLoading && items.length === 0 ? (
        <SkeletonList />
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          removeClippedSubviews={true}
          maxToRenderPerBatch={8}
          initialNumToRender={6}
          windowSize={3}
          updateCellsBatchingPeriod={80}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={LIST_CONTENT_CONTAINER_STYLE}
          ListEmptyComponent={emptyComponent}
        />
      )}
    </Animated.View>
  );
});

// ─── Utilities ────────────────────────────────────────────────────────────────

function asSingle(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function roundCoord(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function History() {
  const router = useRouter();
  const pathname = usePathname();
  const isFocused = useIsFocused();
  const session = useUserSession();

  const searchParams = useLocalSearchParams<{
    tab?: string;
    filterYear?: string;
    filterMonth?: string;
    filterMonths?: string;
    selectedEventId?: string;
    selectedLatitude?: string;
    selectedLongitude?: string;
    selectedMagnitude?: string;
    selectedLocation?: string;
    selectedWaktu?: string;
    selectedJarak?: string;
    selectedDistanceKm?: string;
    selectedTanggal?: string;
    selectedJam?: string;
    selectedKedalaman?: string;
    selectedFelt?: string;
    selectedShakemap?: string;
    selectedStatus?: string;
    selectedHeadline?: string;
    selectedLatestWarningId?: string;
  }>();

  const tabParam = asSingle(searchParams.tab);
  const initialTab: HistoryEarthquakeTab =
    tabParam === "tsunami"
      ? "RIWAYAT TSUNAMI"
      : tabParam === "terdeteksi"
        ? "GEMPA TERDETEKSI"
        : "GEMPA DIRASAKAN";
  const now = useMemo(() => new Date(), [])
  const selectedEventIdParam = asSingle(searchParams.selectedEventId);

  // ── State ──────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<HistoryEarthquakeTab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [hasMountedDirasakan, setHasMountedDirasakan] = useState(initialTab === "GEMPA DIRASAKAN");
  const [hasMountedTerdeteksi, setHasMountedTerdeteksi] = useState(initialTab === "GEMPA TERDETEKSI");
  const [hasMountedTsunami, setHasMountedTsunami] = useState(initialTab === "RIWAYAT TSUNAMI");
  // Panel animation: 0 = slid in (visible), 1 = slid out (hidden)
  const listPanelSlide = useRef(
    new Animated.Value(selectedEventIdParam ? 1 : 0),
  ).current;

  const showListPanel = useCallback(() => {
    Animated.timing(listPanelSlide, {
      toValue: 0,
      duration: 400,
      easing: Easing.out(Easing.bezier(0.16, 1, 0.3, 1)), // smoother deceleration
      useNativeDriver: false, // drives a % height — can't use native driver for layout props
    }).start();
  }, [listPanelSlide]);

  const hideListPanel = useCallback(() => {
    Animated.timing(listPanelSlide, {
      toValue: 1,
      duration: 300,
      easing: Easing.inOut(Easing.ease), // smooth accel/decel
      useNativeDriver: false,
    }).start();
  }, [listPanelSlide]);
  const [items, setItems] = useState<ListItem[]>([]);
  const setItemsIfChanged = useCallback((nextItems: ListItem[]) => {
    setItems((currentItems) =>
      areSameListItems(currentItems, nextItems) ? currentItems : nextItems,
    );
  }, []);
  const [listLoading, setListLoading] = useState(true);
  const [isOpeningFilter, setIsOpeningFilter] = useState(false);
  const [userLocation, setUserLocation] = useState({
    lat: roundCoord(-6.9175),
    lon: roundCoord(107.6191),
  });
  const rawYear = Number.parseInt(asSingle(searchParams.filterYear), 10);
  const rawMonth = Number.parseInt(asSingle(searchParams.filterMonth), 10);
  const rawMonthsParam = asSingle(searchParams.filterMonths);
  const rawMonths = useMemo(
    () => parseFilterMonthsParam(rawMonthsParam),
    [rawMonthsParam],
  );
  const effectiveFilter = useMemo(() => {
    const fallback = getNowYearMonth(now);
    const base = {
      year: Number.isFinite(rawYear) ? rawYear : fallback.year,
      month: Number.isFinite(rawMonth) ? rawMonth : fallback.month,
    };
    const tabKey: HistoryTabKey =
      activeTab === "RIWAYAT TSUNAMI"
        ? "tsunami"
        : activeTab === "GEMPA TERDETEKSI"
          ? "terdeteksi"
          : "dirasakan";
    return clampYearMonth(base, tabKey, now);
  }, [activeTab, now, rawMonth, rawYear]);
  const tabKey: HistoryTabKey =
    activeTab === "RIWAYAT TSUNAMI"
      ? "tsunami"
      : activeTab === "GEMPA TERDETEKSI"
        ? "terdeteksi"
        : "dirasakan";
  const effectiveMonths = useMemo(() => {
    const baseMonths = rawMonths.length > 0
      ? rawMonths
      : [effectiveFilter.month];
    return normalizeFilterMonths(baseMonths, effectiveFilter.year, tabKey, now);
  }, [effectiveFilter.month, effectiveFilter.year, now, rawMonths, tabKey]);
  const tsunamiFilters = useMemo<TsunamiHistoryFilters>(
    () => ({
      year: effectiveFilter.year,
    }),
    [effectiveFilter.year],
  );

  // ── Tab param sync ─────────────────────────────────────────────────────────

  useEffect(() => {
    const incoming = asSingle(searchParams.tab);
    if (incoming === "tsunami") setActiveTab("RIWAYAT TSUNAMI");
    if (incoming === "terdeteksi") setActiveTab("GEMPA TERDETEKSI");
    else if (incoming === "dirasakan") setActiveTab("GEMPA DIRASAKAN");
  }, [searchParams.tab]);

  useEffect(() => {
    if (activeTab === "GEMPA DIRASAKAN") {
      setHasMountedDirasakan(true);
      return;
    }
    if (activeTab === "GEMPA TERDETEKSI") {
      setHasMountedTerdeteksi(true);
      return;
    }
    setHasMountedTsunami(true);
  }, [activeTab]);

  // ── External selection ────────────────────────────────────────────────────

  const selectedLatitudeParam = asSingle(searchParams.selectedLatitude);
  const selectedLongitudeParam = asSingle(searchParams.selectedLongitude);
  const selectedMagnitudeParam = asSingle(searchParams.selectedMagnitude);
  const selectedLocationParam = asSingle(searchParams.selectedLocation);
  const selectedWaktuParam = asSingle(searchParams.selectedWaktu);
  const selectedJarakParam = asSingle(searchParams.selectedJarak);
  const selectedDistanceKmParam = asSingle(searchParams.selectedDistanceKm);
  const selectedTanggalParam = asSingle(searchParams.selectedTanggal);
  const selectedJamParam = asSingle(searchParams.selectedJam);
  const selectedKedalamanParam = asSingle(searchParams.selectedKedalaman);
  const selectedFeltParam = asSingle(searchParams.selectedFelt);
  const selectedShakemapParam = asSingle(searchParams.selectedShakemap);
  const selectedStatusParam = asSingle(searchParams.selectedStatus);
  const selectedHeadlineParam = asSingle(searchParams.selectedHeadline);
  const selectedLatestWarningIdParam = asSingle(searchParams.selectedLatestWarningId);

  const externalSelection = useMemo(() => {
    const eventId = selectedEventIdParam;
    const latitude = parseFloat(selectedLatitudeParam);
    const longitude = parseFloat(selectedLongitudeParam);
    if (!eventId || Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

    const tanggal = selectedTanggalParam;
    const jam = selectedJamParam;
    const waktu = selectedWaktuParam;
    const [fallbackJam, fallbackTanggal] = waktu
      .split("\u2022")
      .map((p) => p.trim());
    const distanceKm =
      selectedDistanceKmParam ||
      selectedJarakParam.replace(/[^0-9.,]/g, "") ||
      "0";

    return {
      eventId,
      latitude,
      longitude,
      magnitude: selectedMagnitudeParam || "-",
      lokasi: selectedLocationParam || "-",
      tanggal: tanggal || fallbackTanggal || "",
      jam: jam || fallbackJam || "",
      distanceKm,
      kedalaman: selectedKedalamanParam || "-",
      felt: selectedFeltParam,
      shakemap: selectedShakemapParam || null,
      status: selectedStatusParam || "-",
      headline: selectedHeadlineParam || "-",
      latestWarningId: selectedLatestWarningIdParam || "",
    };
  }, [
    selectedDistanceKmParam,
    selectedEventIdParam,
    selectedFeltParam,
    selectedHeadlineParam,
    selectedJarakParam,
    selectedJamParam,
    selectedKedalamanParam,
    selectedLatestWarningIdParam,
    selectedLatitudeParam,
    selectedLocationParam,
    selectedLongitudeParam,
    selectedMagnitudeParam,
    selectedShakemapParam,
    selectedStatusParam,
    selectedTanggalParam,
    selectedWaktuParam,
  ]);

  const clearSelectionParams = useCallback(() => {
    router.setParams({
      tab: undefined, selectedEventId: undefined, selectedLatitude: undefined,
      selectedLongitude: undefined, selectedMagnitude: undefined, selectedLocation: undefined,
      selectedWaktu: undefined, selectedJarak: undefined, selectedDistanceKm: undefined,
      selectedTanggal: undefined, selectedJam: undefined, selectedKedalaman: undefined,
      selectedFelt: undefined, selectedShakemap: undefined,
      selectedStatus: undefined, selectedHeadline: undefined,
      selectedLatestWarningId: undefined,
    });
  }, [router]);

  // ── Tab handlers ───────────────────────────────────────────────────────────

  const handleAppTabPress = useCallback((tab: HistoryEarthquakeTab) => {
    // FIX: Clear stale externalSelection params when switching tabs.
    // Without this, the params persist in the URL and when the content component
    // for the newly-active tab mounts/activates it reads the old params and calls
    // openCard() again even though the user already dismissed the card.
    clearSelectionParams();
    setActiveTab(tab);
    showListPanel();
    if (tab === "GEMPA DIRASAKAN") setHasMountedDirasakan(true);
    else if (tab === "GEMPA TERDETEKSI") setHasMountedTerdeteksi(true);
    else setHasMountedTsunami(true);
  }, [clearSelectionParams, showListPanel]);

  const handleExternalSelectionHandled = useCallback(() => {
    clearSelectionParams();
  }, [clearSelectionParams]);

  const handleFilterPress = useCallback(() => {
    if (isOpeningFilter) return;
    setIsOpeningFilter(true);
    const nextParams: Record<string, string> = {
      tab:
        activeTab === "RIWAYAT TSUNAMI"
          ? "tsunami"
          : activeTab === "GEMPA DIRASAKAN"
            ? "dirasakan"
            : "terdeteksi",
      filterYear: String(effectiveFilter.year),
      returnTo: pathname,
    };

    if (activeTab !== "RIWAYAT TSUNAMI") {
      nextParams.filterMonth = String(effectiveMonths[0]);
      nextParams.filterMonths = serializeFilterMonths(effectiveMonths);
    }

    router.push({
      pathname: "/main-menu/filter-gempa-screen",
      params: nextParams,
    });
  }, [
    activeTab,
    effectiveFilter.year,
    effectiveMonths,
    isOpeningFilter,
    pathname,
    router,
  ]);

  useEffect(() => {
    if (isFocused) {
      setIsOpeningFilter(false);
    }
  }, [isFocused]);

  // ── User location ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!session.location) {
      return;
    }

    const nextLocation = {
      lat: roundCoord(session.location.latitude),
      lon: roundCoord(session.location.longitude),
    };

    setUserLocation((currentLocation) => {
      if (
        currentLocation.lat === nextLocation.lat &&
        currentLocation.lon === nextLocation.lon
      ) {
        return currentLocation;
      }

      return nextLocation;
    });
  }, [session.location]);

  // ── Cache-first fetch ─────────────────────────────────────────────────────

  useEffect(() => {
    let isMounted = true;
    const isTsunami = activeTab === "RIWAYAT TSUNAMI";
    const cacheKey = isTsunami
      ? `${TAB_CACHE[activeTab]}_${TSUNAMI_HISTORY_CACHE_VERSION}_${effectiveFilter.year}`
      : `${TAB_CACHE[activeTab]}_${effectiveFilter.year}-${serializeFilterMonths(effectiveMonths)}`;
    const isDir = activeTab === "GEMPA DIRASAKAN";
    const orderField = isDir ? "date" : "time";

    async function fetchData() {
      // Phase 1: serve cache immediately
      try {
        const cached = await getPersistentCache<ListItem[]>(cacheKey);
        if (cached && isMounted) {
          if (cached.length > 0) {
            setItemsIfChanged(isTsunami ? sortTsunamiListItems(cached) : cached);
            setListLoading(false);
          }
        }
      } catch { }

      // Phase 2: one-shot Firebase fetch
      try {
        const app = getApp();
        const db = DATABASE_URL ? getDatabase(app, DATABASE_URL) : getDatabase(app);

        if (isTsunami) {
          const rawTsunamiEvents = await readRealtimeNode(db, DATABASE_URL, "tsunamiEvents");
          if (!isMounted) return;

          if (!rawTsunamiEvents) {
            setItemsIfChanged([]);
            setListLoading(false);
            return;
          }

          const normalizedEvents = normalizeTsunamiHistoryEvents(rawTsunamiEvents);
          const filteredEvents = applyTsunamiHistoryFilters(
            normalizedEvents,
            tsunamiFilters,
          );
          const normalized = sortTsunamiListItems(normalizeTsunamiList(filteredEvents));

          setPersistentCache(cacheKey, normalized);

          if (isMounted) {
            setItemsIfChanged(normalized);
            setListLoading(false);
          }
          return;
        }

        const snapshots = await Promise.all(
          effectiveMonths.map(async (month) => {
            const range = isDir
              ? buildDirasakanDateRange(effectiveFilter.year, month)
              : buildTerdeteksiTimeRange(effectiveFilter.year, month);
            const dataQuery = query(
              ref(db, isDir ? "gempa_dirasakan/items" : "gempa_terdeteksi/items"),
              orderByChild(orderField),
              startAt(range.start),
              endAt(range.end),
            );
            return get(dataQuery);
          }),
        );
        if (!isMounted) return;
        const hasAnyData = snapshots.some((snapshot) => snapshot.exists());
        if (!hasAnyData) {
          setItemsIfChanged([]);
          setListLoading(false);
          return;
        }

        const combinedRaw: unknown[] = [];
        snapshots.forEach((snapshot) => {
          if (!snapshot.exists()) return;
          const value = snapshot.val();
          const arr = Array.isArray(value)
            ? value
            : value && typeof value === "object"
              ? Object.values(value)
              : [];
          combinedRaw.push(...arr);
        });

        const mergedNormalized = isDir
          ? normalizeDirasakan(combinedRaw, userLocation.lat, userLocation.lon, haversineDistanceKm)
          : normalizeTerdeteksi(combinedRaw, userLocation.lat, userLocation.lon, haversineDistanceKm);

        const filtered = mergedNormalized.filter((item) =>
          effectiveMonths.some((month) =>
            isDir
              ? matchesDirasakanMonth(item.tanggal, effectiveFilter.year, month)
              : matchesTerdeteksiMonth(item.tanggal, effectiveFilter.year, month),
          ),
        );

        const normalized = dedupeByKey(filtered, (item) => item.id);

        setPersistentCache(cacheKey, normalized);

        if (isMounted) {
          setItemsIfChanged(normalized);
          setListLoading(false);
        }
      } catch {
        if (isMounted) setListLoading(false);
      }
    }

    // Keep stale items visible while loading — no blank flash
    setListLoading(true);
    void fetchData();
    return () => { isMounted = false; };
  }, [
    activeTab,
    effectiveFilter.year,
    effectiveMonths,
    setItemsIfChanged,
    tsunamiFilters,
    userLocation.lat,
    userLocation.lon,
  ]);

  // ── List item press → fly to marker ──────────────────────────────────────
  // Sets params which the content component reads as externalSelection.
  // The content component then calls flyToAndOpen (fly → 300ms delay → card slides up).

  const openHistoryForItem = useCallback(
    (item: ListItem) => {
      router.setParams({ selectedEventId: undefined });
      setTimeout(() => {
        const nextParams: Record<string, string> = {
          tab:
            activeTab === "RIWAYAT TSUNAMI"
              ? "tsunami"
              : activeTab === "GEMPA DIRASAKAN"
                ? "dirasakan"
                : "terdeteksi",
          filterYear: String(effectiveFilter.year),
          selectedEventId: item.id,
          selectedLatitude: String(item.latitude),
          selectedLongitude: String(item.longitude),
          selectedMagnitude: item.magnitude,
          selectedLocation: item.lokasi,
          selectedWaktu: item.waktu,
          selectedJarak: item.jarak,
          selectedDistanceKm: item.distanceKm,
          selectedTanggal: item.tanggal,
          selectedJam: item.jam,
          selectedKedalaman: item.kedalaman,
          selectedFelt: item.felt,
          selectedShakemap: item.shakemap ?? "",
          selectedStatus: item.status ?? "",
          selectedHeadline: item.headline ?? "",
          selectedLatestWarningId: item.latestWarningId ?? "",
        };

        if (activeTab !== "RIWAYAT TSUNAMI") {
          nextParams.filterMonth = String(effectiveMonths[0]);
          nextParams.filterMonths = serializeFilterMonths(effectiveMonths);
        }

        router.setParams(nextParams);
      }, 0);
      // Slide list panel away so map is full screen during fly-in
      hideListPanel();
    },
    [
      activeTab,
      effectiveFilter.year,
      effectiveMonths,
      hideListPanel,
      router,
    ],
  );

  // ── FlatList helpers ──────────────────────────────────────────────────────

  const getItemLayout = useCallback(
    (_: any, index: number) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => (
      <EarthquakeListItem item={item} onPress={openHistoryForItem} />
    ),
    [openHistoryForItem],
  );

  const keyExtractor = useCallback((item: ListItem) => item.id, []);

  const listEmpty = useMemo(
    () => (
      <Text style={{ color: "#E6F4FF", textAlign: "center", marginTop: 10, fontSize: 12 }}>
        {activeTab === "RIWAYAT TSUNAMI"
          ? "Data tsunami belum tersedia."
          : "Data gempa belum tersedia."}
      </Text>
    ),
    [activeTab],
  );

  const listTitle = useMemo(() => {
    if (activeTab === "RIWAYAT TSUNAMI") return "Riwayat Tsunami";
    if (activeTab === "GEMPA DIRASAKAN") return "Gempa Dirasakan Terbaru";
    return "Gempa Terdeteksi Terbaru";
  }, [activeTab]);

  // ── Tab bar ───────────────────────────────────────────────────────────────

  const periodLabel = useMemo(() => {
    if (activeTab !== "RIWAYAT TSUNAMI") {
      return `${effectiveMonths.map((month) => MONTH_NAMES_ID[month - 1]).join(", ")} ${effectiveFilter.year}`;
    }

    const parts = [String(effectiveFilter.year)];
    return parts.join(" • ");
  }, [
    activeTab,
    effectiveFilter.year,
    effectiveMonths,
  ]);

  const tabBar = useMemo(
    () => (
      <View style={styles.topControls}>
        <EarthquakeTabBar
          activeTab={activeTab}
          onTabPress={handleAppTabPress}
          disabled={loading}
          tabs={HISTORY_TABS}
        />
        <View style={styles.designSection}>
          <View style={styles.periodChip}>
            <Text style={styles.periodChipText}>
              {periodLabel}
            </Text>
          </View>
          <View style={styles.actionRow}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={[styles.sidePill, styles.sidePillRight, styles.sidePillRightContent]}
              activeOpacity={0.85}
              onPress={handleFilterPress}
              disabled={isOpeningFilter}
            >
              <Ionicons name="options" size={17} color="#FFFFFF" />
              <Text style={[styles.sidePillText, styles.sidePillTextLeft]}>FILTER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    ),
    [activeTab, handleAppTabPress, handleFilterPress, isOpeningFilter, loading, periodLabel],
  );

  const dirasakanActive = isFocused && activeTab === "GEMPA DIRASAKAN";
  const terdeteksiActive = isFocused && activeTab === "GEMPA TERDETEKSI";
  const tsunamiActive = isFocused && activeTab === "RIWAYAT TSUNAMI";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Map occupies 60% when list visible, full screen when hidden */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: listPanelSlide.interpolate({
            inputRange: [0, 1],
            outputRange: ["40%", "0%"]
          }),
        }}
      >
        {hasMountedDirasakan && (
          <View
            style={[styles.tabPane, activeTab !== "GEMPA DIRASAKAN" && styles.hiddenPane]}
            pointerEvents={activeTab === "GEMPA DIRASAKAN" ? "auto" : "none"}
          >
            <GempaDirasakanHistoryContent
              tabBar={tabBar}
              onLoadingChange={setLoading}
              externalSelection={externalSelection}
              onListSelectionHandled={handleExternalSelectionHandled}
              // When card is dismissed → slide the list panel back in
              onCardClose={showListPanel}
              onCardOpen={hideListPanel}
              filterYear={effectiveFilter.year}
              filterMonths={effectiveMonths}
              isActive={dirasakanActive}
            />
          </View>
        )}

        {hasMountedTerdeteksi && (
          <View
            style={[styles.tabPane, activeTab !== "GEMPA TERDETEKSI" && styles.hiddenPane]}
            pointerEvents={activeTab === "GEMPA TERDETEKSI" ? "auto" : "none"}
          >
            <GempaTerdeteksiHistoryContent
              tabBar={tabBar}
              onLoadingChange={setLoading}
              externalSelection={externalSelection}
              onListSelectionHandled={handleExternalSelectionHandled}
              onCardClose={showListPanel}
              onCardOpen={hideListPanel}
              filterYear={effectiveFilter.year}
              filterMonths={effectiveMonths}
              isActive={terdeteksiActive}
            />
          </View>
        )}

        {hasMountedTsunami && (
          <View
            style={[styles.tabPane, activeTab !== "RIWAYAT TSUNAMI" && styles.hiddenPane]}
            pointerEvents={activeTab === "RIWAYAT TSUNAMI" ? "auto" : "none"}
          >
            <TsunamiHistoryContent
              tabBar={tabBar}
              onLoadingChange={setLoading}
              externalSelection={externalSelection}
              onListSelectionHandled={handleExternalSelectionHandled}
              onCardClose={showListPanel}
              onCardOpen={hideListPanel}
              filters={tsunamiFilters}
              isActive={tsunamiActive}
            />
          </View>
        )}
      </Animated.View>

      {/* Bottom list panel — slides up from bottom over the map */}
      <HistoryListPanel
        emptyComponent={listEmpty}
        getItemLayout={getItemLayout}
        items={items}
        keyExtractor={keyExtractor}
        listLoading={listLoading}
        renderItem={renderItem}
        slideAnim={listPanelSlide}
        title={listTitle}
      />
    </View>
  );
}
