import CustomAlert from "@/components/ui/custom-alert";
import { useHaversine } from "@/hooks/use-haversine";
import { EvilIcons, Ionicons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { getDatabase, ref, update } from "@react-native-firebase/database";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { styles } from "../../features/starter/styles/ask-location-styles";

// Helper function to find nearest location
function findNearestLocation(
  gpsLat: number,
  gpsLon: number,
  locations: any[],
  haversineDistanceKm: (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => number,
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
  const [gpsMessage, setGpsMessage] = useState(
    "Sedang mencari lokasi GPS Anda...",
  );
  const router = useRouter();
  const { haversineDistanceKm } = useHaversine();

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

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
        if (!dbUrl) throw new Error("Database URL not configured");

        const response = await fetch(`${dbUrl}/locations.json`);
        if (!response.ok)
          throw new Error(`Failed to fetch: ${response.status}`);

        const data = await response.json();
        const locationsArray = Object.entries(data || {}).map(
          ([id, location]: any) => ({
            id,
            name: location.name || "",
            desc: location.alt_name || location.name || "",
            latitude: location.latitude,
            longitude: location.longitude,
          }),
        );
        setAllLocations(locationsArray);
      } catch {
        setAllLocations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  const handleUseGPS = async () => {
    setGpsLoading(true);
    setGpsMessage("Meminta izin akses lokasi...");

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showCustomAlert(
          "Permission Ditolak!",
          "Akses GPS diperlukan untuk melanjutkan. Silakan aktifkan izin lokasi di pengaturan aplikasi.",
          "error",
        );
        return;
      }

      setGpsMessage("Sedang menentukan posisi Anda...");

      // Balanced is significantly faster than High for this use case
      // (finding nearest village — centimeter precision is not needed)
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      const nearestLocation = findNearestLocation(
        latitude,
        longitude,
        allLocations,
        haversineDistanceKm,
      );
      const locationName = nearestLocation?.name || "Lokasi GPS";

      // Fire-and-forget — DB update no longer blocks navigation
      const app = getApp();
      const currentUser = getAuth(app).currentUser;
      if (currentUser) {
        const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
        const database = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);
        update(ref(database, `users/${currentUser.uid}`), {
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
          locationName,
          locationUpdatedAt: new Date().toISOString(),
        }).catch(() => {});
      }

      // Navigate immediately — no artificial delay
      router.push("/main-menu/home");
    } catch {
      showCustomAlert(
        "Error",
        "Tidak dapat mengakses GPS. Pastikan GPS sudah aktif dan coba lagi.",
        "error",
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
    setModalVisible(false);
    setQuery("");

    // Fire-and-forget — DB update no longer blocks navigation
    const app = getApp();
    const currentUser = getAuth(app).currentUser;
    if (currentUser) {
      const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
      const database = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);
      update(ref(database, `users/${currentUser.uid}`), {
        latitude: item.latitude.toFixed(6),
        longitude: item.longitude.toFixed(6),
        locationName: item.name,
        locationUpdatedAt: new Date().toISOString(),
      }).catch(() => {});
    }

    // Navigate immediately — no artificial delay
    router.push("/main-menu/home");
  };

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

        {/* GPS Button with inline loading indicator */}
        <View style={styles.buttonWrapper}>
          <TouchableOpacity
            style={[styles.gpsButton, gpsLoading && styles.gpsButtonLoading]}
            onPress={handleUseGPS}
            disabled={gpsLoading}
            activeOpacity={0.8}
          >
            {gpsLoading ? (
              <View style={styles.gpsButtonInner}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.gpsButtonText}>{gpsMessage}</Text>
              </View>
            ) : (
              <View style={styles.gpsButtonInner}>
                <Ionicons name="navigate" size={18} color="#ffffff" />
                <Text style={styles.gpsButtonText}>Gunakan GPS</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Location search bottom sheet */}
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

      <CustomAlert
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={() => setModalConfig({ ...modalConfig, visible: false })}
      />
    </KeyboardAvoidingView>
  );
}
