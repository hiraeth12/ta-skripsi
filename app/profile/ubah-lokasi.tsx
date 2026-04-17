import {
  EvilIcons,
  Ionicons,
  MaterialCommunityIcons,
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
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Helper function to calculate haversine distance
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

// Helper function to find nearest location
function findNearestLocation(
  gpsLat: number,
  gpsLon: number,
  locations: any[],
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedLocationItem, setSelectedLocationItem] = useState<any>(null);
  const [allLocations, setAllLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);

  const profile = {
    name: "Fasya Burhanis syauqi",
    email: "fasyaburhaniss@gmail.com",
    location: "Bandung",
    phone: "081-3983-8389",
    initials: "FBS",
  };

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
      } catch (error) {
        console.error("Error fetching locations:", error);
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

      // Find nearest location from database
      const nearestLocation = findNearestLocation(latitude, longitude, allLocations);
      const locationName = nearestLocation?.name || "Lokasi GPS";

      // Update user location in database with GPS coordinates
      try {
        const app = getApp();
        const authInstance = getAuth(app);
        const currentUser = authInstance.currentUser;

        if (currentUser) {
          const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
          const database = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);

          await update(ref(database, `users/${currentUser.uid}`), {
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6),
            locationName: locationName,
            locationUpdatedAt: new Date().toISOString(),
          });
          console.log("User location updated (GPS):", { latitude, longitude, locationName });
          setSelectedLocation(locationName);
          setSelectedLocationItem({ name: locationName, latitude, longitude });
        }
      } catch (dbError) {
        console.error("Error updating user location:", dbError);
        Alert.alert("Error", "Gagal menyimpan lokasi ke database");
      }
    } catch (error) {
      console.error("GPS Error:", error);
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
        console.log("User location updated (manual select):", { 
          latitude: selectedLocationItem.latitude, 
          longitude: selectedLocationItem.longitude, 
          locationName: selectedLocationItem.name 
        });
      }
    } catch (dbError) {
      console.error("Error updating user location:", dbError);
      Alert.alert("Error", "Gagal menyimpan lokasi ke database");
      return;
    }

    setShowSuccessModal(true);
  };

  return (
    <View style={styles.container}>
      {/* HEADER PROFIL */}
      <View style={styles.headerSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{profile.initials}</Text>
          <TouchableOpacity style={styles.editBadge}>
            <MaterialCommunityIcons name="camera" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{profile.name}</Text>
        <Text style={styles.userDetails}>{profile.email}</Text>
        <Text style={styles.userDetails}>{profile.location}</Text>
        <Text style={styles.userDetails}>{profile.phone}</Text>
      </View>

      {/* AREA BIRU */}
      <View style={styles.menuContainer}>
        <View style={styles.menuContent}>
          <View style={styles.titleRow}>
            <Text style={styles.sectionTitle}>Ubah Lokasi</Text>
          </View>

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
        </View>
      </View>

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
          onPress={() => setShowSuccessModal(false)}
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
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.infoButtonText}>Mengerti</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  headerSection: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#fff",
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#D81B60",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    position: "relative",
  },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#1E6F9F",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "bold" },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 5,
  },
  userDetails: { fontSize: 14, color: "#555", marginBottom: 2 },

  menuContainer: {
    flex: 1,
    backgroundColor: "#0C4A6E",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  menuContent: { paddingHorizontal: 20, paddingTop: 20, flex: 1 },
  titleRow: { marginBottom: 15 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },

  inputCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  description: {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 14,
    color: "#333",
    marginBottom: 25,
    lineHeight: 20,
  },
  inputArea: { marginBottom: 15 },
  label: { fontSize: 16, fontWeight: "bold", color: "#000", marginBottom: 10 },
  customInput: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    paddingVertical: 8,
  },
  inputText: { flex: 1, fontSize: 14, color: "#333" },
  orText: {
    textAlign: "center",
    marginVertical: 10,
    fontWeight: "bold",
    color: "#000",
  },

  // PERBAIKAN TOMBOL GPS
  gpsWrapper: { alignItems: "center", marginBottom: 25 },
  btnGPS: {
    backgroundColor: "#0870A5",
    paddingVertical: 10,
    paddingHorizontal: 40, // Memberi jarak agar tombol tidak kepanjangan
    borderRadius: 8,
    alignItems: "center",
  },
  btnTextGPS: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  buttonWrapper: { flexDirection: "row", justifyContent: "space-between" },
  btnBatal: {
    flex: 1,
    marginRight: 10,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D1D1",
    alignItems: "center",
  },
  btnSimpan: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#1E6F9F",
    alignItems: "center",
  },
  btnTextBatal: { color: "#999", fontWeight: "bold" },
  btnTextSimpan: { color: "#fff", fontWeight: "bold" },

  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  bottomSheetContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    height: "85%",
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: "#EEE",
    borderRadius: 10,
    alignSelf: "center",
    marginBottom: 15,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    marginBottom: 20,
  },
  modalInput: { flex: 1, padding: 12, fontSize: 15 },
  locListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F9F9F9",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F4F8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  locName: { fontSize: 16, fontWeight: "bold", color: "#333" },
  locDesc: { fontSize: 12, color: "#888", marginTop: 2 },

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
});
