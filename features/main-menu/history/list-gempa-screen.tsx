import { getApp } from "@/config/firebase-init";
import { CACHE_KEYS, setCacheData } from "@/hooks/use-earthquake-cache";
import { useHaversine } from "@/hooks/use-haversine";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "@react-native-firebase/auth";
import { get, getDatabase, limitToLast, query, ref } from "@react-native-firebase/database";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import styles from "./styles/list-gempa-screen";

const DATABASE_URL = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL!;

type ListMode = "dirasakan" | "terdeteksi";

type ListItem = {
  id: string;
  latitude: number;
  longitude: number;
  magnitude: string;
  lokasi: string;
  waktu: string;
  jarak: string;
  distanceKm: string;
  tanggal: string;
  jam: string;
  kedalaman: string;
  felt: string;
  shakemap?: string | null;
};

export default function ListGempaPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const mode: ListMode =
    params.tab === "terdeteksi" ? "terdeteksi" : "dirasakan";
  const { haversineDistanceKm } = useHaversine();
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number }>({
    lat: -6.9175,
    lon: 107.6191,
  });

  const title = useMemo(
    () =>
      mode === "dirasakan"
        ? "List Gempa Dirasakan • Jawa Barat"
        : "List Gempa Terdeteksi • Jawa Barat",
    [mode],
  );

  function openHistoryForItem(item: ListItem) {
    router.push({
      pathname: "/main-menu/history",
      params: {
        tab: mode,
        selectedEventId: item.id,
        selectedLatitude: String(item.latitude),
        selectedLongitude: String(item.longitude),
        selectedMagnitude: item.magnitude,
        selectedLocation: item.lokasi,
        selectedWaktu: item.waktu,
        selectedJarak: item.jarak,
        selectedDistanceKm: item.distanceKm,
        selectedTanggal: item.tanggal,
        selectedJam: item.jam,
        selectedKedalaman: item.kedalaman,
        selectedFelt: item.felt,
        selectedShakemap: item.shakemap ?? "",
      },
    });
  }

  useEffect(() => {
    let isMounted = true;

    async function loadUserLocationOnce() {
      try {
        const app = getApp();
        const auth = getAuth(app);
        const user = auth.currentUser;
        if (!user || !isMounted) return;

        const db = DATABASE_URL ? getDatabase(app, DATABASE_URL) : getDatabase(app);
        const userRef = ref(db, `/users/${user.uid}`);
        const snapshot = await get(userRef);
        const userData = snapshot.val();

        const lat = parseFloat(String(userData?.latitude ?? ""));
        const lon = parseFloat(String(userData?.longitude ?? ""));
        if (!isNaN(lat) && !isNaN(lon)) {
          setUserLocation({ lat, lon });
        }
      } catch (error) {
        console.warn("Failed to load user location:", error);
      }
    }

    void loadUserLocationOnce();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      setLoading(true);
      try {
        const app = getApp();
        const db = DATABASE_URL ? getDatabase(app, DATABASE_URL) : getDatabase(app);

        if (mode === "dirasakan") {
          const snapshot = await get(query(ref(db, "gempa_dirasakan/items"), limitToLast(80)));
          const rawData = snapshot.exists() ? snapshot.val() : null;
          const candidates = Array.isArray(rawData)
            ? rawData
            : rawData && typeof rawData === "object"
              ? Object.values(rawData)
              : [];

          const normalized = candidates
            .sort((a: any, b: any) => String(b?.eventid ?? b?.timesent ?? "").localeCompare(String(a?.eventid ?? a?.timesent ?? "")))
            .map((candidate: any, index): ListItem | null => {
              const coordStr = String(candidate?.point?.coordinates ?? "");
              const [lonStr, latStr] = coordStr.split(",");

              const latitude = parseFloat(
                String(candidate?.latitude ?? candidate?.lat ?? latStr ?? "").replace(",", "."),
              );
              const longitude = parseFloat(
                String(candidate?.longitude ?? candidate?.lon ?? lonStr ?? "").replace(",", "."),
              );
              if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

              const distanceKm = haversineDistanceKm(
                userLocation.lat,
                userLocation.lon,
                latitude,
                longitude,
              ).toFixed(1);

              const eventId = String(
                candidate?.eventid ??
                  candidate?.eventId ??
                  `${candidate?.time ?? ""}-${candidate?.date ?? ""}-${index}`,
              );

              return {
                id: eventId,
                latitude,
                longitude,
                magnitude: String(candidate?.magnitude ?? candidate?.mag ?? ""),
                lokasi: String(candidate?.area ?? candidate?.wilayah ?? candidate?.lokasi ?? ""),
                waktu: `${String(candidate?.time ?? candidate?.jam ?? "")} • ${String(candidate?.date ?? candidate?.tanggal ?? "")}`,
                jarak: `${distanceKm} km dari lokasi Anda`,
                distanceKm,
                tanggal: String(candidate?.date ?? candidate?.tanggal ?? ""),
                jam: String(candidate?.time ?? candidate?.jam ?? ""),
                kedalaman: String(candidate?.depth ?? candidate?.kedalaman ?? ""),
                felt: String(candidate?.felt ?? ""),
                shakemap: candidate?.shakemap ? String(candidate.shakemap) : null,
              };
            })
            .filter((item): item is ListItem => Boolean(item))
            .slice(0, 30);

          if (isMounted) setItems(normalized);
        } else {
          const snapshot = await get(query(ref(db, "gempa_terdeteksi/items"), limitToLast(150)));
          const rawData = snapshot.exists() ? snapshot.val() : null;
          const nodeArray = Array.isArray(rawData)
            ? rawData
            : rawData && typeof rawData === "object"
              ? Object.values(rawData)
              : [];

          const sorted = [...nodeArray].sort((a: any, b: any) => {
            const tA = String(a?.time ?? a?.properties?.time ?? "");
            const tB = String(b?.time ?? b?.properties?.time ?? "");
            return tB.localeCompare(tA);
          });

          const normalized = sorted
            .map((item: any, index): ListItem | null => {
              const coords = item?.geometry?.coordinates || item?.coordinates;
              const longitude = parseFloat(String(item?.longitude ?? item?.lon ?? coords?.longitude ?? coords?.[0] ?? ""));
              const latitude = parseFloat(String(item?.latitude ?? item?.lat ?? coords?.latitude ?? coords?.[1] ?? ""));
              if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

              const props = item?.properties ?? item;
              const [tanggalFromTime, jamRaw] = String(props?.time ?? "").split(" ");
              const jamFromTime = (jamRaw ?? "").split(".")[0];
              const distanceKm = haversineDistanceKm(
                userLocation.lat,
                userLocation.lon,
                latitude,
                longitude,
              ).toFixed(1);
              const eventId = String(
                props?.eventid ??
                  props?.eventId ??
                  `${props?.time ?? ""}-${latitude}-${longitude}-${index}`,
              );

              return {
                id: eventId,
                latitude,
                longitude,
                magnitude: String(props?.magnitude ?? props?.mag ?? "0.0"),
                lokasi: String(props?.lokasi ?? props?.place ?? props?.area ?? ""),
                waktu: `${String(props?.jam ?? jamFromTime ?? "")} • ${String(props?.tanggal ?? tanggalFromTime ?? "")}`,
                jarak: `${distanceKm} km dari lokasi Anda`,
                distanceKm,
                tanggal: String(props?.tanggal ?? tanggalFromTime ?? ""),
                jam: String(props?.jam ?? jamFromTime ?? ""),
                kedalaman: String(props?.kedalaman ?? props?.depth ?? ""),
                felt: String(props?.felt ?? props?.fase ?? ""),
              };
            })
            .filter((item): item is ListItem => Boolean(item))
            .slice(0, 30);

          setCacheData(CACHE_KEYS.TERDETEKSI_HISTORY, normalized);
          if (isMounted) setItems(normalized);
        }
      } catch (error) {
        console.error("Failed to load list gempa:", error);
        if (isMounted) setItems([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadItems();
    return () => {
      isMounted = false;
    };
  }, [haversineDistanceKm, mode, userLocation.lat, userLocation.lon]);

  return (
    <View style={styles.container}>
      {/* KUNCI PERBAIKAN ANIMASI: 
        Memaksa animasi selalu "slide_from_left" (masuk dari kiri) 
        tidak peduli mode apa yang sedang aktif.
      */}
      <Stack.Screen
        options={{
          headerShown: false,
          animation: "slide_from_left", // Selalu muncul dari kiri ke kanan
          presentation: "transparentModal",
        }}
      />

      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity
          style={styles.closeBtn}
          activeOpacity={0.85}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={20} color="#0C4A6E" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.magnitudeBubble}>
              <Text style={styles.magnitudeText}>{item.magnitude || "-"}</Text>
              <Text style={styles.magnitudeLabel}>Mag</Text>
            </View>

            <View style={styles.infoColumn}>
              <Text style={styles.locationText} numberOfLines={2}>
                {item.lokasi || "-"}
              </Text>
              <Text style={styles.timeText}>{item.waktu || "-"}</Text>
              <Text style={styles.distanceText}>{item.jarak}</Text>
            </View>

            <TouchableOpacity
              style={styles.itemAction}
              activeOpacity={0.85}
              onPress={() => openHistoryForItem(item)}
            >
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#E6F4FF" />
              <Text style={styles.loadingText}>Memuat data gempa...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>Data gempa belum tersedia.</Text>
          ) : null
        }
        maxToRenderPerBatch={15}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={true}
      />
    </View>
  );
}

