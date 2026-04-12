import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { XMLParser } from "fast-xml-parser";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const DIRASAKAN_API_URL = process.env.EXPO_PUBLIC_GEMPA_DIRASAKAN_HISTORY!;
const TERDETEKSI_API_URL = process.env.EXPO_PUBLIC_GEMPA_TERDETEKSI_HISTORY!;

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

export default function ListGempaPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const mode: ListMode =
    params.tab === "terdeteksi" ? "terdeteksi" : "dirasakan";
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);

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
      setLoading(true);
      try {
        const apiUrl =
          mode === "dirasakan" ? DIRASAKAN_API_URL : TERDETEKSI_API_URL;
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
                -6.9175,
                107.6191,
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
                jarak: `${distanceKm} km dari Bandung`,
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
          const res = await fetch(withCacheBuster(apiUrl));
          const data = await res.json();
          const features = data?.features;
          if (!Array.isArray(features) || features.length === 0) {
            if (isMounted) setItems([]);
            return;
          }

          const sorted = [...features].sort((a, b) => {
            const tA = String(a?.properties?.time ?? "");
            const tB = String(b?.properties?.time ?? "");
            return tB.localeCompare(tA);
          });

          const normalized = sorted
            .map((feature, index): ListItem | null => {
              const props = feature?.properties ?? {};
              const coords = feature?.geometry?.coordinates;
              const longitude = parseFloat(coords?.[0] ?? "0");
              const latitude = parseFloat(coords?.[1] ?? "0");
              if (Number.isNaN(latitude) || Number.isNaN(longitude))
                return null;

              const [tanggal, jamRaw] = String(props.time ?? "").split(" ");
              const jam = (jamRaw ?? "").split(".")[0];
              const distanceKm = haversineDistanceKm(
                -6.9175,
                107.6191,
                latitude,
                longitude,
              ).toFixed(1);
              const eventId = String(
                props.eventid ??
                  props.identifier ??
                  `${props.time ?? ""}-${latitude}-${longitude}-${index}`,
              );

              return {
                id: eventId,
                latitude,
                longitude,
                magnitude: parseFloat(props.mag ?? "0").toFixed(1),
                lokasi: String(props.place ?? ""),
                waktu: `${jam} • ${tanggal}`,
                jarak: `${distanceKm} km dari Bandung`,
                distanceKm,
                tanggal: tanggal ?? "",
                jam: jam ?? "",
                kedalaman: `${parseFloat(props.depth ?? "0").toFixed(1)} km`,
                felt: String(props.fase ?? ""),
              };
            })
            .filter((item): item is ListItem => Boolean(item))
            .slice(0, 30);

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
  }, [mode]);

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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#E6F4FF" />
            <Text style={styles.loadingText}>Memuat data gempa...</Text>
          </View>
        )}

        {!loading && items.length === 0 && (
          <Text style={styles.emptyText}>Data gempa belum tersedia.</Text>
        )}

        {items.map((item) => (
          <View key={item.id} style={styles.itemCard}>
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
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0C4A6E",
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerTitle: {
    flex: 1,
    marginRight: 12,
    color: "#E6F4FF",
    fontSize: 18,
    fontWeight: "700",
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
    backgroundColor: "#E6F4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    gap: 8,
    paddingBottom: 24,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 16,
  },
  loadingText: {
    color: "#E6F4FF",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyText: {
    color: "#E6F4FF",
    fontSize: 14,
    textAlign: "center",
    marginTop: 16,
  },
  itemCard: {
    backgroundColor: "#EDEDED",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  magnitudeBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#D97706",
    alignItems: "center",
    justifyContent: "center",
  },
  magnitudeText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  magnitudeLabel: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "500",
    marginTop: -2,
  },
  infoColumn: {
    flex: 1,
    gap: 2,
  },
  locationText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  timeText: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "500",
  },
  distanceText: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "500",
  },
  itemAction: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: "#0891B2",
    alignItems: "center",
    justifyContent: "center",
  },
});
