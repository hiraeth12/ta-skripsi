import EarthquakeTabBar, {
  type EarthquakeTab,
} from "@/components/earthquake-tab-bar";
import { getApp } from "@/config/firebase-init";
import { CACHE_KEYS, setCacheData } from "@/hooks/use-earthquake-cache";
import { useHaversine } from "@/hooks/use-haversine";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth } from "@react-native-firebase/auth";
import {
  get,
  getDatabase,
  limitToLast,
  query,
  ref,
} from "@react-native-firebase/database";
import { useIsFocused } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GempaDirasakanHistoryContent,
  GempaTerdeteksiHistoryContent,
} from "./components";
import styles from "./styles/history-screen";

// ─── Constants ────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL!;
const ITEM_HEIGHT = 74;

const TAB_CACHE: Record<EarthquakeTab, string> = {
  "GEMPA DIRASAKAN": CACHE_KEYS.DIRASAKAN_HISTORY ?? "dirasakan_history",
  "GEMPA TERDETEKSI": CACHE_KEYS.TERDETEKSI_HISTORY,
};

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
      const latitude = parseFloat(
        String(candidate?.latitude ?? candidate?.lat ?? latStr ?? "").replace(",", "."),
      );
      const longitude = parseFloat(
        String(candidate?.longitude ?? candidate?.lon ?? lonStr ?? "").replace(",", "."),
      );
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) return acc;

      acc.push({
        id: String(candidate?.eventid ?? candidate?.eventId ?? `${candidate?.time ?? ""}-${candidate?.date ?? ""}-${index}`),
        latitude,
        longitude,
        magnitude: String(candidate?.magnitude ?? candidate?.mag ?? ""),
        lokasi: String(candidate?.area ?? candidate?.wilayah ?? candidate?.lokasi ?? ""),
        waktu: `${String(candidate?.time ?? candidate?.jam ?? "")} • ${String(candidate?.date ?? candidate?.tanggal ?? "")}`,
        jarak: `${haversine(userLat, userLon, latitude, longitude).toFixed(1)} km dari lokasi Anda`,
        distanceKm: haversine(userLat, userLon, latitude, longitude).toFixed(1),
        tanggal: String(candidate?.date ?? candidate?.tanggal ?? ""),
        jam: String(candidate?.time ?? candidate?.jam ?? ""),
        kedalaman: String(candidate?.depth ?? candidate?.kedalaman ?? ""),
        felt: String(candidate?.felt ?? ""),
        shakemap: candidate?.shakemap ? String(candidate.shakemap) : null,
      });
      return acc;
    }, [])
    .slice(0, 30);
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
      const longitude = parseFloat(String(item?.longitude ?? item?.lon ?? coords?.longitude ?? coords?.[0] ?? ""));
      const latitude = parseFloat(String(item?.latitude ?? item?.lat ?? coords?.latitude ?? coords?.[1] ?? ""));
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) return acc;

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
    }, [])
    .slice(0, 30);
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

const EarthquakeListItem = ({
  item,
  onPress,
}: {
  item: ListItem;
  onPress: (item: ListItem) => void;
}) => {
  const magValue = parseFloat(item.magnitude);
  const magColor = magValue >= 5 ? "#EF4444" : "#F59E0B";

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(item)}
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
          Kedalaman: {item.kedalaman} • {item.distanceKm} km dari Anda
        </Text>
      </View>
    </TouchableOpacity>
  );
};

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
  const isFocused = useIsFocused();
  const { haversineDistanceKm } = useHaversine();

  const searchParams = useLocalSearchParams<{
    tab?: string;
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
  }>();

  const tabParam = asSingle(searchParams.tab);
  const initialTab: EarthquakeTab =
    tabParam === "terdeteksi" ? "GEMPA TERDETEKSI" : "GEMPA DIRASAKAN";

  // ── State ──────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<EarthquakeTab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [hasMountedDirasakan, setHasMountedDirasakan] = useState(initialTab === "GEMPA DIRASAKAN");
  const [hasMountedTerdeteksi, setHasMountedTerdeteksi] = useState(initialTab === "GEMPA TERDETEKSI");
  const [isListVisible, setIsListVisible] = useState(!asSingle(searchParams.selectedEventId));
  const [items, setItems] = useState<ListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [userLocation, setUserLocation] = useState({
    lat: roundCoord(-6.9175),
    lon: roundCoord(107.6191),
  });

  // ── Tab param sync ─────────────────────────────────────────────────────────

  useEffect(() => {
    const incoming = asSingle(searchParams.tab);
    if (incoming === "terdeteksi") setActiveTab("GEMPA TERDETEKSI");
    else if (incoming === "dirasakan") setActiveTab("GEMPA DIRASAKAN");
  }, [searchParams.tab]);

  // ── External selection ────────────────────────────────────────────────────

  const externalSelection = useMemo(() => {
    const eventId = asSingle(searchParams.selectedEventId);
    const latitude = parseFloat(asSingle(searchParams.selectedLatitude));
    const longitude = parseFloat(asSingle(searchParams.selectedLongitude));
    if (!eventId || Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

    const tanggal = asSingle(searchParams.selectedTanggal);
    const jam = asSingle(searchParams.selectedJam);
    const waktu = asSingle(searchParams.selectedWaktu);
    const [fallbackJam, fallbackTanggal] = waktu.split("•").map((p) => p.trim());
    const distanceKm =
      asSingle(searchParams.selectedDistanceKm) ||
      asSingle(searchParams.selectedJarak).replace(/[^0-9.,]/g, "") ||
      "0";

    return {
      eventId,
      latitude,
      longitude,
      magnitude: asSingle(searchParams.selectedMagnitude) || "-",
      lokasi: asSingle(searchParams.selectedLocation) || "-",
      tanggal: tanggal || fallbackTanggal || "",
      jam: jam || fallbackJam || "",
      distanceKm,
      kedalaman: asSingle(searchParams.selectedKedalaman) || "-",
      felt: asSingle(searchParams.selectedFelt),
      shakemap: asSingle(searchParams.selectedShakemap) || null,
    };
  }, [searchParams]);

  const clearSelectionParams = useCallback(() => {
    router.setParams({
      tab: undefined, selectedEventId: undefined, selectedLatitude: undefined,
      selectedLongitude: undefined, selectedMagnitude: undefined, selectedLocation: undefined,
      selectedWaktu: undefined, selectedJarak: undefined, selectedDistanceKm: undefined,
      selectedTanggal: undefined, selectedJam: undefined, selectedKedalaman: undefined,
      selectedFelt: undefined, selectedShakemap: undefined,
    });
  }, [router]);

  // ── Tab handlers ───────────────────────────────────────────────────────────

  const handleAppTabPress = useCallback((tab: EarthquakeTab) => {
    // FIX: Clear stale externalSelection params when switching tabs.
    // Without this, the params persist in the URL and when the content component
    // for the newly-active tab mounts/activates it reads the old params and calls
    // openCard() again even though the user already dismissed the card.
    clearSelectionParams();
    setActiveTab(tab);
    setIsListVisible(true);
    if (tab === "GEMPA DIRASAKAN") setHasMountedDirasakan(true);
    else setHasMountedTerdeteksi(true);
  }, [clearSelectionParams]);

  const handleExternalSelectionHandled = useCallback(() => {
    clearSelectionParams();
  }, [clearSelectionParams]);

  const handleFilterPress = useCallback(() => {
    router.push({
      pathname: "/main-menu/filter-gempa-screen",
      params: { tab: activeTab === "GEMPA DIRASAKAN" ? "dirasakan" : "terdeteksi" },
    });
  }, [activeTab, router]);

  // ── User location ─────────────────────────────────────────────────────────

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const app = getApp();
        const user = getAuth(app).currentUser;
        if (!user) return;
        const db = DATABASE_URL ? getDatabase(app, DATABASE_URL) : getDatabase(app);
        const snap = await get(ref(db, `/users/${user.uid}`));
        const data = snap.val();
        const lat = parseFloat(String(data?.latitude ?? ""));
        const lon = parseFloat(String(data?.longitude ?? ""));
        if (!isNaN(lat) && !isNaN(lon) && isMounted) {
          setUserLocation({ lat: roundCoord(lat), lon: roundCoord(lon) });
        }
      } catch { }
    }
    void load();
    return () => { isMounted = false; };
  }, []);

  // ── Cache-first fetch ─────────────────────────────────────────────────────

  useEffect(() => {
    let isMounted = true;
    const cacheKey = TAB_CACHE[activeTab];
    const isDir = activeTab === "GEMPA DIRASAKAN";

    async function fetchData() {
      // Phase 1: serve cache immediately
      try {
        const raw = await AsyncStorage.getItem(cacheKey);
        if (raw && isMounted) {
          const cached: ListItem[] = JSON.parse(raw);
          if (cached.length > 0) {
            setItems(cached);
            setListLoading(false);
          }
        }
      } catch { }

      // Phase 2: one-shot Firebase fetch
      try {
        const app = getApp();
        const db = DATABASE_URL ? getDatabase(app, DATABASE_URL) : getDatabase(app);
        const dataQuery = query(
          ref(db, isDir ? "gempa_dirasakan/items" : "gempa_terdeteksi/items"),
          limitToLast(35),
        );
        const snapshot = await get(dataQuery);
        if (!snapshot.exists() || !isMounted) return;

        const normalized = isDir
          ? normalizeDirasakan(snapshot.val(), userLocation.lat, userLocation.lon, haversineDistanceKm)
          : normalizeTerdeteksi(snapshot.val(), userLocation.lat, userLocation.lon, haversineDistanceKm);

        AsyncStorage.setItem(cacheKey, JSON.stringify(normalized)).catch(() => { });
        setCacheData(cacheKey, normalized);

        if (isMounted) {
          setItems(normalized);
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
  }, [activeTab, userLocation.lat, userLocation.lon]);

  // ── List item press → fly to marker ──────────────────────────────────────
  // Sets params which the content component reads as externalSelection.
  // The content component then calls flyToAndOpen (fly → 300ms delay → card slides up).

  const openHistoryForItem = useCallback(
    (item: ListItem) => {
      router.setParams({ selectedEventId: undefined });
      setTimeout(() => {
        router.setParams({
          tab: activeTab === "GEMPA DIRASAKAN" ? "dirasakan" : "terdeteksi",
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
        });
      }, 0);
      // Hide list immediately so map is full screen during fly-in
      setIsListVisible(false);
    },
    [activeTab, router],
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
        Data gempa belum tersedia.
      </Text>
    ),
    [],
  );

  // ── Tab bar ───────────────────────────────────────────────────────────────

  const tabBar = useMemo(
    () => (
      <View style={styles.topControls}>
        <EarthquakeTabBar
          activeTab={activeTab}
          onTabPress={handleAppTabPress}
          disabled={loading}
        />
        <View style={styles.designSection}>
          <View style={styles.periodChip}>
            <Text style={styles.periodChipText}>Oktober 2025 • Jawa Barat</Text>
          </View>
          <View style={styles.actionRow}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={[styles.sidePill, styles.sidePillRight, styles.sidePillRightContent]}
              activeOpacity={0.85}
              onPress={handleFilterPress}
            >
              <Ionicons name="options" size={17} color="#FFFFFF" />
              <Text style={[styles.sidePillText, styles.sidePillTextLeft]}>FILTER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    ),
    [activeTab, handleAppTabPress, handleFilterPress, loading],
  );

  const dirasakanActive = isFocused && activeTab === "GEMPA DIRASAKAN";
  const terdeteksiActive = isFocused && activeTab === "GEMPA TERDETEKSI";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Map occupies full screen when list hidden, 60% when list visible */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: isListVisible ? "40%" : 0,
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
              // When card is dismissed → restore the list panel
              onCardClose={() => setIsListVisible(true)}
              onCardOpen={() => setIsListVisible(false)}
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
              onCardClose={() => setIsListVisible(true)}
              onCardOpen={() => setIsListVisible(false)}
              isActive={terdeteksiActive}
            />
          </View>
        )}
      </View>

      {/* Bottom list panel — 40% height, hidden when card is open */}
      {isListVisible && (
        <View
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
          }}
        >
          <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 14, textAlign: "center" }}>
              {activeTab === "GEMPA DIRASAKAN" ? "Gempa Dirasakan Terbaru" : "Gempa Terdeteksi Terbaru"}
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
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}
              ListEmptyComponent={listEmpty}
            />
          )}
        </View>
      )}
    </View>
  );
}