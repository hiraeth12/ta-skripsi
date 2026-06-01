import { ModalShakeMap } from "@/components/ui/modal-shakemap";
import { NetworkErrorModal } from "@/components/ui/network-error-modal";
import PullToRefresh from "@/components/ui/pull-to-refresh";
import Skeleton from "@/components/ui/skeleton";
import { DEFAULT_LOCATION } from "@/constants/map";
import type { ProfileData } from "@/features/main-menu/account/data/profile";
import {
    fetchUserSessionData,
    type UserLocation,
} from "@/features/main-menu/account/session";
import { useUserSession } from "@/features/main-menu/account/user-session-context";
import {
    CACHE_KEYS,
    getCachedData,
    getPersistentCache,
    setCacheData,
} from "@/utils/cache";
import { calculateTimeAgo } from "@/utils/date";
import { computeStatus } from "@/utils/earthquake";
import {
    findNearestLocation,
    GeoLocation,
    haversineDistanceKm,
} from "@/utils/geo";
import { shareQuake } from "@/utils/share";
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
import { TsunamiCard, type TsunamiQuake } from "./components/tsunami-card";
import { styles } from "./styles/homeStyles";

// ─── Module-level constants ───────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SHAKEMAP_BASE = "https://bmkg-content-inatews.storage.googleapis.com";

const DIRASAKAN_API_URL = process.env.EXPO_PUBLIC_GEMPA_DIRASAKAN_API_URL ?? "";
const TERDETEKSI_API_URL =
  process.env.EXPO_PUBLIC_GEMPA_TERDETEKSI_API_URL ?? "";
const TSUNAMI_API_URL =
  process.env.EXPO_PUBLIC_PERINGATAN_TSUNAMI_API_URL ?? "";
const DB_URL = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL?.trim() ?? "";

const xmlParser = new XMLParser({ ignoreAttributes: false });
let cachedLocationsData: FirebaseLocation[] | null = null;

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

interface FirebaseLocation extends GeoLocation {
  name: string;
  image?: string;
}

type ApplyHomeUserDataOptions = {
  showImageLoading?: boolean;
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

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

function safeText(value: unknown, fallback = "-"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function parsePointCoordinates(coordStr: string): {
  latitude: number;
  longitude: number;
} | null {
  const [lonStr, latStr] = coordStr.split(",").map((part) => part.trim());
  const latitude = parseFloat(latStr ?? "");
  const longitude = parseFloat(lonStr ?? "");

  if (isNaN(latitude) || isNaN(longitude)) return null;

  return { latitude, longitude };
}

function buildShakemapUrl(shakemap: string): string {
  const value = shakemap.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${SHAKEMAP_BASE}/${value}`;
}

function withCacheBuster(url: string): string {
  const base = url.trim();
  if (!base) return "";
  if (base.endsWith("=") || base.endsWith("?") || base.endsWith("&")) {
    return `${base}${Date.now()}`;
  }
  return `${base}${base.includes("?") ? "&" : "?"}t=${Date.now()}`;
}

async function getLocationsData(
  database: ReturnType<typeof getDatabase>,
): Promise<FirebaseLocation[] | null> {
  if (cachedLocationsData) return cachedLocationsData;
  const snap = await get(ref(database, "locations"));
  const val = snap.val();
  cachedLocationsData = val ? (Object.values(val) as FirebaseLocation[]) : null;
  return cachedLocationsData;
}

function parseDirasakanPayload(latest: unknown): {
  coordStr: string;
  magnitude: string;
  kedalaman: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  felt: string;
  description: string;
  shakemap: string;
} | null {
  if (!latest || typeof latest !== "object") return null;
  const l = latest as Record<string, unknown>;

  const coordStr = String(
    (l?.point as Record<string, unknown>)?.coordinates ?? "",
  );
  if (!coordStr) return null;

  return {
    coordStr,
    magnitude: String(l.magnitude ?? "-"),
    kedalaman: String(l.depth ?? "-"),
    wilayah: String(l.area ?? "-"),
    tanggal: String(l.date ?? ""),
    jam: String(l.time ?? ""),
    felt: String(l.felt ?? ""),
    description: String(l.description ?? ""),
    shakemap: String(l.shakemap ?? ""),
  };
}

function getTsunamiInfoItems(parsed: Record<string, unknown>): unknown[] {
  const alert = parsed.alert;
  const root =
    alert && typeof alert === "object"
      ? (alert as Record<string, unknown>)
      : parsed;
  const info = root.info;

  if (Array.isArray(info)) return info;
  return info ? [info] : [];
}

function parseTsunamiTimesent(value: unknown): number {
  const text = String(value ?? "")
    .trim()
    .replace(/\s*WIB$/i, "")
    .trim();
  const match = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/,
  );

  if (!match) return Number.NEGATIVE_INFINITY;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10) - 1;
  const year = Number.parseInt(match[3], 10);
  const hour = Number.parseInt(match[4], 10);
  const minute = Number.parseInt(match[5], 10);
  const second = Number.parseInt(match[6], 10);
  const timestamp = new Date(year, month, day, hour, minute, second).getTime();

  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function getLatestTsunamiInfo(items: unknown[]): unknown | null {
  if (items.length === 0) return null;

  const rankedItems = items.map((item, index) => {
    const record =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      item,
      index,
      time: parseTsunamiTimesent(record.timesent),
    };
  });
  const hasTimesent = rankedItems.some(
    (item) => item.time !== Number.NEGATIVE_INFINITY,
  );

  if (!hasTimesent) return items[items.length - 1];

  return (
    [...rankedItems].sort((a, b) => {
      if (b.time !== a.time) return b.time - a.time;
      return b.index - a.index;
    })[0]?.item ?? null
  );
}

function parseTsunamiPayload(latest: unknown): TsunamiQuake | null {
  if (!latest || typeof latest !== "object") return null;
  const l = latest as Record<string, unknown>;
  const coordStr = String(
    (l.point as Record<string, unknown>)?.coordinates ?? "",
  );
  const coordinates = parsePointCoordinates(coordStr);

  return {
    magnitude: safeText(l.magnitude),
    kedalaman: safeText(l.depth),
    latText: safeText(l.latitude),
    lonText: safeText(l.longitude),
    wilayah: safeText(l.area),
    tanggal: safeText(l.date),
    jam: safeText(l.time),
    subject: safeText(l.subject),
    headline: safeText(l.headline),
    shakemap: buildShakemapUrl(String(l.shakemap ?? "")),
    ...(coordinates
      ? {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        }
      : {}),
  };
}

// FIX (Security + Bug): helper sanitasi data gempa terdeteksi
function parseTerdeteksiPayload(feature: unknown): {
  longitude: number;
  latitude: number;
  tanggal: string;
  jam: string;
  magnitude: string;
  kedalaman: string;
  wilayah: string;
  fase: string;
} | null {
  if (!feature || typeof feature !== "object") return null;
  const f = feature as Record<string, unknown>;
  const props = (f.properties ?? {}) as Record<string, unknown>;
  const coords = (f.geometry as Record<string, unknown>)?.coordinates;

  if (!Array.isArray(coords)) return null;

  const longitude = parseFloat(String(coords[0] ?? ""));
  const latitude = parseFloat(String(coords[1] ?? ""));
  if (isNaN(latitude) || isNaN(longitude)) return null;

  const [tanggal, jamRaw] = String(props.time ?? "").split(" ");
  const jam = (jamRaw ?? "").split(".")[0];

  return {
    longitude,
    latitude,
    tanggal: tanggal ?? "",
    jam: jam ?? "",
    magnitude: parseFloat(String(props.mag ?? "0")).toFixed(1),
    kedalaman: `${parseFloat(String(props.depth ?? "0")).toFixed(1)} km`,
    wilayah: String(props.place ?? "-"),
    fase: String(props.fase ?? ""),
  };
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

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
  const [tsunamiData, setTsunamiData] = useState<TsunamiQuake | null>(
    () => getCachedData(CACHE_KEYS.TSUNAMI) ?? null,
  );

  const [dirasakanShakeMapUrl, setDirasakanShakeMapUrl] = useState<
    string | null
  >(null);
  const [activeShakeMapUrl, setActiveShakeMapUrl] = useState<string | null>(
    null,
  );
  const [shakeMapVisible, setShakeMapVisible] = useState(false);
  const [infoVisibleDirasakan, setInfoVisibleDirasakan] = useState(false);
  const [infoVisibleTerdeteksi, setInfoVisibleTerdeteksi] = useState(false);
  const [infoVisibleTsunami, setInfoVisibleTsunami] = useState(false);
  const [networkErrorModalVisible, setNetworkErrorModalVisible] =
    useState(false);

  const [userLocation, setUserLocation] =
    useState<UserLocation>(DEFAULT_LOCATION);
  const [locationImageUrl, setLocationImageUrl] = useState<string | null>(null);
  const [locationImageLoading, setLocationImageLoading] = useState(true);
  const [userName, setUserName] = useState("Pengguna");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const networkErrorShownRef = useRef(false);
  const appStatePrevRef = useRef<AppStateStatus>(AppState.currentState);
  const userLocationRef = useRef(userLocation);
  const refreshInFlightRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

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
  const handleShareTsunami = useCallback(
    () => shareQuake(tsunamiData, "tsunami"),
    [tsunamiData],
  );

  const showNetworkError = useCallback(() => {
    if (networkErrorShownRef.current) return;
    networkErrorShownRef.current = true;
    setNetworkErrorModalVisible(true);
  }, []);

  // ── Derived session values ────────────────────────────────────────────────

  const sessionUserId = session.user?.uid;

  const applyHomeUserData = useCallback(
    async (
      profile: ProfileData | null,
      location: UserLocation | null,
      options: ApplyHomeUserDataOptions = {},
    ) => {
      const app = getApp();
      const authUser = getAuth(app).currentUser;
      if (!sessionUserId && !authUser) return null;

      const database = DB_URL ? getDatabase(app, DB_URL) : getDatabase(app);

      if (profile?.name && isMountedRef.current) {
        const firstName = profile.name.split(" ")[0] || profile.name;
        setUserName((prev) => (prev === firstName ? prev : firstName));
      }

      const userLat = location?.latitude ?? NaN;
      const userLon = location?.longitude ?? NaN;
      let locationName = location?.name || profile?.location || "Lokasi Saya";
      let nextLocation: UserLocation | null = null;

      if (
        locationName === "Lokasi GPS" &&
        Number.isFinite(userLat) &&
        Number.isFinite(userLon)
      ) {
        const locations = await getLocationsData(database);
        const nearest = locations
          ? findNearestLocation(userLat, userLon, locations)
          : null;
        if (nearest?.name) locationName = nearest.name;
      }

      if (Number.isFinite(userLat) && Number.isFinite(userLon)) {
        nextLocation = {
          latitude: userLat,
          longitude: userLon,
          name: locationName,
        };
        userLocationRef.current = nextLocation;
        if (isMountedRef.current) {
          setUserLocation((prev) =>
            prev.latitude === nextLocation!.latitude &&
            prev.longitude === nextLocation!.longitude &&
            prev.name === nextLocation!.name
              ? prev
              : nextLocation!,
          );
        }
      }

      if (!locationName) return nextLocation;

      if (options.showImageLoading !== false && isMountedRef.current) {
        setLocationImageLoading(true);
      }

      try {
        const imageCacheKey = `location_image_${locationName}`;
        const cachedImageUrl = getCachedData<string>(imageCacheKey);
        if (cachedImageUrl) {
          if (isMountedRef.current) {
            setLocationImageUrl((prev) =>
              prev === cachedImageUrl ? prev : cachedImageUrl,
            );
          }
          return nextLocation;
        }

        const locations = await getLocationsData(database);
        const entry = locations?.find((l) => l?.name === locationName) ?? null;

        if (entry?.image) {
          const url = await getDownloadURL(
            storageRef(getStorage(app), entry.image),
          );
          setCacheData(imageCacheKey, url, 3_600_000);
          if (isMountedRef.current) {
            setLocationImageUrl((prev) => (prev === url ? prev : url));
          }
        } else if (isMountedRef.current) {
          setLocationImageUrl(null);
        }
      } catch {
        if (isMountedRef.current) setLocationImageUrl(null);
      } finally {
        if (isMountedRef.current) setLocationImageLoading(false);
      }

      return nextLocation;
    },
    [sessionUserId],
  );

  // ── Hydrate cache on mount ────────────────────────────────────────────────

  useEffect(() => {
    let isMounted = true;
    async function hydrateLatestFromStorage() {
      const [cachedDirasakan, cachedTerdeteksi, cachedTsunami] =
        await Promise.all([
          getPersistentCache<DirasakanQuake>(CACHE_KEYS.DIRASAKAN),
          getPersistentCache<TerdeteksiQuake>(CACHE_KEYS.TERDETEKSI),
          getPersistentCache<TsunamiQuake>(CACHE_KEYS.TSUNAMI),
        ]);
      if (!isMounted) return;
      if (!dirasakanData && cachedDirasakan) setDirasakanData(cachedDirasakan);
      if (!terdeteksiData && cachedTerdeteksi)
        setTerdeteksiData(cachedTerdeteksi);
      if (!tsunamiData && cachedTsunami) setTsunamiData(cachedTsunami);
    }
    hydrateLatestFromStorage();
    return () => {
      isMounted = false;
    };
  }, []);

  // ── User data + location image ────────────────────────────────────────────

  useEffect(() => {
    applyHomeUserData(session.profile, session.location).catch(() => {
      if (isMountedRef.current) setLocationImageLoading(false);
    });
  }, [applyHomeUserData, session.location, session.profile]);

  useEffect(() => {
    setCurrentDate(new Date());
    const id = setInterval(() => setCurrentDate(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const fetchLatestHomeCards = useCallback(
    async (
      location: UserLocation = userLocationRef.current,
      signal?: AbortSignal,
    ) => {
      async function fetchDirasakan() {
      // FIX (Security): cek URL sebelum fetch, bukan pakai `!` assertion
      if (!DIRASAKAN_API_URL) return;

      const res = await fetch(withCacheBuster(DIRASAKAN_API_URL), { signal });
      // FIX (Bug): cek response.ok sebelum parse — sebelumnya langsung .text()
      if (!res.ok) throw new Error(`dirasakan fetch failed: ${res.status}`);

      const raw = await res.text();
      let latest: unknown = null;

      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const info = parsed?.info;
        latest = Array.isArray(info) ? info[0] : info;
      } catch {
        const parsed = xmlParser.parse(raw) as Record<string, unknown>;
        const info = (parsed?.alert as Record<string, unknown>)?.info;
        latest = Array.isArray(info) ? info[0] : info;
      }

      if (!latest || signal?.aborted || !isMountedRef.current) return;

      // FIX (Security): pakai helper sanitasi, bukan akses `any` langsung
      const p = parseDirasakanPayload(latest);
      if (!p) return;

      const [lonStr, latStr] = p.coordStr.split(",");
      const latitude = parseFloat(latStr);
      const longitude = parseFloat(lonStr);
      if (isNaN(latitude) || isNaN(longitude)) return;

      const { latitude: uLat, longitude: uLon } = location;
      const latCoord = formatCoord(latitude);
      const lonCoord = formatCoord(longitude);

      const data: DirasakanQuake = {
        distanceKm: haversineDistanceKm(
          uLat,
          uLon,
          latitude,
          longitude,
        ).toFixed(1),
        magnitude: p.magnitude,
        kedalaman: p.kedalaman,
        latText: `${latCoord.text}°${latCoord.latLabel}`,
        lonText: `${lonCoord.text}°${lonCoord.lonLabel}`,
        wilayah: p.wilayah,
        tanggal: p.tanggal,
        jam: p.jam,
        felt: p.felt,
        description: p.description,
        latitude,
        longitude,
      };

      setCacheData(CACHE_KEYS.DIRASAKAN, data);
      if (isMountedRef.current && !signal?.aborted) {
        // FIX (Bug): cek apakah data benar-benar baru sebelum setState
        // Cegah re-render dan re-mount EarthquakeMap saat data sama
        setDirasakanData((prev) =>
          prev?.tanggal === data.tanggal &&
          prev?.jam === data.jam &&
          prev?.distanceKm === data.distanceKm
            ? prev
            : data,
        );
        setDirasakanShakeMapUrl(
          p.shakemap ? buildShakemapUrl(p.shakemap) : null,
        );
      }
    }

    async function fetchTerdeteksi() {
      if (!TERDETEKSI_API_URL) return;

      const res = await fetch(withCacheBuster(TERDETEKSI_API_URL), { signal });
      // FIX (Bug): cek response.ok
      if (!res.ok) throw new Error(`terdeteksi fetch failed: ${res.status}`);

      const body = (await res.json()) as { features?: unknown[] };
      const features = body?.features;
      if (
        !Array.isArray(features) ||
        features.length === 0 ||
        signal?.aborted ||
        !isMountedRef.current
      )
        return;

      const latest = [...features].sort((a, b) => {
        const aTime = String(
          (a as Record<string, unknown>)?.properties
            ? ((
                (a as Record<string, unknown>).properties as Record<
                  string,
                  unknown
                >
              )?.time ?? "")
            : "",
        );
        const bTime = String(
          (b as Record<string, unknown>)?.properties
            ? ((
                (b as Record<string, unknown>).properties as Record<
                  string,
                  unknown
                >
              )?.time ?? "")
            : "",
        );
        return bTime.localeCompare(aTime);
      })[0];

      // FIX (Security): pakai helper sanitasi
      const parsed = parseTerdeteksiPayload(latest);
      if (!parsed) return;

      const { latitude: uLat, longitude: uLon } = location;
      const latCoord = formatCoord(parsed.latitude);
      const lonCoord = formatCoord(parsed.longitude);

      const data: TerdeteksiQuake = {
        distanceKm: haversineDistanceKm(
          uLat,
          uLon,
          parsed.latitude,
          parsed.longitude,
        ).toFixed(1),
        magnitude: parsed.magnitude,
        kedalaman: parsed.kedalaman,
        latText: `${latCoord.text}°${latCoord.latLabel}`,
        lonText: `${lonCoord.text}°${lonCoord.lonLabel}`,
        wilayah: parsed.wilayah,
        tanggal: parsed.tanggal,
        jam: parsed.jam,
        fase: parsed.fase,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
      };

      setCacheData(CACHE_KEYS.TERDETEKSI, data);
      // FIX (Bug): cek apakah data benar-benar baru
      if (isMountedRef.current && !signal?.aborted) {
        setTerdeteksiData((prev) =>
          prev?.tanggal === data.tanggal &&
          prev?.jam === data.jam &&
          prev?.distanceKm === data.distanceKm
            ? prev
            : data,
        );
      }
    }

    async function fetchTsunami() {
      if (!TSUNAMI_API_URL) return;

      const res = await fetch(withCacheBuster(TSUNAMI_API_URL), { signal });
      if (!res.ok) throw new Error(`tsunami fetch failed: ${res.status}`);

      const raw = await res.text();
      const parsed = xmlParser.parse(raw) as Record<string, unknown>;
      const latest = getLatestTsunamiInfo(getTsunamiInfoItems(parsed));
      if (!latest || signal?.aborted || !isMountedRef.current) return;

      const data = parseTsunamiPayload(latest);
      if (!data) return;

      setCacheData(CACHE_KEYS.TSUNAMI, data);
      if (isMountedRef.current && !signal?.aborted) {
        setTsunamiData((prev) =>
          prev?.tanggal === data.tanggal &&
          prev?.jam === data.jam &&
          prev?.subject === data.subject
            ? prev
            : data,
        );
      }
    }

      await Promise.all([fetchDirasakan(), fetchTerdeteksi(), fetchTsunami()]);

    },
    [],
  );

  // ── Scroll handler ────────────────────────────────────────────────────────

  useEffect(() => {
    const abort = new AbortController();

    async function fetchAll() {
      try {
        await fetchLatestHomeCards(userLocationRef.current, abort.signal);
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") {
          showNetworkError();
        }
      }
    }

    fetchAll();
    const INTERVAL_FOREGROUND = 30_000;
    const interval = setInterval(fetchAll, INTERVAL_FOREGROUND);

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
      clearInterval(interval);
      appStateSub.remove();
      abort.abort();
    };
  }, [fetchLatestHomeCards, showNetworkError]);

  const handleRefresh = useCallback(async () => {
    if (refreshInFlightRef.current) return;

    refreshInFlightRef.current = true;
    setRefreshing(true);

    try {
      const app = getApp();
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      let locationForCards = userLocationRef.current;

      if (currentUser) {
        const next = await fetchUserSessionData(currentUser);
        session.setProfile(next.profile);
        session.setLocation(next.location);

        const appliedLocation = await applyHomeUserData(
          next.profile,
          next.location,
          { showImageLoading: false },
        );
        if (appliedLocation) locationForCards = appliedLocation;
      } else {
        const appliedLocation = await applyHomeUserData(
          session.profile,
          session.location,
          { showImageLoading: false },
        );
        if (appliedLocation) locationForCards = appliedLocation;
      }

      await fetchLatestHomeCards(locationForCards);
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        showNetworkError();
      }
    } finally {
      refreshInFlightRef.current = false;
      if (isMountedRef.current) setRefreshing(false);
    }
  }, [applyHomeUserData, fetchLatestHomeCards, session, showNetworkError]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(
        event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
      );
      setActiveTab((prev) => (prev !== index ? index : prev));
    },
    [],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <PullToRefresh refreshing={refreshing} onRefresh={handleRefresh}>
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
                  onShakeMap={() => {
                    setActiveShakeMapUrl(dirasakanShakeMapUrl);
                    setShakeMapVisible(true);
                  }}
                  hasShakeMap={!!dirasakanShakeMapUrl}
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

            {/* Tsunami */}
            <View style={{ width: SCREEN_WIDTH }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Informasi Tsunami Terakhir
                </Text>
                <TouchableOpacity onPress={() => setInfoVisibleTsunami(true)}>
                  <Ionicons
                    name="information-circle-outline"
                    size={25}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
              <TsunamiCard
                data={tsunamiData}
                onShakeMap={() => {
                  setActiveShakeMapUrl(tsunamiData?.shakemap ?? null);
                  setShakeMapVisible(true);
                }}
                hasShakeMap={!!tsunamiData?.shakemap}
                onShare={handleShareTsunami}
                onCardPress={() =>
                  router.push({
                    pathname: "/main-menu/earthquake",
                    params: { tab: "TSUNAMI" },
                  })
                }
              />
            </View>
          </ScrollView>

          <View style={styles.paginationContainer}>
            {[0, 1, 2].map((i) => (
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
      </PullToRefresh>

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
      <InfoModal
        visible={infoVisibleTsunami}
        onClose={() => setInfoVisibleTsunami(false)}
        title="Peringatan Tsunami Terakhir"
        desc="Menampilkan informasi peringatan dini tsunami terbaru dari BMKG."
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
        imageUrl={activeShakeMapUrl}
        onClose={() => setShakeMapVisible(false)}
      />
    </View>
  );
}
