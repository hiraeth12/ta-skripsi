import { CACHE_KEYS, getCachedData, setCacheData } from "@/hooks/use-earthquake-cache";
import { useHaversine } from "@/hooks/use-haversine";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { get, getDatabase, ref } from "@react-native-firebase/database";
import { getDownloadURL, getStorage, ref as storageRef } from "@react-native-firebase/storage";
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
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DirasakanCard } from "./components/dirasakan-card";
import { InfoModal } from "./components/info-modal";
import { TerdeteksiCard } from "./components/terdeteksi-card";
import { styles } from "./styles/homeStyles";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const SHAKEMAP_BASE = "https://bmkg-content-inatews.storage.googleapis.com";
const DIRASAKAN_API_URL = process.env.EXPO_PUBLIC_GEMPA_DIRASAKAN_API_URL!;
const TERDETEKSI_API_URL = process.env.EXPO_PUBLIC_GEMPA_TERDETEKSI_API_URL!;
const DEFAULT_LOCATION = {
  latitude: -6.9175,
  longitude: 107.6191,
  name: "Bandung",
};

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
  const { haversineDistanceKm } = useHaversine();
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
  const [locationImageUrl, setLocationImageUrl] = useState<string | null>(null);
  const [locationImageLoading, setLocationImageLoading] = useState(true);
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
        // Fetch location image from Firebase Storage via locations collection with caching
        if (userData.locationName) {
          try {
            // Check cache first
            const cacheKey = `location_image_${userData.locationName}`;
            const cachedUrl = getCachedData<string>(cacheKey);
            
            if (cachedUrl) {
              // Use cached URL
              setLocationImageUrl(cachedUrl);
              setLocationImageLoading(false);
            } else {
              // Fetch from Firebase if not cached
              const locationsRef = ref(database, "locations");
              const locationsSnapshot = await get(locationsRef);
              const locationsData = locationsSnapshot.val();

              if (locationsData) {
                // Find the location matching the user's locationName
                const locationEntry = Object.values(locationsData).find(
                  (loc: any) => loc?.name === userData.locationName
                ) as any;

                if (locationEntry?.image) {
                  const storage = getStorage(app);
                  const imageRef = storageRef(storage, locationEntry.image);
                  const url = await getDownloadURL(imageRef);
                  
                  // Cache the URL for future use (1 hour TTL)
                  setCacheData(cacheKey, url, 3600_000);
                  setLocationImageUrl(url);
                  setLocationImageLoading(false);
                } else {
                  setLocationImageLoading(false);
                }
              } else {
                setLocationImageLoading(false);
              }
            }
          } catch (storageError) {
            console.warn("Error fetching location image:", storageError);
            setLocationImageUrl(null);
            setLocationImageLoading(false);
          }
        } else {
          setLocationImageLoading(false);
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
          {locationImageLoading || !locationImageUrl ? (
            <View style={[styles.locationImage, styles.skeletonLoading]} />
          ) : (
            <Image
              source={{ uri: locationImageUrl }}
              style={styles.locationImage}
            />
          )}
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






