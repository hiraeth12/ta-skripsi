import { CACHE_KEYS, setCacheData } from "@/hooks/use-earthquake-cache";
import { Ionicons } from "@expo/vector-icons";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { get, getDatabase, ref } from "@react-native-firebase/database";
import { useRouter } from "expo-router";
import { XMLParser } from "fast-xml-parser";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Dimensions,
  Image,
  InteractionManager,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const SHAKEMAP_BASE = "https://bmkg-content-inatews.storage.googleapis.com";
const DIRASAKAN_API_URL = process.env.EXPO_PUBLIC_GEMPA_DIRASAKAN_API_URL!;
const TERDETEKSI_API_URL = process.env.EXPO_PUBLIC_GEMPA_TERDETEKSI_API_URL!;
const DEFAULT_LOCATION = {
  latitude: -6.9175,
  longitude: 107.6191,
  name: "Bandung",
};

function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const radLat1 = toRad(lat1);
  const radLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) *
      Math.cos(radLat2) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

// === FUNGSI MENGHITUNG WAKTU REAL-TIME ===
function calculateTimeAgo(tanggal: string, jam: string) {
  if (!tanggal || !jam) return "Memuat...";
  try {
    const cleanJam = jam.replace(/ WIB| WITA| WIT/gi, "").trim();
    let dateStr = tanggal;

    // Ubah format bulan ke bahasa Inggris agar terbaca oleh sistem Date
    const bulanIdKeEn: Record<string, string> = {
      Jan: "Jan",
      Feb: "Feb",
      Mar: "Mar",
      Apr: "Apr",
      Mei: "May",
      Jun: "Jun",
      Jul: "Jul",
      Agt: "Aug",
      Sep: "Sep",
      Okt: "Oct",
      Nov: "Nov",
      Des: "Dec",
    };

    Object.keys(bulanIdKeEn).forEach((key) => {
      if (dateStr.includes(key)) {
        dateStr = dateStr.replace(key, bulanIdKeEn[key]);
      }
    });

    let quakeDate: Date;

    if (dateStr.includes("-") && dateStr.split("-").length === 3) {
      const parts = dateStr.split("-");
      if (parts[0].length === 4) {
        quakeDate = new Date(`${dateStr}T${cleanJam}+07:00`);
      } else {
        let year = parts[2];
        if (year.length === 2) year = "20" + year;
        quakeDate = new Date(
          `${year}-${parts[1]}-${parts[0]}T${cleanJam}+07:00`,
        );
      }
    } else {
      quakeDate = new Date(`${dateStr} ${cleanJam} GMT+0700`);
    }

    const quakeTime = quakeDate.getTime();
    if (isNaN(quakeTime)) return "-";

    const diffMs = Date.now() - quakeTime;
    if (diffMs < 0) return "Baru saja";

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    // Perbaikan: "1 Jam Lalu" pakai angka agar konsisten
    if (diffDays > 0)
      return diffDays === 1 ? "Kemarin" : `${diffDays} Hari Lalu`;
    if (diffHours > 0) return `${diffHours} Jam Lalu`;
    if (diffMins > 0) return `${diffMins} Menit Lalu`;

    return "Baru saja";
  } catch {
    return "-";
  }
}

type DirasakanQuake = {
  distanceKm: string;
  magnitude: string;
  kedalaman: string;
  latText: string;
  lonText: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  felt: string;
};

type TerdeteksiQuake = {
  distanceKm: string;
  magnitude: string;
  kedalaman: string;
  latText: string;
  lonText: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  fase: string;
};

export default function Home() {
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [shakeMapVisible, setShakeMapVisible] = useState(false);
  const [infoVisibleDirasakan, setInfoVisibleDirasakan] = useState(false);
  const [infoVisibleTerdeteksi, setInfoVisibleTerdeteksi] = useState(false);
  const [dirasakanData, setDirasakanData] = useState<DirasakanQuake | null>(
    null,
  );
  const [terdeteksiData, setTerdeteksiData] = useState<TerdeteksiQuake | null>(
    null,
  );
  const [shakeMapUrl, setShakeMapUrl] = useState<string | null>(null);
  const [timeAgo, setTimeAgo] = useState("Memuat...");
  const [activeTab, setActiveTab] = useState(0);
  const [userLocation, setUserLocation] = useState({
    latitude: DEFAULT_LOCATION.latitude,
    longitude: DEFAULT_LOCATION.longitude,
    name: DEFAULT_LOCATION.name,
  });
  const [userName, setUserName] = useState("Pengguna");
  const [currentDate, setCurrentDate] = useState(new Date());

  const user = { name: userName };

  // Function to fetch user location and profile from database
  const fetchUserData = useCallback(async () => {
    try {
      const app = getApp();
      const authInstance = getAuth(app);
      const currentUser = authInstance.currentUser;

      if (!currentUser) return;

      const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
      const database = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);
      const userRef = ref(database, `users/${currentUser.uid}`);
      const snapshot = await get(userRef);
      const userData = snapshot.val();

      if (userData) {
        // Set location data if available
        if (userData.latitude && userData.longitude) {
          setUserLocation({
            latitude: parseFloat(userData.latitude),
            longitude: parseFloat(userData.longitude),
            name: userData.locationName || "Lokasi Saya",
          });
        }
        // Set user name from firstName (and lastName if available)
        if (userData.firstName) {
          const fullName = userData.lastName 
            ? `${userData.firstName}` 
            : userData.firstName;
          setUserName(fullName);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, []);

  // Fetch user data on mount only - do NOT refetch on every focus
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Update current date every minute
  useEffect(() => {
    const updateDate = () => {
      setCurrentDate(new Date());
    };

    updateDate();
    const dateInterval = setInterval(updateDate, 60000);

    return () => clearInterval(dateInterval);
  }, []);

  useEffect(() => {
    let isMounted = true;
    abortControllerRef.current = new AbortController();

    async function fetchDirasakan() {
      try {
        if (!DIRASAKAN_API_URL) return;

        const res = await fetch(`${DIRASAKAN_API_URL.trim()}${Date.now()}`, {
          signal: abortControllerRef.current?.signal,
        });
        const raw = await res.text();

        let latest: any = null;
        try {
          const parsedJson = JSON.parse(raw);
          const infoRaw = parsedJson?.info;
          latest = Array.isArray(infoRaw) ? infoRaw[0] : infoRaw;
        } catch {
          const parser = new XMLParser({ ignoreAttributes: false });
          const parsedXml = parser.parse(raw);
          const infoRaw = parsedXml?.alert?.info;
          latest = Array.isArray(infoRaw) ? infoRaw[0] : infoRaw;
        }

        if (!latest || !isMounted) return;

        const coordStr: string = String(latest?.point?.coordinates ?? "");
        const [lonStr, latStr] = coordStr.split(",");
        const latitude = parseFloat(latStr);
        const longitude = parseFloat(lonStr);
        if (isNaN(latitude) || isNaN(longitude)) return;

        const absLat = Math.abs(latitude).toFixed(2);
        const absLon = Math.abs(longitude).toFixed(2);
        const distanceKm = haversineDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          latitude,
          longitude,
        ).toFixed(1);

        const newDirasakanData = {
          distanceKm,
          magnitude: String(latest.magnitude ?? "-"),
          kedalaman: String(latest.depth ?? "-"),
          latText: `${absLat}°${latitude < 0 ? "LS" : "LU"}`,
          lonText: `${absLon}°${longitude >= 0 ? "BT" : "BB"}`,
          wilayah: String(latest.area ?? "-"),
          tanggal: String(latest.date ?? ""),
          jam: String(latest.time ?? ""),
          felt: String(latest.felt ?? ""),
        };

        // Cache the data for other screens
        setCacheData(CACHE_KEYS.DIRASAKAN, newDirasakanData);

        // Batch state updates
        setDirasakanData(newDirasakanData);
        setShakeMapUrl(
          latest.shakemap ? `${SHAKEMAP_BASE}/${latest.shakemap}` : null,
        );
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error("Failed to fetch home dirasakan:", e);
        }
      }
    }

    async function fetchTerdeteksi() {
      try {
        if (!TERDETEKSI_API_URL) return;

        const res = await fetch(`${TERDETEKSI_API_URL.trim()}${Date.now()}`, {
          signal: abortControllerRef.current?.signal,
        });
        const data = await res.json();

        const features = data?.features;
        if (!Array.isArray(features) || features.length === 0 || !isMounted) {
          return;
        }

        const sorted = [...features].sort((a, b) => {
          const tA = a?.properties?.time ?? "";
          const tB = b?.properties?.time ?? "";
          return tB.localeCompare(tA);
        });
        const latest = sorted[0];
        if (!latest) return;

        const props = latest?.properties ?? {};
        const coords = latest?.geometry?.coordinates;
        const longitude = parseFloat(coords?.[0] ?? "0");
        const latitude = parseFloat(coords?.[1] ?? "0");
        if (isNaN(latitude) || isNaN(longitude)) return;

        const [tanggal, jamRaw] = String(props.time ?? "").split(" ");
        const jam = (jamRaw ?? "").split(".")[0];
        const absLat = Math.abs(latitude).toFixed(2);
        const absLon = Math.abs(longitude).toFixed(2);
        const distanceKm = haversineDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          latitude,
          longitude,
        ).toFixed(1);

        const newTerdeteksiData = {
          distanceKm,
          magnitude: parseFloat(props.mag ?? "0").toFixed(1),
          kedalaman: `${parseFloat(props.depth ?? "0").toFixed(1)} km`,
          latText: `${absLat}°${latitude < 0 ? "LS" : "LU"}`,
          lonText: `${absLon}°${longitude >= 0 ? "BT" : "BB"}`,
          wilayah: String(props.place ?? "-"),
          tanggal: tanggal ?? "",
          jam: jam ?? "",
          fase: String(props.fase ?? ""),
        };

        // Cache the data for other screens
        setCacheData(CACHE_KEYS.TERDETEKSI, newTerdeteksiData);
        
        // Single state update
        setTerdeteksiData(newTerdeteksiData);
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error("Failed to fetch home terdeteksi:", e);
        }
      }
    }

    async function fetchAll() {
      await Promise.all([fetchDirasakan(), fetchTerdeteksi()]);
    }

    InteractionManager.runAfterInteractions(() => {
      if (isMounted) {
        void fetchAll();
      }
    });
    const interval = setInterval(fetchAll, 60_000);
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") fetchAll();
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
      appStateSub.remove();
      // Cancel pending requests
      abortControllerRef.current?.abort();
    };
  }, [userLocation]);

  useEffect(() => {
    function updateTimer() {
      if (dirasakanData?.tanggal && dirasakanData?.jam) {
        setTimeAgo(calculateTimeAgo(dirasakanData.tanggal, dirasakanData.jam));
      } else {
        setTimeAgo("Memuat...");
      }
    }

    updateTimer();
    const timerInterval = setInterval(updateTimer, 60000);

    return () => clearInterval(timerInterval);
  }, [dirasakanData]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(scrollOffset / SCREEN_WIDTH);
    if (currentIndex !== activeTab) {
      setActiveTab(currentIndex);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greeting}>Halo, {user.name} !</Text>
            <Text style={styles.date}>
              {currentDate.toLocaleDateString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
        </View>

        <View style={styles.locationCard}>
          <Image
            source={require("../../../assets/images/bandung.jpg")}
            style={styles.locationImage}
          />
          <Text style={styles.locationText}>
            <Ionicons name="location-outline" size={16} /> {userLocation.name}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialIcons name="history" size={20} color="#1E6F9F" />
              <Text style={styles.statLabel}>GEMPA TERAKHIR</Text>
              <Text style={styles.statValue}>{timeAgo}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="location-outline" size={20} color="#1E6F9F" />
              <Text style={styles.statLabel}>JARAK GEMPA</Text>
              <Text style={styles.statValue}>
                {dirasakanData ? `${dirasakanData.distanceKm} km` : "-"}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="alert-circle-outline" size={20} color="#1E6F9F" />
              <Text style={styles.statLabel}>STATUS WILAYAH</Text>
              <Text style={styles.statValue}>Aman</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled={true}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
          >
            <View style={{ width: SCREEN_WIDTH }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Gempabumi Terakhir Dirasakan
                </Text>
                <TouchableOpacity onPress={() => setInfoVisibleDirasakan(true)}>
                  <Ionicons
                    name="information-circle-outline"
                    size={25}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
              <DirasakanCard
                data={dirasakanData}
                onShakeMap={() => setShakeMapVisible(true)}
                hasShakeMap={!!shakeMapUrl}
                onCardPress={() =>
                  router.push({
                    pathname: "/main-menu/earthquake",
                    params: { tab: "GEMPA DIRASAKAN" },
                  })
                }
              />
            </View>

            <View style={{ width: SCREEN_WIDTH }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Gempabumi Terakhir Terdeteksi
                </Text>
                <TouchableOpacity
                  onPress={() => setInfoVisibleTerdeteksi(true)}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={25}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
              <TerdeteksiCard
                data={terdeteksiData}
                onCardPress={() =>
                  router.push({
                    pathname: "/main-menu/earthquake",
                    params: { tab: "GEMPA TERDETEKSI" },
                  })
                }
              />
            </View>
          </ScrollView>

          <View style={styles.paginationContainer}>
            <View
              style={[
                styles.dot,
                activeTab === 0 ? styles.dotActive : styles.dotInactive,
              ]}
            />
            <View
              style={[
                styles.dot,
                activeTab === 1 ? styles.dotActive : styles.dotInactive,
              ]}
            />
          </View>
        </View>
      </ScrollView>

      <InfoModal
        visible={infoVisibleDirasakan}
        onClose={() => setInfoVisibleDirasakan(false)}
        title="Gempabumi Terakhir Dirasakan"
        desc="Menampilkan kejadian gempa yang getarannya dirasakan oleh manusia dan dilaporkan di wilayah sekitar."
      />
      <InfoModal
        visible={infoVisibleTerdeteksi}
        onClose={() => setInfoVisibleTerdeteksi(false)}
        title="Gempabumi Terakhir Terdeteksi"
        desc="Menampilkan gempa yang tercatat oleh alat seismograf, namun tidak dirasakan oleh manusia."
      />

      <Modal visible={shakeMapVisible} transparent animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View
            style={[styles.modalCardBottom, { height: SCREEN_HEIGHT * 0.9 }]}
          >
            <View style={styles.handleBar} />
            <View style={styles.modalHeaderBottom}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitleBottom}>PETA GUNCANGAN</Text>
                <Text style={styles.modalSubtitle}>
                  Sumber data: BMKG ShakeMap
                </Text>
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

// === KOMPONEN CARD ===

const DirasakanCard = ({
  data,
  onShakeMap,
  hasShakeMap,
  onCardPress,
}: {
  data: DirasakanQuake | null;
  onShakeMap: () => void;
  hasShakeMap: boolean;
  onCardPress: () => void;
}) => (
  <TouchableOpacity
    style={styles.mapCard}
    activeOpacity={0.95}
    onPress={onCardPress}
  >
    <View style={styles.mapImageContainer}>
      <Image
        source={require("../../../assets/images/navigation-map.png")}
        style={styles.mapImage}
      />
      <View style={styles.mapButtons}>
        <TouchableOpacity
          style={[styles.mapButton, !hasShakeMap && styles.mapButtonDisabled]}
          onPress={(e) => {
            e.stopPropagation();
            onShakeMap();
          }}
          disabled={!hasShakeMap}
        >
          <Feather name="map" size={12} color="white" />
          <Text style={styles.mapButtonText}>PETA GUNCANGAN</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.mapButton}
          onPress={(e) => e.stopPropagation()}
        >
          <Feather name="share" size={12} color="white" />
          <Text style={styles.mapButtonText}>BAGIKAN</Text>
        </TouchableOpacity>
      </View>
    </View>

    <View style={styles.statsTopRow}>
      <StatItem
        icon="triangle-wave"
        value={data?.magnitude ?? "-"}
        label="Magnitudo"
      />
      <View style={styles.statTopDivider} />
      <StatItem icon="rss" value={data?.kedalaman ?? "-"} label="Kedalaman" />
      <View style={styles.statTopDivider} />
      <StatItem
        icon="compass-outline"
        value={data?.latText ?? "-"}
        label="LS"
      />
      <View style={styles.statTopDivider} />
      <StatItem
        icon="compass-outline"
        value={data?.lonText ?? "-"}
        label="BT"
      />
    </View>

    <View style={styles.separator} />

    <View style={styles.infoContent}>
      <DetailItem
        icon="location"
        label="Lokasi Gempa :"
        value={data?.wilayah ?? "-"}
      />
      <DetailItem
        icon="time-outline"
        label="Waktu :"
        value={data ? `${data.tanggal}, ${data.jam}` : "-"}
      />
      <DetailItem
        icon="walk-outline"
        label="Jarak :"
        value={data ? `${data.distanceKm} km dari lokasi Anda` : "-"}
      />
      {!!data?.felt && (
        <DetailItem
          icon="alert-circle-outline"
          label="Wilayah Dirasakan :"
          value={data.felt}
        />
      )}
    </View>
  </TouchableOpacity>
);

const TerdeteksiCard = ({
  data,
  onCardPress,
}: {
  data: TerdeteksiQuake | null;
  onCardPress: () => void;
}) => (
  <TouchableOpacity
    style={styles.mapCard}
    activeOpacity={0.95}
    onPress={onCardPress}
  >
    <View style={styles.mapImageContainer}>
      <Image
        source={require("../../../assets/images/navigation-map.png")}
        style={styles.mapImage}
      />
      <View style={styles.mapButtons}>
        <TouchableOpacity
          style={styles.mapButton}
          onPress={(e) => e.stopPropagation()}
        >
          <Feather name="share" size={12} color="white" />
          <Text style={styles.mapButtonText}>BAGIKAN</Text>
        </TouchableOpacity>
      </View>
    </View>

    <View style={styles.statsTopRow}>
      <StatItem
        icon="triangle-wave"
        value={data?.magnitude ?? "-"}
        label="Magnitudo"
      />
      <View style={styles.statTopDivider} />
      <StatItem icon="rss" value={data?.kedalaman ?? "-"} label="Kedalaman" />
      <View style={styles.statTopDivider} />
      <StatItem
        icon="compass-outline"
        value={data?.latText ?? "-"}
        label="LS"
      />
      <View style={styles.statTopDivider} />
      <StatItem
        icon="compass-outline"
        value={data?.lonText ?? "-"}
        label="BT"
      />
    </View>

    <View style={styles.separator} />

    <View style={styles.infoContent}>
      <DetailItem
        icon="location"
        label="Lokasi Gempa :"
        value={data?.wilayah ?? "-"}
      />
      <DetailItem
        icon="time-outline"
        label="Tanggal :"
        value={data?.tanggal ?? "-"}
      />
      <DetailItem icon="time-outline" label="Jam :" value={data?.jam ?? "-"} />
      {!!data?.fase && (
        <DetailItem
          icon="alert-circle-outline"
          label="Fase :"
          value={data.fase}
        />
      )}
    </View>
  </TouchableOpacity>
);

// === KOMPONEN ITEM ===
const StatItem = ({ icon, value, label }: any) => (
  <View style={styles.statTopItem}>
    <MaterialCommunityIcons name={icon} size={20} color="#0369A1" />
    <Text style={styles.statTopValue}>{value}</Text>
    <Text style={styles.statTopLabel}>{label}</Text>
  </View>
);

const DetailItem = ({ icon, label, value }: any) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={18} color="#1E6F9F" style={styles.infoIcon} />
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const InfoModal = ({ visible, onClose, title, desc }: any) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <View style={styles.infoCard}>
        <Ionicons
          name="information-circle"
          size={40}
          color="#1E6F9F"
          style={{ alignSelf: "center", marginBottom: 12 }}
        />
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDesc}>{desc}</Text>
        <TouchableOpacity style={styles.infoButton} onPress={onClose}>
          <Text style={styles.infoButtonText}>Mengerti</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  </Modal>
);

// === STYLES ===
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: 5,
  },
  greeting: { fontSize: 24, fontWeight: "bold", color: "#000" },
  date: { color: "#000", fontWeight: "bold", fontSize: 14 },
  locationCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 10,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  locationImage: {
    width: "100%",
    height: 125,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  locationText: {
    position: "absolute",
    top: 10,
    left: 10,
    color: "#fff",
    fontWeight: "bold",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 15,
    backgroundColor: "#F5F7FA",
    marginTop: -10,
  },
  statItem: { alignItems: "center" },
  statLabel: { fontSize: 10, color: "#777" },
  statValue: { fontWeight: "bold" },
  bottomSection: {
    backgroundColor: "#0C4A6E",
    marginTop: -1,
    paddingBottom: 10,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  sectionTitle: { color: "#fff", fontSize: 20, fontWeight: "bold", flex: 1 },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  dot: { borderRadius: 5, marginHorizontal: 4 },
  dotActive: { width: 20, height: 8, backgroundColor: "#fff" },
  dotInactive: {
    width: 8,
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },

  mapCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 16,
    paddingBottom: 15,
    marginBottom: 10,
    height: 490,
    overflow: "hidden",
  },

  mapImageContainer: { position: "relative" },
  mapImage: {
    width: "100%",
    height: 180,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  mapButtons: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    gap: 6,
  },
  mapButton: {
    backgroundColor: "#0891B2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mapButtonDisabled: { backgroundColor: "#94a3b8" },
  mapButtonText: { color: "#fff", fontSize: 10 },

  statsTopRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 11,
    marginTop: 15,
  },
  statTopItem: { flex: 1, alignItems: "center", gap: 2 },
  statTopValue: { fontSize: 14, fontWeight: "700", color: "#000" },
  statTopLabel: { fontSize: 12, color: "#000", fontWeight: "500" },
  statTopDivider: { width: 1, backgroundColor: "#E0E0E0", marginVertical: 4 },
  separator: {
    height: 2,
    backgroundColor: "#0369A1",
    marginBottom: 11,
    marginHorizontal: 15,
  },

  infoContent: { paddingHorizontal: 15 },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 10,
  },
  infoIcon: { marginTop: 2 },
  infoLabel: { fontSize: 12, color: "#666", marginBottom: 2 },
  infoValue: { fontSize: 13, fontWeight: "700", color: "#1E3A5F" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "85%",
    padding: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 12,
  },
  infoDesc: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  infoButton: {
    backgroundColor: "#1E6F9F",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  infoButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalCardBottom: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    width: "100%",
  },
  modalHeaderBottom: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitleBottom: { color: "#0C4A6E", fontWeight: "bold", fontSize: 16 },
  modalSubtitle: { fontSize: 11, color: "#777" },
  maximizedImage: { width: SCREEN_WIDTH, height: 600, marginTop: 10 },
  modalFooter: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fafafa",
  },
  scrollHint: {
    textAlign: "center",
    fontSize: 12,
    color: "#1E6F9F",
    fontWeight: "500",
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: "#ccc",
    borderRadius: 10,
    alignSelf: "center",
    marginTop: 12,
  },
  modalCloseCircle: {
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    padding: 4,
  },
});
