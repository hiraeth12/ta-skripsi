import { NetworkErrorModal } from "@/components/ui/network-error-modal";
import { ModalShakeMap } from "@/components/modal-shakemap";
import Skeleton from "@/components/skeleton";
import {
  CACHE_KEYS,
  getCachedData,
  getPersistentCache,
  setCacheData,
} from "@/utils/cache";
import {
  haversineDistanceKm,
  findNearestLocation,
  GeoLocation,
} from "@/utils/geo";
import { calculateTimeAgo } from "@/utils/date";
import { shareQuake } from "@/utils/share";
import { computeStatus } from "@/utils/earthquake";
import { useUserSession } from "@/features/account/user-session-context";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { get, getDatabase, ref } from "@react-native-firebase/database";
import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
} from "@react-native-firebase/storage";
import { useRouter } from "expo-router";
import { XMLParser } from "fast-xml-parser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  AppStateStatus,
  Dimensions,
  Image,
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

// ─── Module-level constants (never recreated) ─────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SHAKEMAP_BASE = "https://bmkg-content-inatews.storage.googleapis.com";
const DIRASAKAN_API_URL = process.env.EXPO_PUBLIC_GEMPA_DIRASAKAN_API_URL!;
const TERDETEKSI_API_URL = process.env.EXPO_PUBLIC_GEMPA_TERDETEKSI_API_URL!;
const DB_URL = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
const DEFAULT_LOCATION = {
  latitude: -6.9175,
  longitude: 107.6191,
  name: "Bandung",
};
const xmlParser = new XMLParser({ ignoreAttributes: false });
let cachedLocationsData: Record<string, any> | null = null;

// ─── Types ────────────────────────────────────────────────────────────────────

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
  description?: string;
  latitude: number;
  longitude: number;
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
  latitude: number;
  longitude: number;
};

type UserLocation = { latitude: number; longitude: number; name: string };

// Tipe data lokasi dari Firebase
interface FirebaseLocation extends GeoLocation {
  name: string;
  image?: string;
}

// ─── Pure helpers (stable, no component deps) ─────────────────────────────────

function formatCoord(value: number): {
  text: string;
  latLabel: string;
  lonLabel: string;
} {
  const abs = Math.abs(value).toFixed(2);
  return {
    text: abs,
    latLabel: value < 0 ? "LS" : "LU",
    lonLabel: value >= 0 ? "BT" : "BB",
  };
}

async function getLocationsData(
  database: ReturnType<typeof getDatabase>,
): Promise<FirebaseLocation[] | null> {
  if (cachedLocationsData) {
    return Object.values(cachedLocationsData) as FirebaseLocation[];
  }
  const snap = await get(ref(database, "locations"));
  cachedLocationsData = snap.val() ?? null;
  return cachedLocationsData
    ? (Object.values(cachedLocationsData) as FirebaseLocation[])
    : null;
}

// ─── Skeleton card (extracted to avoid duplication in JSX) ───────────────────

function CardSkeleton() {
  return (
    <View style={styles.mapCard}>
      <View style={styles.mapImageContainer}>
        <Skeleton width="100%" height="100%" borderRadius={0} />
      </View>
      <View style={[styles.statsTopRow, { justifyContent: "space-around" }]}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width={60} height={45} borderRadius={8} />
        ))}
      </View>
      <View style={styles.separator} />
      <View style={[styles.infoContent, { gap: 15 }]}>
        {(["100%", "80%", "90%", "60%"] as const).map((w, i) => (
          <Skeleton key={i} width={w} height={24} borderRadius={6} />
        ))}
      </View>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const session = useUserSession();
  const [dirasakanData, setDirasakanData] = useState<DirasakanQuake | null>(
    () => getCachedData(CACHE_KEYS.DIRASAKAN) ?? null,
  );
  const [terdeteksiData, setTerdeteksiData] = useState<TerdeteksiQuake | null>(
    () => getCachedData(CACHE_KEYS.TERDETEKSI) ?? null,
  );

  const [shakeMapUrl, setShakeMapUrl] = useState<string | null>(null);
  const [shakeMapVisible, setShakeMapVisible] = useState(false);
  const [infoVisibleDirasakan, setInfoVisibleDirasakan] = useState(false);
  const [infoVisibleTerdeteksi, setInfoVisibleTerdeteksi] = useState(false);
  const [networkErrorModalVisible, setNetworkErrorModalVisible] =
    useState(false);

  const [userLocation, setUserLocation] =
    useState<UserLocation>(DEFAULT_LOCATION);
  const [locationImageUrl, setLocationImageUrl] = useState<string | null>(null);
  const [locationImageLoading, setLocationImageLoading] = useState(true);
  const [userName, setUserName] = useState("Pengguna");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState(0);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const networkErrorShownRef = useRef(false);
  const appStatePrevRef = useRef<AppStateStatus>(AppState.currentState);

  // Read userLocation in fetch without adding it to deps — prevents re-fetch on GPS drift
  const userLocationRef = useRef(userLocation);
  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const status = useMemo(() => computeStatus(dirasakanData), [dirasakanData]);

  const timeAgo = useMemo(
    () =>
      calculateTimeAgo(dirasakanData?.tanggal ?? "", dirasakanData?.jam ?? ""),
    [dirasakanData?.tanggal, dirasakanData?.jam],
  );

  const handleShareDirasakan = useCallback(
    () => shareQuake(dirasakanData, "dirasakan"),
    [dirasakanData],
  );
  const handleShareTerdeteksi = useCallback(
    () => shareQuake(terdeteksiData, "terdeteksi"),
    [terdeteksiData],
  );

  // ── Network error helper ──────────────────────────────────────────────────────
  const showNetworkError = useCallback(() => {
    if (networkErrorShownRef.current) return;
    networkErrorShownRef.current = true;
    setNetworkErrorModalVisible(true);
  }, []);

  const sessionUserId = session.user?.uid;
  const sessionProfileName = session.profile?.name ?? "";
  const sessionProfileLocation = session.profile?.location ?? "";
  const sessionLatitude = session.location?.latitude;
  const sessionLongitude = session.location?.longitude;
  const sessionLocationName = session.location?.name ?? "";

  useEffect(() => {
    let isMounted = true;

    async function hydrateLatestFromStorage() {
      const [cachedDirasakan, cachedTerdeteksi] = await Promise.all([
        getPersistentCache<DirasakanQuake>(CACHE_KEYS.DIRASAKAN),
        getPersistentCache<TerdeteksiQuake>(CACHE_KEYS.TERDETEKSI),
      ]);

      if (!isMounted) return;
      if (!dirasakanData && cachedDirasakan) setDirasakanData(cachedDirasakan);
      if (!terdeteksiData && cachedTerdeteksi)
        setTerdeteksiData(cachedTerdeteksi);
    }

    hydrateLatestFromStorage();
    return () => {
      isMounted = false;
    };
  }, []);

  // ── User data — runs once on mount ───────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function fetchUserData() {
      try {
        const app = getApp();
        const authUser = getAuth(app).currentUser;
        if (!sessionUserId && !authUser) return;

        const database = DB_URL ? getDatabase(app, DB_URL) : getDatabase(app);

        if (sessionProfileName && isMounted) {
          const firstName =
            sessionProfileName.split(" ")[0] || sessionProfileName;
          setUserName((prev) => (prev === firstName ? prev : firstName));
        }

        const userLat = sessionLatitude ?? NaN;
        const userLon = sessionLongitude ?? NaN;
        let locationName: string =
          sessionLocationName || sessionProfileLocation || "Lokasi Saya";

        if (
          locationName === "Lokasi GPS" &&
          !isNaN(userLat) &&
          !isNaN(userLon)
        ) {
          const locations = await getLocationsData(database);
          if (locations) {
            // ← findNearestLocation dari utils, tidak perlu loop manual
            const nearest = findNearestLocation(userLat, userLon, locations);
            if (nearest?.name) locationName = nearest.name;
          }
        }

        if (!isNaN(userLat) && !isNaN(userLon) && isMounted) {
          setUserLocation((prev) =>
            prev.latitude === userLat &&
            prev.longitude === userLon &&
            prev.name === locationName
              ? prev
              : { latitude: userLat, longitude: userLon, name: locationName },
          );
        }

        const imageCacheKey = `location_image_${locationName}`;
        const cachedImageUrl = getCachedData<string>(imageCacheKey);
        if (cachedImageUrl) {
          if (isMounted) {
            setLocationImageUrl((prev) =>
              prev === cachedImageUrl ? prev : cachedImageUrl,
            );
            setLocationImageLoading(false);
          }
          return;
        }

        const locations = await getLocationsData(database);
        const entry = locations?.find((l) => l?.name === locationName) ?? null;

        if (entry?.image) {
          const url = await getDownloadURL(
            storageRef(getStorage(app), entry.image),
          );
          setCacheData(imageCacheKey, url, 3_600_000);
          if (isMounted)
            setLocationImageUrl((prev) => (prev === url ? prev : url));
        }
      } catch {
      } finally {
        if (isMounted) setLocationImageLoading(false);
      }
    }

    fetchUserData();
    return () => {
      isMounted = false;
    };
  }, [
    // haversineDistanceKm dihapus dari deps — module-level, referensi selalu stabil
    sessionUserId,
    sessionLatitude,
    sessionLocationName,
    sessionLongitude,
    sessionProfileLocation,
    sessionProfileName,
  ]);

  // ── Date ticker ───────────────────────────────────────────────────────────────
  useEffect(() => {
    setCurrentDate(new Date());
    const id = setInterval(() => setCurrentDate(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const abort = new AbortController();

    async function fetchDirasakan() {
      if (!DIRASAKAN_API_URL) return;
      const res = await fetch(`${DIRASAKAN_API_URL.trim()}${Date.now()}`, {
        signal: abort.signal,
      });
      const raw = await res.text();

      let latest: any = null;
      try {
        const parsed = JSON.parse(raw);
        const info = parsed?.info;
        latest = Array.isArray(info) ? info[0] : info;
      } catch {
        // Module-level singleton — not recreated each call
        const parsed = xmlParser.parse(raw);
        const info = parsed?.alert?.info;
        latest = Array.isArray(info) ? info[0] : info;
      }

      if (!latest || !isMounted) return;

      const coordStr = String(latest?.point?.coordinates ?? "");
      const [lonStr, latStr] = coordStr.split(",");
      const latitude = parseFloat(latStr);
      const longitude = parseFloat(lonStr);
      if (isNaN(latitude) || isNaN(longitude)) return;

      const { latitude: uLat, longitude: uLon } = userLocationRef.current;
      const latCoord = formatCoord(latitude);
      const lonCoord = formatCoord(longitude);

      const data: DirasakanQuake = {
        // ← haversineDistanceKm langsung dari utils
        distanceKm: haversineDistanceKm(
          uLat,
          uLon,
          latitude,
          longitude,
        ).toFixed(1),
        magnitude: String(latest.magnitude ?? "-"),
        kedalaman: String(latest.depth ?? "-"),
        latText: `${latCoord.text}°${latCoord.latLabel}`,
        lonText: `${lonCoord.text}°${lonCoord.lonLabel}`,
        wilayah: String(latest.area ?? "-"),
        tanggal: String(latest.date ?? ""),
        jam: String(latest.time ?? ""),
        felt: String(latest.felt ?? ""),
        description: String(latest.description ?? ""),
        latitude,
        longitude,
      };

      setCacheData(CACHE_KEYS.DIRASAKAN, data);
      if (isMounted) {
        setDirasakanData(data);
        setShakeMapUrl(
          latest.shakemap ? `${SHAKEMAP_BASE}/${latest.shakemap}` : null,
        );
      }
    }

    async function fetchTerdeteksi() {
      if (!TERDETEKSI_API_URL) return;
      const res = await fetch(`${TERDETEKSI_API_URL.trim()}${Date.now()}`, {
        signal: abort.signal,
      });
      const { features } = await res.json();
      if (!Array.isArray(features) || features.length === 0 || !isMounted)
        return;

      const latest = [...features].sort((a, b) =>
        (b?.properties?.time ?? "").localeCompare(a?.properties?.time ?? ""),
      )[0];
      if (!latest) return;

      const props = latest?.properties ?? {};
      const coords = latest?.geometry?.coordinates;
      const longitude = parseFloat(coords?.[0] ?? "0");
      const latitude = parseFloat(coords?.[1] ?? "0");
      if (isNaN(latitude) || isNaN(longitude)) return;
      const [tanggal, jamRaw] = String(props.time ?? "").split(" ");
      const jam = (jamRaw ?? "").split(".")[0];
      const { latitude: uLat, longitude: uLon } = userLocationRef.current;
      const latCoord = formatCoord(latitude);
      const lonCoord = formatCoord(longitude);
      const data: TerdeteksiQuake = {
        distanceKm: haversineDistanceKm(
          uLat,
          uLon,
          latitude,
          longitude,
        ).toFixed(1),
        magnitude: parseFloat(props.mag ?? "0").toFixed(1),
        kedalaman: `${parseFloat(props.depth ?? "0").toFixed(1)} km`,
        latText: `${latCoord.text}°${latCoord.latLabel}`,
        lonText: `${lonCoord.text}°${lonCoord.lonLabel}`,
        wilayah: String(props.place ?? "-"),
        tanggal: tanggal ?? "",
        jam: jam ?? "",
        fase: String(props.fase ?? ""),
        latitude,
        longitude,
      };

      setCacheData(CACHE_KEYS.TERDETEKSI, data);
      if (isMounted) setTerdeteksiData(data);
    }

    async function fetchAll() {
      try {
        await Promise.all([fetchDirasakan(), fetchTerdeteksi()]);
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") {
          showNetworkError();
        }
      }
    }

    fetchAll();
    const interval = setInterval(fetchAll, 60_000);

    // Only re-fetch when coming from background — not on every focus/blur
    const appStateSub = AppState.addEventListener("change", (next) => {
      if (
        appStatePrevRef.current.match(/inactive|background/) &&
        next === "active"
      ) {
        fetchAll();
      }
      appStatePrevRef.current = next;
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
      appStateSub.remove();
      abort.abort();
    };
  }, []); // stable — location read via ref, no re-run on GPS drift

  // ── Scroll pagination indicator ───────────────────────────────────────────────
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(
        event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
      );
      setActiveTab((prev) => (prev !== index ? index : prev));
    },
    [],
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greeting}>Halo, {userName} !</Text>
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

        {/* Location card */}
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
              {dirasakanData ? (
                <Text style={styles.statValue}>{timeAgo}</Text>
              ) : (
                <Skeleton width={80} height={14} borderRadius={4} />
              )}
            </View>
            <View style={styles.statItem}>
              <Ionicons name="location-outline" size={20} color="#1E6F9F" />
              <Text style={styles.statLabel}>JARAK GEMPA</Text>
              {dirasakanData ? (
                <Text
                  style={styles.statValue}
                >{`${dirasakanData.distanceKm} km`}</Text>
              ) : (
                <Skeleton width={60} height={14} borderRadius={4} />
              )}
            </View>
            <View style={styles.statItem}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={dirasakanData ? status.color : "#CBD5E1"}
              />
              <Text style={styles.statLabel}>STATUS WILAYAH</Text>
              {dirasakanData ? (
                <Text
                  style={[
                    styles.statValue,
                    { color: status.color, fontWeight: "bold" },
                  ]}
                >
                  {status.label}
                </Text>
              ) : (
                <Skeleton width={70} height={14} borderRadius={4} />
              )}
            </View>
          </View>
        </View>

        {/* Cards carousel */}
        <View style={styles.bottomSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            onScroll={handleScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
          >
            {/* Dirasakan */}
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
              {dirasakanData ? (
                <DirasakanCard
                  data={dirasakanData}
                  onShakeMap={() => setShakeMapVisible(true)}
                  hasShakeMap={!!shakeMapUrl}
                  onShare={handleShareDirasakan}
                  onCardPress={() =>
                    router.push({
                      pathname: "/main-menu/earthquake",
                      params: { tab: "GEMPA DIRASAKAN" },
                    })
                  }
                />
              ) : (
                <CardSkeleton />
              )}
            </View>

            {/* Terdeteksi */}
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
              {terdeteksiData ? (
                <TerdeteksiCard
                  data={terdeteksiData}
                  onShare={handleShareTerdeteksi}
                  onCardPress={() =>
                    router.push({
                      pathname: "/main-menu/earthquake",
                      params: { tab: "GEMPA TERDETEKSI" },
                    })
                  }
                />
              ) : (
                <CardSkeleton />
              )}
            </View>
          </ScrollView>

          <View style={styles.paginationContainer}>
            {[0, 1].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  activeTab === i ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
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
      <NetworkErrorModal
        visible={networkErrorModalVisible}
        onClose={() => {
          setNetworkErrorModalVisible(false);
          networkErrorShownRef.current = false;
        }}
      />

      <ModalShakeMap
        visible={shakeMapVisible}
        imageUrl={shakeMapUrl}
        onClose={() => setShakeMapVisible(false)}
      />
    </View>
  );
}
