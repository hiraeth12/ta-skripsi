import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { XMLParser } from "fast-xml-parser";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    AppState,
    Dimensions,
    Image,
    Modal,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker, UrlTile } from "react-native-maps";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const SHAKEMAP_BASE = "https://bmkg-content-inatews.storage.googleapis.com";

const CARTO_TILE_URL =
  "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png";

const API_URL = process.env.EXPO_PUBLIC_GEMPA_DIRASAKAN_API_URL!;

const INITIAL_REGION = {
  latitude: -6.2088,
  longitude: 106.8456,
  latitudeDelta: 5,
  longitudeDelta: 5,
};

type LatestQuake = {
  latitude: number;
  longitude: number;
  magnitude: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  kedalaman: string;
  felt: string;
  latText: string;
  lonText: string;
};

type Props = {
  tabBar: React.ReactNode;
  onLoadingChange?: (loading: boolean) => void;
};

export default function GempaDirasakan({ tabBar, onLoadingChange }: Props) {
  const [latestQuake, setLatestQuake] = useState<LatestQuake | null>(null);
  const [showCard, setShowCard] = useState(false);
  const [shakeMapUrl, setShakeMapUrl] = useState<string | null>(null);
  const [shakeMapVisible, setShakeMapVisible] = useState(false);
  const latestEventId = useRef<string | null>(null);
  const isFirstLoad = useRef(true);
  const mapRef = useRef<MapView>(null);
  const translateY = useRef(new Animated.Value(600)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          translateY.setValue(gs.dy);
          opacity.setValue(Math.max(0, 1 - gs.dy / 300));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80) {
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: 600,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 180,
              useNativeDriver: true,
            }),
            Animated.timing(btnOpacity, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start(() => setShowCard(false));
        } else {
          Animated.parallel([
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(btnOpacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    }),
  ).current;

  function openCard() {
    translateY.setValue(600);
    opacity.setValue(0);
    btnOpacity.setValue(0);
    setShowCard(true);
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        bounciness: 4,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(btnOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function dismissCard(callback?: () => void) {
    if (showCard) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 600,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(btnOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowCard(false);
        callback?.();
      });
    } else {
      callback?.();
    }
  }

  useEffect(() => {
    async function fetchLatestQuake() {
      onLoadingChange?.(true);
      try {
        if (!API_URL) {
          console.error(
            "GEMPA_DIRASAKAN_API_URL is undefined — restart Metro with --clear",
          );
          return;
        }
        const res = await fetch(`${API_URL.trim()}?t=${Date.now()}`);
        const xml = await res.text();
        const parser = new XMLParser({ ignoreAttributes: false });
        const parsed = parser.parse(xml);

        const infoRaw = parsed?.alert?.info;
        const latest = Array.isArray(infoRaw) ? infoRaw[0] : infoRaw;
        if (!latest) return;

        // Skip update if the event hasn't changed
        const eventId = String(latest.eventid ?? latest.identifier ?? "");
        if (eventId && eventId === latestEventId.current) return;
        latestEventId.current = eventId;

        const coordStr: string = String(latest?.point?.coordinates ?? "");
        const [lonStr, latStr] = coordStr.split(",");
        const latitude = parseFloat(latStr);
        const longitude = parseFloat(lonStr);
        if (isNaN(latitude) || isNaN(longitude)) return;

        const absLat = Math.abs(latitude).toFixed(2);
        const absLon = Math.abs(longitude).toFixed(2);

        if (latest.shakemap) {
          setShakeMapUrl(`${SHAKEMAP_BASE}/${latest.shakemap}`);
        }

        setLatestQuake({
          latitude,
          longitude,
          magnitude: String(latest.magnitude),
          wilayah: latest.area ?? "",
          tanggal: latest.date ?? "",
          jam: latest.time ?? "",
          kedalaman: latest.depth ?? "",
          felt: latest.felt ?? "",
          latText: `${absLat}°${latitude < 0 ? "LS" : "LU"}`,
          lonText: `${absLon}°${longitude >= 0 ? "BT" : "BB"}`,
        });

        // Only fly to the marker on first load
        if (isFirstLoad.current) {
          isFirstLoad.current = false;
          mapRef.current?.animateToRegion(
            { latitude, longitude, latitudeDelta: 2, longitudeDelta: 2 },
            800,
          );
        }
      } catch (e) {
        console.error("Failed to fetch gempa dirasakan:", e);
      } finally {
        onLoadingChange?.(false);
      }
    }

    fetchLatestQuake();

    // Re-fetch every 60 seconds
    const interval = setInterval(fetchLatestQuake, 60_000);

    // Re-fetch when app comes back to foreground
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") fetchLatestQuake();
    });

    return () => {
      clearInterval(interval);
      appStateSub.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        mapType="none"
        rotateEnabled={false}
        showsCompass={false}
        onPress={() => dismissCard()}
      >
        <UrlTile
          urlTemplate={CARTO_TILE_URL}
          maximumZ={19}
          flipY={false}
          tileSize={256}
        />
        {latestQuake && (
          <Marker
            coordinate={{
              latitude: latestQuake.latitude,
              longitude: latestQuake.longitude,
            }}
            pinColor="red"
            onPress={() => openCard()}
          />
        )}
      </MapView>

      <View style={styles.topControls}>
        {tabBar}
        {showCard && (
          <Animated.View style={[styles.mapButtons, { opacity: btnOpacity }]}>
            <TouchableOpacity
              style={[
                styles.mapButton,
                !shakeMapUrl && styles.mapButtonDisabled,
              ]}
              onPress={() => shakeMapUrl && setShakeMapVisible(true)}
            >
              <Feather name="map" size={12} color="white" />
              <Text style={styles.mapButtonText}>PETA GUNCANGAN</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapButton}>
              <Feather name="share" size={12} color="white" />
              <Text style={styles.mapButtonText}>BAGIKAN</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {showCard && latestQuake && (
        <Animated.View
          style={[
            styles.locationCard,
            { transform: [{ translateY }], opacity },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
            <View style={styles.dragHandle} />
          </View>

          <View style={styles.statsTopRow}>
            <View style={styles.statTopItem}>
              <MaterialCommunityIcons
                name="triangle-wave"
                size={20}
                color="#0369A1"
              />
              <Text style={styles.statTopValue}>{latestQuake.magnitude}</Text>
              <Text style={styles.statTopLabel}>Magnitudo</Text>
            </View>
            <View style={styles.statTopDivider} />
            <View style={styles.statTopItem}>
              <MaterialCommunityIcons name="rss" size={20} color="#0369A1" />
              <Text style={styles.statTopValue}>{latestQuake.kedalaman}</Text>
              <Text style={styles.statTopLabel}>Kedalaman</Text>
            </View>
            <View style={styles.statTopDivider} />
            <View style={styles.statTopItem}>
              <MaterialCommunityIcons
                name="compass-outline"
                size={20}
                color="#0369A1"
              />
              <Text style={styles.statTopValue}>{latestQuake.latText}</Text>
              <Text style={styles.statTopLabel}>LS</Text>
            </View>
            <View style={styles.statTopDivider} />
            <View style={styles.statTopItem}>
              <MaterialCommunityIcons
                name="compass-outline"
                size={20}
                color="#0369A1"
              />
              <Text style={styles.statTopValue}>{latestQuake.lonText}</Text>
              <Text style={styles.statTopLabel}>BT</Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <Ionicons
              name="location"
              size={18}
              color="#1E6F9F"
              style={styles.infoIcon}
            />
            <View>
              <Text style={styles.infoLabel}>Lokasi Gempa :</Text>
              <Text style={styles.infoValue}>{latestQuake.wilayah}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons
              name="time-outline"
              size={18}
              color="#1E6F9F"
              style={styles.infoIcon}
            />
            <View>
              <Text style={styles.infoLabel}>Waktu :</Text>
              <Text style={styles.infoValue}>
                {latestQuake.tanggal}, {latestQuake.jam}
              </Text>
            </View>
          </View>
          {!!latestQuake.felt && (
            <View style={styles.infoRow}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color="#1E6F9F"
                style={styles.infoIcon}
              />
              <View style={styles.infoTextFlex}>
                <Text style={styles.infoLabel}>
                  Wilayah Dirasakan (Skala MMI) :
                </Text>
                <Text style={styles.infoValue}>{latestQuake.felt}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.simulasiBtn} activeOpacity={0.8}>
            <Text style={styles.simulasiBtnText}>SIMULASI GUNCANGAN</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <Modal visible={shakeMapVisible} transparent animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View
            style={[styles.modalCardBottom, { height: SCREEN_HEIGHT * 0.9 }]}
          >
            <View style={styles.handleBar} />
            <View style={styles.modalHeaderBottom}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitleBottom}>PETA GUNCANGAN</Text>
                <Text style={styles.modalSubtitle}>
                  Sumber data: BMKG ShakeMap
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShakeMapVisible(false)}
                style={styles.modalCloseCircle}
              >
                <Ionicons name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }}>
              {shakeMapUrl && (
                <Image
                  source={{ uri: shakeMapUrl }}
                  style={styles.maximizedImage}
                  resizeMode="contain"
                />
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <Text style={styles.scrollHint}>
                * Data diperbarui secara otomatis dari BMKG ShakeMap
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  topControls: {
    position: "absolute",
    top: 16,
    left: 10,
    right: 10,
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
  },
  mapButtons: {
    flexDirection: "row",
    gap: 6,
    alignSelf: "flex-end",
    paddingHorizontal: 14,
  },
  mapButton: {
    backgroundColor: "#0891B2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 333,
    marginLeft: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mapButtonText: { color: "#fff", fontSize: 10 },
  locationCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 12,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  dragHandleArea: { alignItems: "center", paddingVertical: 8, marginBottom: 8 },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1E6F9F",
    alignSelf: "center",
  },
  statsTopRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 11,
  },
  statTopItem: { flex: 1, alignItems: "center", gap: 2 },
  statTopValue: { fontSize: 14, fontWeight: "700", color: "#000000" },
  statTopLabel: { fontSize: 12, color: "#000000", fontWeight: "500" },
  statTopDivider: { width: 1, backgroundColor: "#E0E0E0", marginVertical: 4 },
  separator: { height: 2, backgroundColor: "#0369A1", marginBottom: 11 },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
    gap: 10,
  },
  infoIcon: { marginTop: 2 },
  infoTextFlex: { flex: 1 },
  infoLabel: { fontSize: 12, color: "#666", marginBottom: 2 },
  infoValue: { fontSize: 13, fontWeight: "700", color: "#1E3A5F" },
  simulasiBtn: {
    marginTop: 11,
    marginBottom: -11,
    backgroundColor: "#1E6F9F",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
  },
  simulasiBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 1,
  },
  mapButtonDisabled: { backgroundColor: "#94a3b8" },
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalCardBottom: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    width: "100%",
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: "#ccc",
    borderRadius: 10,
    alignSelf: "center",
    marginTop: 12,
  },
  modalHeaderBottom: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitleBottom: { color: "#0C4A6E", fontWeight: "700", fontSize: 16 },
  modalSubtitle: { fontSize: 11, color: "#777" },
  maximizedImage: { width: SCREEN_WIDTH, height: 600, marginTop: 10 },
  modalFooter: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fafafa",
  },
  scrollHint: {
    textAlign: "center",
    fontSize: 12,
    color: "#1E6F9F",
    fontWeight: "500",
  },
  modalCloseCircle: {
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    padding: 4,
  },
});
