import CustomAlert from "@/components/ui/custom-alert";
import GpsButton from "@/components/ui/gps-button";
import LocationSearchModal from "@/components/ui/location-search-modal";
import { findNearestLocation, GeoLocation } from "@/utils/geo";
import { EvilIcons, Ionicons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { getDatabase, ref, update } from "@react-native-firebase/database";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { styles } from "../styles/ask-location-styles";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppLocation extends GeoLocation {
  id: string;
  name: string;
  desc: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FIREBASE_DATABASE_URL =
  process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL?.trim() || "";

/**
 * Batas koordinat wilayah Indonesia.
 * Digunakan untuk memvalidasi hasil GPS sebelum disimpan ke database,
 * mencegah data koordinat absurd akibat GPS error atau spoofing.
 */
const INDONESIA_BOUNDS = {
  latMin: -11.0,
  latMax: 6.0,
  lonMin: 95.0,
  lonMax: 141.0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * FIX (Security): validasi bahwa koordinat berada dalam batas wajar.
 * Mencegah penyimpanan koordinat NaN, Infinity, atau di luar Indonesia.
 */
const isValidCoordinate = (lat: number, lon: number): boolean => {
  if (!isFinite(lat) || !isFinite(lon)) return false;
  return (
    lat >= INDONESIA_BOUNDS.latMin &&
    lat <= INDONESIA_BOUNDS.latMax &&
    lon >= INDONESIA_BOUNDS.lonMin &&
    lon <= INDONESIA_BOUNDS.lonMax
  );
};

/**
 * FIX (Security): validasi & sanitasi data lokasi dari Firebase REST response.
 * Sebelumnya pakai `any` cast tanpa pengecekan — field bisa null/undefined/NaN.
 */
const parseLocation = (id: string, raw: unknown): AppLocation | null => {
  if (!raw || typeof raw !== "object") return null;

  const loc = raw as Record<string, unknown>;
  const lat = Number(loc.latitude);
  const lon = Number(loc.longitude);
  const name = typeof loc.name === "string" ? loc.name.trim() : "";

  // Buang entri tanpa nama atau koordinat tidak valid
  if (!name || !isValidCoordinate(lat, lon)) return null;

  return {
    id,
    name,
    desc:
      typeof loc.alt_name === "string" && loc.alt_name.trim()
        ? loc.alt_name.trim()
        : name,
    latitude: lat,
    longitude: lon,
  };
};

/**
 * Shared helper untuk menyimpan lokasi user ke Firebase.
 * FIX (Bug): duplikasi kode update() di handleUseGPS & handleSelect dihilangkan.
 * FIX (Security): update() error di-log, tidak lagi di-suppress diam-diam.
 */
const saveLocationToDatabase = async (
  uid: string,
  latitude: number,
  longitude: number,
  locationName: string,
): Promise<void> => {
  try {
    const app = getApp();
    const database = FIREBASE_DATABASE_URL
      ? getDatabase(app, FIREBASE_DATABASE_URL)
      : getDatabase(app);

    await update(ref(database, `users/${uid}`), {
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
      locationName,
      locationUpdatedAt: new Date().toISOString(),
    });
  } catch (err) {
    // FIX: log error agar mudah di-debug; jangan swallow diam-diam
    console.warn("[Location] Gagal menyimpan lokasi ke database:", err);
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AskLocation() {
  const [query, setQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [allLocations, setAllLocations] = useState<AppLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMessage, setGpsMessage] = useState(
    "Sedang mencari lokasi GPS Anda...",
  );
  const router = useRouter();

  // FIX (Bug): gunakan ref untuk mencegah state update setelah unmount
  // (misal user navigasi pergi saat fetch sedang berjalan)
  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "error" as "error" | "success",
  });

  const showCustomAlert = (
    title: string,
    message: string,
    type: "error" | "success" = "error",
  ) => {
    if (isMounted.current) {
      setModalConfig({ visible: true, title, message, type });
    }
  };

  // ── Fetch lokasi dari Firebase ────────────────────────────────────────────

  useEffect(() => {
    const fetchLocations = async () => {
      // FIX (Security): URL sudah di-trim dan di-validasi di konstanta atas
      if (!FIREBASE_DATABASE_URL) {
        console.error("[Location] EXPO_PUBLIC_FIREBASE_DATABASE_URL tidak dikonfigurasi.");
        if (isMounted.current) setLoading(false);
        return;
      }

      try {
        // FIX (Security): tambah timeout agar fetch tidak menggantung selamanya
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10_000);

        const response = await fetch(
          `${FIREBASE_DATABASE_URL}/locations.json`,
          { signal: controller.signal },
        );
        clearTimeout(timeoutId);

        if (!response.ok) {
          // FIX (Security): jangan ekspos HTTP status ke user;
          // log saja untuk developer
          console.warn(`[Location] Fetch gagal, status: ${response.status}`);
          throw new Error("fetch_failed");
        }

        const data: unknown = await response.json();

        // FIX (Security): validasi & sanitasi setiap entri via parseLocation()
        // — sebelumnya pakai `any` cast tanpa pengecekan apapun
        const locationsArray: AppLocation[] = Object.entries(
          (data && typeof data === "object" ? data : {}) as Record<string, unknown>,
        )
          .map(([id, raw]) => parseLocation(id, raw))
          .filter((loc): loc is AppLocation => loc !== null);

        if (isMounted.current) setAllLocations(locationsArray);
      } catch (err: unknown) {
        // FIX (Bug): catch kosong sebelumnya menelan semua error tanpa log
        if ((err as { name?: string })?.name !== "AbortError") {
          console.warn("[Location] Error fetching locations:", err);
        }
        if (isMounted.current) setAllLocations([]);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  // ── GPS handler ───────────────────────────────────────────────────────────

  const handleUseGPS = async () => {
    // FIX (Bug): guard double-tap (konsisten dengan pola di register-screen)
    if (gpsLoading) return;

    setGpsLoading(true);
    setGpsMessage("Meminta izin akses lokasi...");

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showCustomAlert(
          "Izin Ditolak",
          "Akses GPS diperlukan. Silakan aktifkan izin lokasi di pengaturan aplikasi.",
          "error",
        );
        return;
      }

      setGpsMessage("Sedang menentukan posisi Anda...");

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // FIX (Security): validasi koordinat sebelum disimpan
      if (!isValidCoordinate(latitude, longitude)) {
        showCustomAlert(
          "Lokasi Tidak Valid",
          "GPS mengembalikan koordinat di luar wilayah Indonesia. Pastikan GPS aktif dan coba lagi.",
          "error",
        );
        return;
      }

      const nearest = findNearestLocation(latitude, longitude, allLocations);
      const locationName = nearest?.name ?? "Lokasi GPS";

      const currentUser = getAuth(getApp()).currentUser;
      if (currentUser) {
        // FIX (Bug): await saveLocation — sebelumnya fire-and-forget,
        // user bisa dinavigasi sebelum data tersimpan
        await saveLocationToDatabase(currentUser.uid, latitude, longitude, locationName);
      }

      router.push("/main-menu/home");
    } catch (err) {
      console.warn("[Location] GPS error:", err);
      showCustomAlert(
        "GPS Tidak Tersedia",
        "Tidak dapat mengakses GPS. Pastikan GPS sudah aktif dan coba lagi.",
        "error",
      );
    } finally {
      if (isMounted.current) setGpsLoading(false);
    }
  };

  // ── Search filter ─────────────────────────────────────────────────────────

  const filteredLocations = allLocations.filter(
    (item) =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.desc.toLowerCase().includes(query.toLowerCase()),
  );

  // ── Manual select handler ─────────────────────────────────────────────────

  const handleSelect = async (item: AppLocation) => {
    setSelectedLocation(`${item.name}, ${item.desc}`);
    setModalVisible(false);
    setQuery("");

    const currentUser = getAuth(getApp()).currentUser;
    if (currentUser) {
      // FIX (Bug): await agar navigasi tidak mendahului penyimpanan data
      await saveLocationToDatabase(
        currentUser.uid,
        item.latitude,
        item.longitude,
        item.name,
      );
    }

    router.push("/main-menu/home");
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Image
          style={styles.logo}
          source={require("@/assets/images/SeismoTrack_2-removebg-preview.png")}
          resizeMode="contain"
        />

        <Image
          style={styles.image}
          source={require("@/assets/images/Navigation-amico (1) 1.png")}
          resizeMode="contain"
        />

        <Text style={styles.description}>Dimana lokasi Anda saat ini?</Text>

        {/* FIX (Bug): disable input saat data lokasi masih di-fetch */}
        <View style={styles.inputArea}>
          <TouchableOpacity
            style={[styles.customInput, loading && { opacity: 0.5 }]}
            onPress={() => !loading && setModalVisible(true)}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Ionicons
              name="location-sharp"
              size={20}
              color="#1E6F9F"
              style={{ marginRight: 10 }}
            />
            <Text
              style={[styles.inputText, !selectedLocation && { color: "#999" }]}
              numberOfLines={1}
            >
              {loading
                ? "Memuat daftar lokasi..."
                : selectedLocation || "Cari Kelurahan atau Desa..."}
            </Text>
            <EvilIcons name="search" size={24} color="#1E6F9F" />
          </TouchableOpacity>
        </View>

        <Text style={styles.orText}>Atau deteksi otomatis</Text>

        <View style={styles.buttonWrapper}>
          <GpsButton
            text="Gunakan GPS"
            loadingText={gpsMessage}
            loading={gpsLoading}
            onPress={handleUseGPS}
            disabled={gpsLoading}
            style={styles.gpsButton}
            loadingStyle={styles.gpsButtonLoading}
            textStyle={styles.gpsButtonText}
          />
        </View>

        <LocationSearchModal
          visible={modalVisible}
          query={query}
          locations={filteredLocations}
          onClose={() => setModalVisible(false)}
          onChangeQuery={setQuery}
          onSelect={handleSelect}
        />
      </ScrollView>

      <CustomAlert
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={() => setModalConfig((prev) => ({ ...prev, visible: false }))}
      />
    </KeyboardAvoidingView>
  );
}