import GpsButton from "@/components/ui/gps-button";
import CustomAlert from "@/components/ui/custom-alert";
import LocationSearchModal from "@/components/ui/location-search-modal";
import { findNearestLocation, GeoLocation } from "@/utils/geo";
import { EvilIcons, Ionicons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { getDatabase, ref, update } from "@react-native-firebase/database";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import ProfilePageLayout from "../components/profile-page-layout";
import { goBackToAccount } from "../navigation";
import { useProfileContext } from "../profile-context";
import { styles } from "./styles/ubah-lokasi-styles";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppLocation extends GeoLocation {
  id: string;
  name: string;
  desc: string;
}

interface AlertConfig {
  visible: boolean;
  title: string;
  message: string;
  type: "error" | "success";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GPS_TIMEOUT_MS = 6_000;

const ALERT_HIDDEN: AlertConfig = {
  visible: false,
  title: "",
  message: "",
  type: "error",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildLocationLabel(name: string, desc: string): string {
  return desc ? `${name}, ${desc}` : name;
}

async function fetchLocationsFromDB(): Promise<AppLocation[]> {
  const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
  if (!dbUrl) throw new Error("Database URL not configured");

  const res = await fetch(`${dbUrl}/locations.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();

  return Object.entries(data || {}).map(([id, loc]: [string, any]) => ({
    id,
    name: loc.name ?? "",
    desc: loc.alt_name ?? loc.name ?? "",
    latitude: loc.latitude,
    longitude: loc.longitude,
  }));
}

async function saveLocationToFirebase(
  uid: string,
  item: AppLocation & { gpsLatitude?: number; gpsLongitude?: number },
): Promise<void> {
  const app = getApp();
  const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
  const db = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);

  // Gunakan koordinat GPS asli jika ada, fallback ke koordinat item
  const latitude = item.gpsLatitude ?? item.latitude;
  const longitude = item.gpsLongitude ?? item.longitude;

  await update(ref(db, `users/${uid}`), {
    latitude: latitude?.toFixed(6) ?? latitude,
    longitude: longitude?.toFixed(6) ?? longitude,
    locationName: item.name,
    locationUpdatedAt: new Date().toISOString(),
  });
}

// ─── Komponen utama ───────────────────────────────────────────────────────────

export default function UbahLokasi() {
  const router = useRouter();
  const { profile, setProfile } = useProfileContext();

  // ── State ──────────────────────────────────────────────────────────────────
  const [allLocations, setAllLocations] = useState<AppLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  // selectedItem menyimpan lokasi yang dipilih (manual atau GPS).
  // Bila dari GPS, field gpsLatitude/gpsLongitude berisi koordinat aktual.
  const [selectedItem, setSelectedItem] = useState<
    (AppLocation & { gpsLatitude?: number; gpsLongitude?: number }) | null
  >(null);

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMessage, setGpsMessage] = useState("Memperbarui Lokasi...");

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>(ALERT_HIDDEN);

  const locationsCache = useRef<AppLocation[]>([]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedLabel = selectedItem
    ? buildLocationLabel(selectedItem.name, selectedItem.desc)
    : "";

  const filteredLocations = allLocations.filter(
    ({ name, desc }) =>
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      desc.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // ── Alert helper ───────────────────────────────────────────────────────────
  const showAlert = useCallback(
    (title: string, message: string, type: AlertConfig["type"] = "error") => {
      setAlertConfig({ visible: true, title, message, type });
    },
    [],
  );

  const hideAlert = useCallback(() => {
    setAlertConfig(ALERT_HIDDEN);
  }, []);

  // ── Navigasi sukses ────────────────────────────────────────────────────────
  const navigateToAccount = useCallback(() => {
    setShowSuccessModal(false);
    router.replace("/main-menu/account");
  }, [router]);

  // ── Fetch lokasi dari Firebase ─────────────────────────────────────────────
  useEffect(() => {
    if (locationsCache.current.length > 0) {
      setAllLocations(locationsCache.current);
      setLocationsLoading(false);
      return;
    }

    (async () => {
      try {
        const locations = await fetchLocationsFromDB();
        locationsCache.current = locations;
        setAllLocations(locations);
      } catch {
        setAllLocations([]);
      } finally {
        setLocationsLoading(false);
      }
    })();
  }, []);

  // ── Handler: pilih lokasi dari daftar ─────────────────────────────────────
  const handleSelect = useCallback((item: AppLocation) => {
    setSelectedItem(item); // koordinat langsung dari database, tidak perlu GPS fields
    setLocationModalVisible(false);
    setSearchQuery("");
  }, []);

  // ── Handler: gunakan GPS ───────────────────────────────────────────────────
  const handleUseGPS = async () => {
    setGpsLoading(true);
    setGpsMessage("Meminta izin akses lokasi...");

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showAlert("Permission Ditolak", "Aktifkan izin lokasi di pengaturan.");
        return;
      }

      setGpsMessage("Sedang memperbarui lokasi...");

      const loc = await Promise.race<Location.LocationObject>([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("GPS timeout")), GPS_TIMEOUT_MS),
        ),
      ]);

      const { latitude, longitude } = loc.coords;
      const nearest = findNearestLocation(latitude, longitude, allLocations);

      // ✅ FIX: Selalu simpan koordinat GPS asli ke gpsLatitude/gpsLongitude.
      // Nama lokasi ditampilkan dari nearest (lebih user-friendly), tapi
      // koordinat yang masuk ke Firebase adalah titik GPS pengguna, bukan
      // centroid dari nearest location.
      setSelectedItem({
        id: nearest?.id ?? "",
        name: nearest?.name ?? "Lokasi GPS",
        desc: nearest?.desc ?? "",
        latitude: nearest?.latitude ?? latitude,  // koordinat nearest (metadata)
        longitude: nearest?.longitude ?? longitude,
        gpsLatitude: latitude,                    // koordinat GPS aktual → disimpan ke Firebase
        gpsLongitude: longitude,
      });
    } catch (err: any) {
      if (err?.message === "GPS timeout") {
        showAlert(
          "GPS Lambat",
          "Sinyal GPS tidak tersedia. Coba lagi di area terbuka.",
        );
      } else {
        showAlert("Error", "Tidak dapat mengakses GPS.");
      }
    } finally {
      setGpsLoading(false);
    }
  };

  // ── Handler: simpan ke Firebase ────────────────────────────────────────────
  const handleSimpan = async () => {
    if (!selectedItem) {
      showAlert("Error", "Silakan pilih lokasi terlebih dahulu.");
      return;
    }

    try {
      const app = getApp();
      const user = getAuth(app).currentUser;

      if (user) {
        await saveLocationToFirebase(user.uid, selectedItem);
      }
    } catch {
      showAlert("Error", "Gagal menyimpan lokasi ke database.");
      return;
    }

    setProfile((prev) => ({ ...prev, location: selectedItem.name }));
    setShowSuccessModal(true);

    setTimeout(navigateToAccount, 1_500);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
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

          {/* ── Pencarian manual ── */}
          <View style={styles.inputArea}>
            <Text style={styles.label}>Cari Lokasi</Text>
            <TouchableOpacity
              style={styles.customInput}
              onPress={() => setLocationModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.inputText, !selectedLabel && { color: "#999" }]}
                numberOfLines={1}
              >
                {selectedLabel || "Cari Kelurahan atau Desa..."}
              </Text>
              <EvilIcons name="chevron-down" size={24} color="#1E6F9F" />
            </TouchableOpacity>
          </View>

          <Text style={styles.orText}>Atau</Text>

          {/* ── GPS ── */}
          <View style={styles.gpsWrapper}>
            <GpsButton
              text="Pakai GPS"
              loadingText={gpsMessage}
              loading={gpsLoading}
              onPress={handleUseGPS}
              disabled={gpsLoading || locationsLoading}
              style={styles.btnGPS}
              loadingStyle={styles.btnGPSLoading}
              textStyle={styles.btnTextGPS}
            />
          </View>

          {/* ── Aksi ── */}
          <View style={styles.buttonWrapper}>
            <TouchableOpacity
              style={styles.btnBatal}
              onPress={() => goBackToAccount(router)}
            >
              <Text style={styles.btnTextBatal}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSimpan} onPress={handleSimpan}>
              <Text style={styles.btnTextSimpan}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ProfilePageLayout>

      {/* ── Modal pencarian lokasi ── */}
      <LocationSearchModal
        visible={locationModalVisible}
        query={searchQuery}
        locations={filteredLocations}
        onClose={() => setLocationModalVisible(false)}
        onChangeQuery={setSearchQuery}
        onSelect={handleSelect}
      />

      {/* ── Modal sukses ── */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={navigateToAccount}>
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
              onPress={navigateToAccount}
            >
              <Text style={styles.infoButtonText}>Mengerti</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ── Custom alert ── */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={hideAlert}
      />
    </>
  );
}