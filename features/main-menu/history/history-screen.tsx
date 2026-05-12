import EarthquakeTabBar, {
  type EarthquakeTab,
} from "@/components/earthquake-tab-bar";
import { getApp } from "@/config/firebase-init";
import { CACHE_KEYS, setCacheData } from "@/hooks/use-earthquake-cache";
import { useHaversine } from "@/hooks/use-haversine";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "@react-native-firebase/auth";
import {
  get,
  getDatabase,
  limitToLast,
  onValue,
  query,
  ref,
} from "@react-native-firebase/database";
import { useIsFocused } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

const DATABASE_URL = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL!;

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

  function asSingle(value?: string | string[]) {
    if (Array.isArray(value)) return value[0] ?? "";
    return value ?? "";
  }

  const tabParam = asSingle(searchParams.tab);
  const initialTab: EarthquakeTab =
    tabParam === "terdeteksi" ? "GEMPA TERDETEKSI" : "GEMPA DIRASAKAN";

  const [activeTab, setActiveTab] = useState<EarthquakeTab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [hasMountedDirasakan] = useState(true);
  const [hasMountedTerdeteksi] = useState(true);

  // ==========================================
  // STATE LIST GEMPA (Langsung Muncul di Awal)
  // ==========================================
  const [isListVisible, setIsListVisible] = useState(
    !asSingle(searchParams.selectedEventId),
  );
  const [items, setItems] = useState<ListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  }>({
    lat: -6.9175,
    lon: 107.6191,
  });

  const clearSelectionParams = useCallback(() => {
    router.setParams({
      tab: undefined,
      selectedEventId: undefined,
      selectedLatitude: undefined,
      selectedLongitude: undefined,
      selectedMagnitude: undefined,
      selectedLocation: undefined,
      selectedWaktu: undefined,
      selectedJarak: undefined,
      selectedDistanceKm: undefined,
      selectedTanggal: undefined,
      selectedJam: undefined,
      selectedKedalaman: undefined,
      selectedFelt: undefined,
      selectedShakemap: undefined,
    });
  }, [router]);

  useEffect(() => {
    const incomingTab = asSingle(searchParams.tab);
    if (incomingTab === "terdeteksi") {
      setActiveTab("GEMPA TERDETEKSI");
    } else if (incomingTab === "dirasakan") {
      setActiveTab("GEMPA DIRASAKAN");
    }
  }, [searchParams.tab]);

  const externalSelection = useMemo(() => {
    const eventId = asSingle(searchParams.selectedEventId);
    const latitude = parseFloat(asSingle(searchParams.selectedLatitude));
    const longitude = parseFloat(asSingle(searchParams.selectedLongitude));

    if (!eventId || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return null;
    }

    const tanggal = asSingle(searchParams.selectedTanggal);
    const jam = asSingle(searchParams.selectedJam);
    const waktu = asSingle(searchParams.selectedWaktu);
    const [fallbackJam, fallbackTanggal] = waktu
      .split("•")
      .map((part) => part.trim());

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

  const handleAppTabPress = useCallback((tab: EarthquakeTab) => {
    setActiveTab(tab);
    setIsListVisible(true);
  }, []);

  const handleExternalSelectionHandled = useCallback(() => {
    clearSelectionParams();
  }, [clearSelectionParams]);

  const handleFilterPress = useCallback(() => {
    router.push({
      pathname: "/main-menu/filter-gempa-screen",
      params: {
        tab: activeTab === "GEMPA DIRASAKAN" ? "dirasakan" : "terdeteksi",
      },
    });
  }, [activeTab, router]);

  // ==========================================
  // FETCH LOKASI & DATA LIST
  // ==========================================
  useEffect(() => {
    let isMounted = true;
    async function loadUserLocationOnce() {
      try {
        const app = getApp();
        const auth = getAuth(app);
        const user = auth.currentUser;
        if (!user || !isMounted) return;

        const db = DATABASE_URL
          ? getDatabase(app, DATABASE_URL)
          : getDatabase(app);
        const userRef = ref(db, `/users/${user.uid}`);
        const snapshot = await get(userRef);
        const userData = snapshot.val();

        const lat = parseFloat(String(userData?.latitude ?? ""));
        const lon = parseFloat(String(userData?.longitude ?? ""));
        if (!isNaN(lat) && !isNaN(lon)) {
          setUserLocation({ lat, lon });
        }
      } catch {}
    }
    void loadUserLocationOnce();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    function setupRealtimeListener() {
      setListLoading(true);
      const app = getApp();
      const db = DATABASE_URL
        ? getDatabase(app, DATABASE_URL)
        : getDatabase(app);

      if (activeTab === "GEMPA DIRASAKAN") {
        const dataQuery = query(
          ref(db, "gempa_dirasakan/items"),
          limitToLast(80),
        );
        let initialLoad = true;
        unsubscribe = onValue(
          dataQuery,
          (snapshot) => {
            const rawData = snapshot.exists() ? snapshot.val() : null;
            const candidates = Array.isArray(rawData)
              ? rawData
              : rawData && typeof rawData === "object"
                ? Object.values(rawData)
                : [];

            const normalized = candidates
              .sort((a: any, b: any) =>
                String(b?.eventid ?? b?.timesent ?? "").localeCompare(
                  String(a?.eventid ?? a?.timesent ?? ""),
                ),
              )
              .map((candidate: any, index): ListItem | null => {
                const coordStr = String(candidate?.point?.coordinates ?? "");
                const [lonStr, latStr] = coordStr.split(",");
                const latitude = parseFloat(
                  String(
                    candidate?.latitude ?? candidate?.lat ?? latStr ?? "",
                  ).replace(",", "."),
                );
                const longitude = parseFloat(
                  String(
                    candidate?.longitude ?? candidate?.lon ?? lonStr ?? "",
                  ).replace(",", "."),
                );
                if (Number.isNaN(latitude) || Number.isNaN(longitude))
                  return null;

                const distanceKm = haversineDistanceKm(
                  userLocation.lat,
                  userLocation.lon,
                  latitude,
                  longitude,
                ).toFixed(1);
                const eventId = String(
                  candidate?.eventid ??
                    candidate?.eventId ??
                    `${candidate?.time ?? ""}-${candidate?.date ?? ""}-${index}`,
                );

                return {
                  id: eventId,
                  latitude,
                  longitude,
                  magnitude: String(
                    candidate?.magnitude ?? candidate?.mag ?? "",
                  ),
                  lokasi: String(
                    candidate?.area ??
                      candidate?.wilayah ??
                      candidate?.lokasi ??
                      "",
                  ),
                  waktu: `${String(candidate?.time ?? candidate?.jam ?? "")} • ${String(candidate?.date ?? candidate?.tanggal ?? "")}`,
                  jarak: `${distanceKm} km dari lokasi Anda`,
                  distanceKm,
                  tanggal: String(candidate?.date ?? candidate?.tanggal ?? ""),
                  jam: String(candidate?.time ?? candidate?.jam ?? ""),
                  kedalaman: String(
                    candidate?.depth ?? candidate?.kedalaman ?? "",
                  ),
                  felt: String(candidate?.felt ?? ""),
                  shakemap: candidate?.shakemap
                    ? String(candidate.shakemap)
                    : null,
                };
              })
              .filter((item): item is ListItem => Boolean(item))
              .slice(0, 30);

            if (isMounted) {
              setItems(normalized);
              if (initialLoad) {
                setListLoading(false);
                initialLoad = false;
              }
            }
          },
          () => {
            if (isMounted && initialLoad) setListLoading(false);
          },
        );
      } else {
        const dataQuery = query(
          ref(db, "gempa_terdeteksi/items"),
          limitToLast(150),
        );
        let initialLoad = true;
        unsubscribe = onValue(
          dataQuery,
          (snapshot) => {
            const rawData = snapshot.exists() ? snapshot.val() : null;
            const nodeArray = Array.isArray(rawData)
              ? rawData
              : rawData && typeof rawData === "object"
                ? Object.values(rawData)
                : [];

            const sorted = [...nodeArray].sort((a: any, b: any) => {
              const tA = String(a?.time ?? a?.properties?.time ?? "");
              const tB = String(b?.time ?? b?.properties?.time ?? "");
              return tB.localeCompare(tA);
            });

            const normalized = sorted
              .map((item: any, index): ListItem | null => {
                const coords = item?.geometry?.coordinates || item?.coordinates;
                const longitude = parseFloat(
                  String(
                    item?.longitude ??
                      item?.lon ??
                      coords?.longitude ??
                      coords?.[0] ??
                      "",
                  ),
                );
                const latitude = parseFloat(
                  String(
                    item?.latitude ??
                      item?.lat ??
                      coords?.latitude ??
                      coords?.[1] ??
                      "",
                  ),
                );
                if (Number.isNaN(latitude) || Number.isNaN(longitude))
                  return null;

                const props = item?.properties ?? item;
                const [tanggalFromTime, jamRaw] = String(
                  props?.time ?? "",
                ).split(" ");
                const jamFromTime = (jamRaw ?? "").split(".")[0];
                const distanceKm = haversineDistanceKm(
                  userLocation.lat,
                  userLocation.lon,
                  latitude,
                  longitude,
                ).toFixed(1);
                const eventId = String(
                  props?.eventid ??
                    props?.eventId ??
                    `${props?.time ?? ""}-${latitude}-${longitude}-${index}`,
                );

                return {
                  id: eventId,
                  latitude,
                  longitude,
                  magnitude: String(props?.magnitude ?? props?.mag ?? "0.0"),
                  lokasi: String(
                    props?.lokasi ?? props?.place ?? props?.area ?? "",
                  ),
                  waktu: `${String(props?.jam ?? jamFromTime ?? "")} • ${String(props?.tanggal ?? tanggalFromTime ?? "")}`,
                  jarak: `${distanceKm} km dari lokasi Anda`,
                  distanceKm,
                  tanggal: String(props?.tanggal ?? tanggalFromTime ?? ""),
                  jam: String(props?.jam ?? jamFromTime ?? ""),
                  kedalaman: String(props?.kedalaman ?? props?.depth ?? ""),
                  felt: String(props?.felt ?? props?.fase ?? ""),
                };
              })
              .filter((item): item is ListItem => Boolean(item))
              .slice(0, 30);

            setCacheData(CACHE_KEYS.TERDETEKSI_HISTORY, normalized);
            if (isMounted) {
              setItems(normalized);
              if (initialLoad) {
                setListLoading(false);
                initialLoad = false;
              }
            }
          },
          () => {
            if (isMounted && initialLoad) setListLoading(false);
          },
        );
      }
    }

    setupRealtimeListener();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [activeTab, userLocation.lat, userLocation.lon]);

  function openHistoryForItem(item: ListItem) {
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
    // SEMBUNYIKAN LIST SAAT GEMPA DITEKAN AGAR MAP FULL
    setIsListVisible(false);
  }

  // ==========================================
  // TOP CONTROLS (BALIK KE STYLE ASLIMU)
  // ==========================================
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
            {/* Spacer kosong biar FILTER tetep nempel mentok di kanan */}
            <View style={{ flex: 1 }} />

            <TouchableOpacity
              style={[
                styles.sidePill,
                styles.sidePillRight,
                styles.sidePillRightContent,
              ]}
              activeOpacity={0.85}
              onPress={handleFilterPress}
            >
              {/* Ikon diganti jadi options sesuai permintaan */}
              <Ionicons name="options" size={17} color="#FFFFFF" />
              <Text style={[styles.sidePillText, styles.sidePillTextLeft]}>
                FILTER
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    ),
    [activeTab, handleAppTabPress, handleFilterPress, loading],
  );

  const dirasakanActive = isFocused && activeTab === "GEMPA DIRASAKAN";
  const terdeteksiActive = isFocused && activeTab === "GEMPA TERDETEKSI";

  return (
    <View style={styles.container}>
      {/* ==========================================
          AREA PETA
          Jika list terlihat, peta mentok di 40% dari bawah.
          Jika list hilang, peta full screen (bottom: 0).
          ========================================== */}
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
            style={[
              styles.tabPane,
              activeTab !== "GEMPA DIRASAKAN" && styles.hiddenPane,
            ]}
            pointerEvents={activeTab === "GEMPA DIRASAKAN" ? "auto" : "none"}
          >
            <GempaDirasakanHistoryContent
              tabBar={tabBar}
              onLoadingChange={setLoading}
              externalSelection={externalSelection}
              onListSelectionHandled={handleExternalSelectionHandled}
              onCardClose={() => setIsListVisible(true)}
              onCardOpen={() => setIsListVisible(false)}
              isActive={dirasakanActive}
            />
          </View>
        )}

        {hasMountedTerdeteksi && (
          <View
            style={[
              styles.tabPane,
              activeTab !== "GEMPA TERDETEKSI" && styles.hiddenPane,
            ]}
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

      {/* ==========================================
          AREA LIST BAWAH
          Tinggi fix 40%. Muncul kalau isListVisible = true
          ========================================== */}
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
          {/* Header List */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
            <Text
              style={{
                color: "#FFFFFF",
                fontWeight: "bold",
                fontSize: 14,
                textAlign: "center",
              }}
            >
              {activeTab === "GEMPA DIRASAKAN"
                ? "Gempa Dirasakan Terbaru"
                : "Gempa Terdeteksi Terbaru"}
            </Text>
          </View>

          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}
            maxToRenderPerBatch={10}
            renderItem={({ item }) => {
              const magValue = parseFloat(item.magnitude);
              const magColor = magValue >= 5 ? "#EF4444" : "#F59E0B";

              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => openHistoryForItem(item)}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 10,
                    marginBottom: 8,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  {/* Bubble Magnitude */}
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
                    <Text
                      style={{
                        color: "#FFF",
                        fontWeight: "bold",
                        fontSize: 14,
                      }}
                    >
                      {item.magnitude}
                    </Text>
                    <Text style={{ color: "#FFF", fontSize: 8 }}>Mag</Text>
                  </View>

                  {/* Kolom Informasi Teks */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "#0F172A",
                        fontWeight: "bold",
                        fontSize: 13,
                        marginBottom: 2,
                      }}
                      numberOfLines={1}
                    >
                      {item.lokasi || "-"}
                    </Text>
                    <Text
                      style={{
                        color: "#475569",
                        fontSize: 11,
                        marginBottom: 2,
                      }}
                    >
                      {item.tanggal} • {item.jam}
                    </Text>
                    <Text
                      style={{ color: "#64748B", fontSize: 10 }}
                      numberOfLines={1}
                    >
                      Kedalaman: {item.kedalaman} • {item.distanceKm} km dari
                      Anda
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListHeaderComponent={
              listLoading ? (
                <View style={{ alignItems: "center", marginTop: 10 }}>
                  <ActivityIndicator color="#E6F4FF" />
                </View>
              ) : null
            }
            ListEmptyComponent={
              !listLoading ? (
                <Text
                  style={{
                    color: "#E6F4FF",
                    textAlign: "center",
                    marginTop: 10,
                    fontSize: 12,
                  }}
                >
                  Data gempa belum tersedia.
                </Text>
              ) : null
            }
          />
        </View>
      )}
    </View>
  );
}
