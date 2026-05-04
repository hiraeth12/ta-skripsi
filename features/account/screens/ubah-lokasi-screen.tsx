import { useHaversine } from "@/hooks/use-haversine";
import {
  EvilIcons,
  Ionicons,
} from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { getDatabase, ref, update } from "@react-native-firebase/database";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ProfilePageLayout from "../components/profile-page-layout";
import { ACCOUNT_PROFILE, fetchProfileFromFirebase, ProfileData } from "../data/profile";
import { styles } from "./styles/ubah-lokasi-styles";

// Helper function to find nearest location
function findNearestLocation(
  gpsLat: number,
  gpsLon: number,
  locations: any[],
  haversineDistanceKm: (lat1: number, lon1: number, lat2: number, lon2: number) => number,
) {
  if (!locations || locations.length === 0) return null;

  let nearest = locations[0];
  let minDistance = haversineDistanceKm(
    gpsLat,
    gpsLon,
    nearest.latitude,
    nearest.longitude,
  );

  for (let i = 1; i < locations.length; i++) {
    const distance = haversineDistanceKm(
      gpsLat,
      gpsLon,
      locations[i].latitude,
      locations[i].longitude,
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearest = locations[i];
    }
  }

  return nearest;
}

export default function UbahLokasi() {
  const router = useRouter();
  const { haversineDistanceKm } = useHaversine();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedLocationItem, setSelectedLocationItem] = useState<any>(null);
  const [allLocations, setAllLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData>(ACCOUNT_PROFILE);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Fetch profile from Firebase on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const firebaseProfile = await fetchProfileFromFirebase();
        setProfile(firebaseProfile);
      } catch {
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
        if (!dbUrl) throw new Error("Database URL not configured");

        const response = await fetch(`${dbUrl}/locations.json`);
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

        const data = await response.json();
        // Convert object keyed by id to array
        const locationsArray = Object.entries(data || {}).map(([id, location]: any) => ({
          id,
          name: location.name || "",
          desc: location.alt_name || location.name || "",
          latitude: location.latitude,
          longitude: location.longitude,
        }));
        setAllLocations(locationsArray);
      } catch {
        setAllLocations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  const filteredLocations = allLocations.filter(
    (item) =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.desc.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = async (item: any) => {
    setSelectedLocation(`${item.name}, ${item.desc}`);
    setSelectedLocationItem(item);
    setLocationModalVisible(false);
    setQuery("");
  };

  const handleUseGPS = async () => {
    setGpsLoading(true);
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Ditolak",
          "Akses GPS diperlukan untuk melanjutkan. Silakan aktifkan izin lokasi di pengaturan aplikasi.",
        );
        setGpsLoading(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      // Use actual GPS location name directly
      const locationName = "Lokasi GPS";

      // Set the selected location without directly writing to DB here
      // so user can click "Simpan" first.
      setSelectedLocation(locationName);
      setSelectedLocationItem({ name: locationName, latitude, longitude });
    } catch {
      Alert.alert(
        "Error",
        "Tidak dapat mengakses GPS. Pastikan GPS sudah aktif dan coba lagi.",
      );
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSimpan = async () => {
    if (!selectedLocationItem) {
      Alert.alert("Error", "Silakan pilih lokasi terlebih dahulu");
      return;
    }

    try {
      const app = getApp();
      const authInstance = getAuth(app);
      const currentUser = authInstance.currentUser;

      if (currentUser) {
        const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
        const database = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);

        await update(ref(database, `users/${currentUser.uid}`), {
          latitude: selectedLocationItem.latitude?.toFixed(6) || selectedLocationItem.latitude,
          longitude: selectedLocationItem.longitude?.toFixed(6) || selectedLocationItem.longitude,
          locationName: selectedLocationItem.name,
          locationUpdatedAt: new Date().toISOString(),
        });
      }
    } catch {
      Alert.alert("Error", "Gagal menyimpan lokasi ke database");
      return;
    }

    setShowSuccessModal(true);
    setTimeout(() => {
      setShowSuccessModal(false);
      router.replace("/main-menu/account");
    }, 1500); // go back after 1.5s
  };

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

          {/* TOMBOL GPS - SUDAH DISESUAIKAN UKURANNYA */}
          <View style={styles.gpsWrapper}>
            <TouchableOpacity
              style={styles.btnGPS}
              activeOpacity={0.8}
              onPress={handleUseGPS}
              disabled={gpsLoading}
            >
              <Text style={styles.btnTextGPS}>
                {gpsLoading ? "Mengambil GPS..." : "Pakai GPS"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ACTION BUTTONS */}
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

      {/* MODAL LIST LOKASI */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={locationModalVisible}
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContent}>
            <View style={styles.handleBar} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Lokasi</Text>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#ccc" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchBarContainer}>
              <Ionicons
                name="search"
                size={18}
                color="#999"
                style={{ marginLeft: 10 }}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Ketik nama desa atau kecamatan..."
                autoFocus={true}
                value={query}
                onChangeText={setQuery}
              />
            </View>
            <FlatList
              data={filteredLocations}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.locListItem}
                  onPress={() => handleSelect(item)}
                >
                  <View style={styles.iconCircle}>
                    <Ionicons name="map-outline" size={20} color="#1E6F9F" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locName}>{item.name}</Text>
                    <Text style={styles.locDesc}>{item.desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#ccc" />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL BERHASIL */}
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
    </>
  );
}

