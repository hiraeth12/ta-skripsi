import CustomAlert from "@/components/ui/custom-alert";
import GpsButton from "@/components/ui/gps-button";
import LocationSearchModal from "@/components/ui/location-search-modal";
import { useHaversine } from "@/hooks/use-haversine";
import { EvilIcons, Ionicons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { getDatabase, ref, update } from "@react-native-firebase/database";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation(); // <-- Hook i18n dipanggil di sini

  const [query, setQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [allLocations, setAllLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMessage, setGpsMessage] = useState(
    t("askLocationScreen.status.findingGps"), // <-- Menggunakan t()
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
    setGpsMessage(t("askLocationScreen.status.requestingPermission")); // <-- Menggunakan t()

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showCustomAlert(
          t("askLocationScreen.alert.permissionDeniedTitle"), // <-- Menggunakan t()
          t("askLocationScreen.alert.permissionDeniedMsg"), // <-- Menggunakan t()
          "error",
        );
        return;
      }

      setGpsMessage(t("askLocationScreen.status.determiningPosition")); // <-- Menggunakan t()

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
      const locationName =
        nearestLocation?.name || t("askLocationScreen.fallbackLocationName"); // <-- Menggunakan t()

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
        t("askLocationScreen.alert.errorTitle"), // <-- Menggunakan t()
        t("askLocationScreen.alert.errorMsg"), // <-- Menggunakan t()
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

        {/* <-- Menggunakan t() untuk teks UI --> */}
        <Text style={styles.description}>
          {t("askLocationScreen.headerTitle")}
        </Text>

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
              {selectedLocation || t("askLocationScreen.searchPlaceholder")}
            </Text>
            <EvilIcons name="search" size={24} color="#1E6F9F" />
          </TouchableOpacity>
        </View>

        <Text style={styles.orText}>{t("askLocationScreen.orDivider")}</Text>

        <View style={styles.buttonWrapper}>
          <GpsButton
            text={t("askLocationScreen.useGpsButton")}
            loadingText={gpsMessage} // gpsMessage sudah pakai t() di atas
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
          locations={loading ? [] : filteredLocations}
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
