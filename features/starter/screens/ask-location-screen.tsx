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
import { useEffect, useState } from "react";
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
        const locationsArray: AppLocation[] = Object.entries(data || {}).map(
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

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // ← findNearestLocation dari utils, tidak perlu oper haversineDistanceKm
      const nearest = findNearestLocation(latitude, longitude, allLocations);
      const locationName = nearest?.name ?? "Lokasi GPS";

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

  const handleSelect = async (item: AppLocation) => {
    setSelectedLocation(`${item.name}, ${item.desc}`);
    setModalVisible(false);
    setQuery("");

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
        onClose={() => setModalConfig({ ...modalConfig, visible: false })}
      />
    </KeyboardAvoidingView>
  );
}