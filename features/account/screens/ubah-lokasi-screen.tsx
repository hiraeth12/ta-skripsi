import GpsButton from "@/components/ui/gps-button";
import CustomAlert from "@/components/ui/custom-alert";
import LocationSearchModal from "@/components/ui/location-search-modal";
import { useHaversine } from "@/hooks/use-haversine";
import { EvilIcons, Ionicons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { getDatabase, ref, update } from "@react-native-firebase/database";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ProfilePageLayout from "../components/profile-page-layout";
import { useProfileContext } from "../profile-context";
import { styles } from "./styles/ubah-lokasi-styles";


const BBOX_DEG = 0.45;
const GPS_TIMEOUT_MS = 6000;
function findNearestLocation(
  gpsLat: number,
  gpsLon: number,
  locations: any[],
  haversineDistanceKm: (a: number, b: number, c: number, d: number) => number,
): any | null {
  if (!locations.length) return null;

  // Tahap 1: bounding-box pre-filter
  const candidates = locations.filter(
    (loc) =>
      Math.abs(loc.latitude - gpsLat) < BBOX_DEG &&
      Math.abs(loc.longitude - gpsLon) < BBOX_DEG,
  );

  // Fallback jika kosong (GPS di luar area data)
  const pool = candidates.length > 0 ? candidates : locations;

  // Tahap 2: Haversine hanya pada pool
  return pool.reduce(
    (nearest, loc) => {
      const d = haversineDistanceKm(
        gpsLat,
        gpsLon,
        loc.latitude,
        loc.longitude,
      );
      return d < nearest.dist ? { loc, dist: d } : nearest;
    },
    {
      loc: pool[0],
      dist: haversineDistanceKm(
        gpsLat,
        gpsLon,
        pool[0].latitude,
        pool[0].longitude,
      ),
    },
  ).loc;
}

// ─── Komponen utama ──────────────────────────────────────────────────────────
export default function UbahLokasi() {
  const router = useRouter();
  const { haversineDistanceKm } = useHaversine();
  const { profile, setProfile } = useProfileContext();

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedLocationItem, setSelectedLocationItem] = useState<any>(null);
  const [allLocations, setAllLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMessage, setGpsMessage] = useState("Memperbarui Lokasi ...");
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
    setModalConfig({ visible: true, title, message, type });
  };


  const locationsCache = useRef<any[]>([]);

  // ── Perbaikan 1 & 2: useEffect + cache ref ─────────────────────────────
  useEffect(() => {
    // Jika cache sudah ada, langsung pakai — tidak perlu fetch ulang
    if (locationsCache.current.length > 0) {
      setAllLocations(locationsCache.current);
      setLoading(false);
      return;
    }

    const fetchLocations = async () => {
      try {
        const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
        if (!dbUrl) throw new Error("Database URL not configured");

        const res = await fetch(`${dbUrl}/locations.json`);
        if (!res.ok) throw new Error(`Failed: ${res.status}`);

        const data = await res.json();
        const mapped = Object.entries(data || {}).map(
          ([id, loc]: any) => ({
            id,
            name: loc.name || "",
            desc: loc.alt_name || loc.name || "",
            latitude: loc.latitude,
            longitude: loc.longitude,
          }),
        );

        locationsCache.current = mapped; // simpan ke cache
        setAllLocations(mapped);
      } catch {
        setAllLocations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []); // ← dependency array kosong: hanya jalan sekali saat mount

  // ── Filter pencarian ────────────────────────────────────────────────────
  const filteredLocations = allLocations.filter(
    (item) =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.desc.toLowerCase().includes(query.toLowerCase()),
  );

  // ── Pilih dari daftar ───────────────────────────────────────────────────
  const handleSelect = (item: any) => {
    setSelectedLocation(`${item.name}, ${item.desc}`);
    setSelectedLocationItem(item);
    setLocationModalVisible(false);
    setQuery("");
  };

  // ── Perbaikan 3: GPS cepat dengan Accuracy.Lowest + timeout race ────────
  const handleUseGPS = async () => {
    setGpsLoading(true);
    setGpsMessage("Meminta izin akses lokasi...");

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showCustomAlert(
          "Permission Ditolak",
          "Aktifkan izin lokasi di pengaturan.",
          "error",
        );
        return;
      }

      setGpsMessage("Sedang memperbarui lokasi...");

      // Promise.race: ambil GPS atau lempar error jika melebihi GPS_TIMEOUT_MS
      const loc = await Promise.race<Location.LocationObject>([
        Location.getCurrentPositionAsync({
          // Lowest: tidak menunggu satelit presisi tinggi.
          // Cukup untuk mencocokkan ke lokasi terdekat di list.
          accuracy: Location.Accuracy.Lowest,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("GPS timeout")),
            GPS_TIMEOUT_MS,
          ),
        ),
      ]);

      const { latitude, longitude } = loc.coords;

      // Perbaikan 4: bounding-box filter di dalam findNearestLocation
      const nearest = findNearestLocation(
        latitude,
        longitude,
        allLocations,
        haversineDistanceKm,
      );

      const name = nearest?.name ?? "Lokasi GPS";
      const desc = nearest?.desc ?? "";
      setSelectedLocation(desc ? `${name}, ${desc}` : name);
      setSelectedLocationItem({ name, latitude, longitude });
    } catch (err: any) {
      if (err?.message === "GPS timeout") {
        showCustomAlert(
          "GPS Lambat",
          "Sinyal GPS tidak tersedia. Coba lagi di area terbuka.",
          "error",
        );
      } else {
        showCustomAlert("Error", "Tidak dapat mengakses GPS.", "error");
      }
    } finally {
      setGpsLoading(false);
    }
  };

  // ── Simpan ke Firebase ──────────────────────────────────────────────────
  const handleSimpan = async () => {
    if (!selectedLocationItem) {
      showCustomAlert("Error", "Silakan pilih lokasi terlebih dahulu", "error");
      return;
    }

    try {
      const app = getApp();
      const auth = getAuth(app);
      const user = auth.currentUser;

      if (user) {
        const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
        const db = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);

        await update(ref(db, `users/${user.uid}`), {
          latitude:
            selectedLocationItem.latitude?.toFixed(6) ??
            selectedLocationItem.latitude,
          longitude:
            selectedLocationItem.longitude?.toFixed(6) ??
            selectedLocationItem.longitude,
          locationName: selectedLocationItem.name,
          locationUpdatedAt: new Date().toISOString(),
        });
      }
    } catch {
      showCustomAlert("Error", "Gagal menyimpan lokasi ke database", "error");
      return;
    }

    // Optimistic update: langsung perbarui context tanpa menunggu re-fetch
    setProfile((prev) => ({ ...prev, location: selectedLocationItem.name }));

    setShowSuccessModal(true);
    setTimeout(() => {
      setShowSuccessModal(false);
      router.replace("/main-menu/account");
    }, 1500);
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <ProfilePageLayout
        title="Ubah Lokasi"
        headerName={profile.name}
        headerEmail={profile.email}
        headerLocation={profile.location}
        headerInitials={profile.initials}
      >
        <View style={styles.inputCard}>
          <Text style={styles.description}>
            Silahkan Pilih Lokasi Anda atau Menggunakan Mode GPS
          </Text>

          <View style={styles.inputArea}>
            <Text style={styles.label}>Cari Lokasi</Text>
            <TouchableOpacity
              style={styles.customInput}
              onPress={() => setLocationModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.inputText,
                  !selectedLocation && { color: "#999" },
                ]}
                numberOfLines={1}
              >
                {selectedLocation || "Cari Kelurahan atau Desa..."}
              </Text>
              <EvilIcons name="chevron-down" size={24} color="#1E6F9F" />
            </TouchableOpacity>
          </View>

          <Text style={styles.orText}>Atau</Text>

          <View style={styles.gpsWrapper}>
            <GpsButton
              text="Pakai GPS"
              loadingText={gpsMessage}
              loading={gpsLoading}
              onPress={handleUseGPS}
              disabled={gpsLoading || loading} // ← disable juga saat data belum siap
              style={styles.btnGPS}
              loadingStyle={styles.btnGPSLoading}
              textStyle={styles.btnTextGPS}
            />
          </View>

          <View style={styles.buttonWrapper}>
            <TouchableOpacity
              style={styles.btnBatal}
              onPress={() => router.back()}
            >
              <Text style={styles.btnTextBatal}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSimpan} onPress={handleSimpan}>
              <Text style={styles.btnTextSimpan}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ProfilePageLayout>

      <LocationSearchModal
        visible={locationModalVisible}
        query={query}
        locations={filteredLocations}
        onClose={() => setLocationModalVisible(false)}
        onChangeQuery={setQuery}
        onSelect={handleSelect}
      />

      {/* Modal berhasil */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setShowSuccessModal(false);
            router.replace("/main-menu/account");
          }}
        >
          <View style={styles.infoCard}>
            <Ionicons
              name="checkmark-circle"
              size={50}
              color="#1E6F9F"
              style={{ alignSelf: "center", marginBottom: 12 }}
            />
            <Text style={styles.infoTitle}>Berhasil</Text>
            <Text style={styles.infoDesc}>
              Lokasi Anda telah berhasil diperbarui di sistem SeismoTrack.
            </Text>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace("/main-menu/account");
              }}
            >
              <Text style={styles.infoButtonText}>Mengerti</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <CustomAlert
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={() => setModalConfig({ ...modalConfig, visible: false })}
      />
    </>
  );
}
