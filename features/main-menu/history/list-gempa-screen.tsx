import { CACHE_KEYS, setCacheData } from "@/hooks/use-earthquake-cache";
import { useHaversine } from "@/hooks/use-haversine";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { XMLParser } from "fast-xml-parser";
import { getAuth } from "firebase/auth";
import { get, getDatabase, ref } from "firebase/database";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import styles from "./styles/list-gempa-screen";

const DIRASAKAN_API_URL = process.env.EXPO_PUBLIC_GEMPA_DIRASAKAN_HISTORY!;
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

function withCacheBuster(url: string) {
  const base = url.trim();
  const separator = base.includes("?")
    ? base.endsWith("?") || base.endsWith("&")
      ? ""
      : "&"
    : "?";
  return `${base}${separator}t=${Date.now()}`;
}

function getDetectedHistoryNodeUrl() {
  const base = String(DATABASE_URL ?? "").trim().replace(/\/+$/, "");
  return `${base}/gempa_terdeteksi.json`;
}

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

    async function loadItems() {
      // Fetch user location first
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user && isMounted) {
          const db = getDatabase();
          const userRef = ref(db, `/users/${user.uid}`);
          const snapshot = await get(userRef);
          const userData = snapshot.val();
          if (userData && userData.latitude && userData.longitude) {
            setUserLocation({
              lat: parseFloat(userData.latitude),
              lon: parseFloat(userData.longitude),
            });
          }
        }
      } catch (error) {
        console.warn("Failed to load user location:", error);
      }

      setLoading(true);
      try {
        const apiUrl = mode === "dirasakan" ? DIRASAKAN_API_URL : DATABASE_URL;
        if (!apiUrl) return;

        if (mode === "dirasakan") {
          const res = await fetch(withCacheBuster(apiUrl));
          const raw = await res.text();

          let candidates: any[] = [];
          let globalIdentifier = "";

          try {
            const parsedJson = JSON.parse(raw);
            const infoRaw = parsedJson?.info;
            candidates = Array.isArray(infoRaw)
              ? infoRaw
              : infoRaw
                ? [infoRaw]
                : [];
            globalIdentifier = String(parsedJson?.identifier ?? "");
          } catch {
            const parser = new XMLParser({ ignoreAttributes: false });
            const parsedXml = parser.parse(raw);
            const infoRaw = parsedXml?.alert?.info;
            candidates = Array.isArray(infoRaw)
              ? infoRaw
              : infoRaw
                ? [infoRaw]
                : [];
            globalIdentifier = String(parsedXml?.alert?.identifier ?? "");
          }

          const normalized = candidates
            .map((candidate, index): ListItem | null => {
              const coordStr = String(candidate?.point?.coordinates ?? "");
              const [lonStr, latStr] = coordStr.split(",");
              const latitude = parseFloat(latStr);
              const longitude = parseFloat(lonStr);
              if (Number.isNaN(latitude) || Number.isNaN(longitude))
                return null;

              const distanceKm = haversineDistanceKm(
                userLocation.lat,
                userLocation.lon,
                latitude,
                longitude,
              ).toFixed(1);
              const eventId = String(
                candidate?.eventid ??
                candidate?.identifier ??
                `${globalIdentifier}-${candidate?.time ?? ""}-${candidate?.date ?? ""}-${index}`,
              );

              return {
                id: eventId,
                latitude,
                longitude,
                magnitude: String(candidate?.magnitude ?? ""),
                lokasi: String(candidate?.area ?? ""),
                waktu: `${String(candidate?.time ?? "")} • ${String(candidate?.date ?? "")}`,
                jarak: `${distanceKm} km dari lokasi Anda`,
                distanceKm,
                tanggal: String(candidate?.date ?? ""),
                jam: String(candidate?.time ?? ""),
                kedalaman: String(candidate?.depth ?? ""),
                felt: String(candidate?.felt ?? ""),
                shakemap: candidate?.shakemap
                  ? String(candidate.shakemap)
                  : null,
              };
            })
            .filter((item): item is ListItem => Boolean(item));

          if (isMounted) setItems(normalized);
        } else {
          const res = await fetch(withCacheBuster(getDetectedHistoryNodeUrl()));
          const data = await res.json();

          // Handle both direct array and object keyed structure
          let nodeArray: any[] = [];

          if (Array.isArray(data)) {
            // If data is already an array
            nodeArray = data;
          } else if (typeof data === "object" && data !== null) {
            // If data is an object, try to extract items
            if (data?.items && typeof data.items === "object") {
              nodeArray = Object.values(data.items);
            } else if (data?.features && Array.isArray(data.features)) {
              // If it's GeoJSON format
              nodeArray = data.features;
            } else {
              // Try to get all values from the object
              nodeArray = Object.values(data);
            }
          }

          if (!Array.isArray(nodeArray) || nodeArray.length === 0) {
            if (isMounted) setItems([]);
            return;
          }

          const sorted = [...nodeArray].sort((a: any, b: any) => {
            const tA = String(a?.properties?.time ?? a?.time ?? "");
            const tB = String(b?.properties?.time ?? b?.time ?? "");
            return tB.localeCompare(tA);
          });

          const normalized = sorted
            .map((item: any, index): ListItem | null => {
              // Handle both direct properties and GeoJSON format
              const coords = item?.geometry?.coordinates || item?.coordinates;
              const longitude = parseFloat(
                String(coords?.longitude ?? coords?.[0] ?? "0"),
              );
              const latitude = parseFloat(
                String(coords?.latitude ?? coords?.[1] ?? "0"),
              );
              if (Number.isNaN(latitude) || Number.isNaN(longitude))
                return null;

              // Get properties from either properties object or direct properties
              const props = item?.properties ?? item;
              const [tanggalFromTime, jamRaw] = String(props?.time ?? "").split(
                " ",
              );
              const jamFromTime = (jamRaw ?? "").split(".")[0];
              const distanceKm = haversineDistanceKm(
                userLocation.lat,
                userLocation.lon,
                latitude,
                longitude,
              ).toFixed(1);
              const eventId = String(
                props?.eventid ??
                `${props?.time ?? ""}-${latitude}-${longitude}-${index}`,
              );

              return {
                id: eventId,
                latitude,
                longitude,
                magnitude: String(props?.magnitude ?? props?.mag ?? "0.0"),
                lokasi: String(props?.lokasi ?? props?.place ?? ""),
                waktu: `${String(props?.jam ?? jamFromTime ?? "")} • ${String(props?.tanggal ?? tanggalFromTime ?? "")}`,
                jarak: `${distanceKm} km dari lokasi Anda`,
                distanceKm,
                tanggal: String(props?.tanggal ?? tanggalFromTime ?? ""),
                jam: String(props?.jam ?? jamFromTime ?? ""),
                kedalaman: String(props?.kedalaman ?? props?.depth ?? ""),
                felt: String(props?.felt ?? ""),
              };
            })
            .filter((item): item is ListItem => Boolean(item))
            .slice(0, 30);

          // Cache the terdeteksi data
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
  }, [mode, userLocation]);

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

