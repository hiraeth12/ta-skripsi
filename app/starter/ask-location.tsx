import AuthButton from "@/components/auth-button";
import { EvilIcons, Ionicons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { getDatabase, ref, update } from "@react-native-firebase/database";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
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

export default function AskLocation() {
  const [query, setQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [allLocations, setAllLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const router = useRouter();

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
        }
      } catch (dbError) {
        console.error("Error updating user location:", dbError);
        // Don't block navigation if DB update fails
      }

      // Navigate to home
      await new Promise((resolve) => {
        setTimeout(() => {
          router.push("/main-menu/home");
          resolve(null);
        }, 500);
      });
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

  const filteredLocations = allLocations.filter(
    (item) =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.desc.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = async (item: any) => {
    setSelectedLocation(`${item.name}, ${item.desc}`);

    // Update user location in database with selected location coordinates
    try {
      const app = getApp();
      const authInstance = getAuth(app);
      const currentUser = authInstance.currentUser;

      if (currentUser) {
        const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
        const database = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);

        await update(ref(database, `users/${currentUser.uid}`), {
          latitude: item.latitude.toFixed(6),
          longitude: item.longitude.toFixed(6),
          locationName: item.name,
          locationUpdatedAt: new Date().toISOString(),
        });
        console.log("User location updated (manual select):", { latitude: item.latitude, longitude: item.longitude, locationName: item.name });
      }
    } catch (dbError) {
      console.error("Error updating user location:", dbError);
    }

    setModalVisible(false);
    setQuery("");

    // Navigate to home after location is saved
    await new Promise((resolve) => {
      setTimeout(() => {
        router.push("/main-menu/home");
        resolve(null);
      }, 500);
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
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

        <View style={styles.inputArea}>
          <TouchableOpacity
            style={styles.customInput}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
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
              {selectedLocation || "Cari Kelurahan atau Desa..."}
            </Text>
            <EvilIcons name="search" size={24} color="#1E6F9F" />
          </TouchableOpacity>
        </View>

        <Text style={styles.orText}>Atau deteksi otomatis</Text>

        <View style={styles.buttonWrapper}>
          <AuthButton
            title={gpsLoading ? "Mencari lokasi..." : "Gunakan GPS"}
            onPress={handleUseGPS}
            disabled={gpsLoading}
          />
          {gpsLoading && <ActivityIndicator size="small" color="#1E6F9F" style={{ marginTop: 10 }} />}
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.bottomSheetOverlay}>
            <View style={styles.bottomSheetContent}>
              <View style={styles.handleBar} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Pilih Lokasi</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
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
                    style={styles.locationCard}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EDEDED" },
  scrollContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100%",
  },
  logo: { width: 160, height: 50, marginBottom: 30, marginTop: 20 },
  image: { width: 220, height: 220, marginBottom: 20 },
  description: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    color: "#333",
  },
  inputArea: { width: "100%" },
  customInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#DDD",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inputText: { flex: 1, fontSize: 14, color: "#000" },
  orText: {
    textAlign: "center",
    marginVertical: 20,
    color: "#777",
    fontSize: 14,
  },
  buttonWrapper: { width: "100%", alignItems: "center" },

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
  locationCard: {
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
});
