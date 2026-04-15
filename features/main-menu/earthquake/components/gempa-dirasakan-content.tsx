import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { XMLParser } from "fast-xml-parser";
import { useEffect, useMemo, useRef, useState } from "react";
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

import EarthquakeMap from "@/components/earthquake-map";
import type { MapViewType } from "@/constants/map";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const SHAKEMAP_BASE = "https://bmkg-content-inatews.storage.googleapis.com";

const API_URL = process.env.EXPO_PUBLIC_GEMPA_DIRASAKAN_API_URL!;
const MIN_POLL_MS = 10_000;
const MAX_POLL_MS = 60_000;
const REFERENCE_LOCATION = {
  latitude: -6.9175,
  longitude: 107.6191,
};

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
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getMagnitudeScaleFactor(magnitude: number): number {
  const deltaMagnitude = magnitude - 5;
  const scale = Math.pow(10, 0.5 * deltaMagnitude);
  return Math.max(0.05, Math.min(scale, 3.5));
}

function getDepthAttenuationFactor(depthKm: number): number {
  // Deeper quakes generally have weaker surface impact.
  const attenuation = 1 / (1 + depthKm / 200);
  return Math.max(0.35, Math.min(attenuation, 1));
}

function getStaticWaveRadiiMeters(magnitude: number, depthKm: number) {
  const scale = getMagnitudeScaleFactor(magnitude);
  const depthFactor = getDepthAttenuationFactor(depthKm);
  // Keep visual similar to reference image while still scaling by magnitude.
  const outerRadiusMeters = (100000 + 240000 * scale) * depthFactor;
  const innerRadiusMeters = (35000 + 80000 * scale) * depthFactor;

  return {
    outerRadiusMeters,
    innerRadiusMeters,
  };
}

type LatestQuake = {
  id: string;
  latitude: number;
  longitude: number;
  distanceKm: string;
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
  isActive?: boolean;
};

export default function GempaDirasakan({
  tabBar,
  onLoadingChange,
  isActive = true,
}: Props) {
  const [latestQuake, setLatestQuake] = useState<LatestQuake | null>(null);
  const [showCard, setShowCard] = useState(false);
  const [shakeMapUrl, setShakeMapUrl] = useState<string | null>(null);
  const [shakeMapVisible, setShakeMapVisible] = useState(false);
  const latestEventId = useRef<string | null>(null);
  const isFirstLoad = useRef(true);
  const isFetching = useRef(false);
  const pollDelayRef = useRef(MIN_POLL_MS);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const mapRef = useRef<MapViewType | null>(null);
  const translateY = useRef(new Animated.Value(600)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  const waveOverlays = useMemo(() => {
    if (!latestQuake) return [];

    const magnitude = parseFloat(String(latestQuake.magnitude).replace("M", "")) || 0;
    const depthKm =
      parseFloat(String(latestQuake.kedalaman).replace(/[^\d.-]/g, "")) || 0;
    const radii = getStaticWaveRadiiMeters(magnitude, depthKm);

    return [
      {
        id: latestQuake.id,
        center: {
          latitude: latestQuake.latitude,
          longitude: latestQuake.longitude,
        },
        pWaveRadiusMeters: radii.outerRadiusMeters,
        sWaveRadiusMeters: radii.innerRadiusMeters,
      },
    ];
  }, [latestQuake]);

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
    if (!isActive) return;
    isMountedRef.current = true;

    async function fetchLatestQuake(silent = true): Promise<boolean> {
      if (isFetching.current) return false;
      isFetching.current = true;
      if (!silent) onLoadingChange?.(true);
      try {
        if (!API_URL) return false;
        const res = await fetch(`${API_URL.trim()}${Date.now()}`);
        const raw = await res.text();
        let latest: any = null;
        let globalIdentifier = "";
        try {
          const parsedJson = JSON.parse(raw);
          const infoRaw = parsedJson?.info;
          latest = Array.isArray(infoRaw) ? infoRaw[0] : infoRaw;
          globalIdentifier = String(parsedJson?.identifier ?? "");
        } catch {
          const parser = new XMLParser({ ignoreAttributes: false });
          const parsedXml = parser.parse(raw);
          const infoRaw = parsedXml?.alert?.info;
          latest = Array.isArray(infoRaw) ? infoRaw[0] : infoRaw;
          globalIdentifier = String(parsedXml?.alert?.identifier ?? "");
        }
        if (!latest) return false;
        const eventId = String(
          latest.eventid ?? latest.identifier ?? globalIdentifier,
        );
        if (eventId && eventId === latestEventId.current) return false;
        latestEventId.current = eventId;

        const coordStr: string = String(latest?.point?.coordinates ?? "");
        const [lonStr, latStr] = coordStr.split(",");
        const latitude = parseFloat(latStr);
        const longitude = parseFloat(lonStr);
        if (isNaN(latitude) || isNaN(longitude)) return false;

        setShakeMapUrl(
          latest.shakemap ? `${SHAKEMAP_BASE}/${latest.shakemap}` : null,
        );
        setLatestQuake({
          id: eventId || `${latitude}-${longitude}-${Date.now()}`,
          latitude,
          longitude,
          distanceKm: haversineDistanceKm(
            REFERENCE_LOCATION.latitude,
            REFERENCE_LOCATION.longitude,
            latitude,
            longitude,
          ).toFixed(1),
          magnitude: String(latest.magnitude),
          wilayah: latest.area ?? "",
          tanggal: latest.date ?? "",
          jam: latest.time ?? "",
          kedalaman: latest.depth ?? "",
          felt: latest.felt ?? "",
          latText: `${Math.abs(latitude).toFixed(2)}°${latitude < 0 ? "LS" : "LU"}`,
          lonText: `${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? "BT" : "BB"}`,
        });
        const region = {
          latitude,
          longitude,
          latitudeDelta: 2,
          longitudeDelta: 2,
        };
        mapRef.current?.animateToRegion(
          region,
          isFirstLoad.current ? 800 : 600,
        );
        isFirstLoad.current = false;
        return true;
      } catch {
        return false;
      } finally {
        if (!silent) onLoadingChange?.(false);
        isFetching.current = false;
      }
    }

    function clearPollTimer() {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    }
    function scheduleNextPoll(changed: boolean) {
      if (!isMountedRef.current) return;
      pollDelayRef.current = changed
        ? MIN_POLL_MS
        : Math.min(pollDelayRef.current + 10_000, MAX_POLL_MS);
      clearPollTimer();
      pollTimerRef.current = setTimeout(runPollingLoop, pollDelayRef.current);
    }
    async function runPollingLoop() {
      const changed = await fetchLatestQuake(true);
      scheduleNextPoll(changed);
    }
    fetchLatestQuake(false).then(scheduleNextPoll);
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        pollDelayRef.current = MIN_POLL_MS;
        clearPollTimer();
        runPollingLoop();
      }
    });
    return () => {
      isMountedRef.current = false;
      clearPollTimer();
      appStateSub.remove();
    };
  }, [isActive, onLoadingChange]);

  return (
    <View style={styles.container}>
      <EarthquakeMap
        mapRef={mapRef}
        highlightPolygons={[]}
        waveOverlays={waveOverlays}
        markerCoordinate={
          latestQuake
            ? {
                latitude: latestQuake.latitude,
                longitude: latestQuake.longitude,
                magnitude: latestQuake.magnitude,
                depth: latestQuake.kedalaman,
              }
            : null
        }
        onMapPress={() => dismissCard()}
        onMarkerPress={() => openCard()}
      />

      <View style={styles.topControls}>
        {tabBar}
        {showCard && (
          <Animated.View style={[styles.mapButtons, { opacity: btnOpacity }]}>
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
            <StatItem
              icon="triangle-wave"
              value={latestQuake.magnitude}
              label="Magnitudo"
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="rss"
              value={latestQuake.kedalaman}
              label="Kedalaman"
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="compass-outline"
              value={latestQuake.latText}
              label="LS"
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="compass-outline"
              value={latestQuake.lonText}
              label="BT"
            />
          </View>
          <View style={styles.separator} />
          <DetailItem
            icon="location"
            label="Lokasi Gempa :"
            value={latestQuake.wilayah}
          />
          <DetailItem
            icon="time-outline"
            label="Waktu :"
            value={`${latestQuake.tanggal}, ${latestQuake.jam}`}
          />
          <DetailItem
            icon="walk-outline"
            label="Jarak :"
            value={`${latestQuake.distanceKm} km`}
          />
          {!!latestQuake.felt && (
            <DetailItem
              icon="alert-circle-outline"
              label="Wilayah Dirasakan (Skala MMI) :"
              value={latestQuake.felt}
            />
          )}

          <TouchableOpacity
            style={[styles.simulasiBtn, !shakeMapUrl && styles.simulasiBtnDisabled]}
            activeOpacity={0.8}
            onPress={() => shakeMapUrl && setShakeMapVisible(true)}
            disabled={!shakeMapUrl}
          >
            <Text style={styles.simulasiBtnText}>PETA GUNCANGAN</Text>
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

const StatItem = ({ icon, value, label }: any) => (
  <View style={styles.statTopItem}>
    <MaterialCommunityIcons name={icon} size={20} color="#0369A1" />
    <Text style={styles.statTopValue}>{value}</Text>
    <Text style={styles.statTopLabel}>{label}</Text>
  </View>
);

const DetailItem = ({ icon, label, value }: any) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={18} color="#1E6F9F" style={styles.infoIcon} />
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  topControls: {
    position: "absolute",
    top: 16,
    left: 10,
    right: 10,
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
  },
  statsTopRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 11,
  },
  statTopItem: { flex: 1, alignItems: "center", gap: 2 },
  statTopValue: { fontSize: 14, fontWeight: "700", color: "#000" },
  statTopLabel: { fontSize: 12, color: "#000", fontWeight: "500" },
  statTopDivider: { width: 1, backgroundColor: "#E0E0E0", marginVertical: 4 },
  separator: { height: 2, backgroundColor: "#0369A1", marginBottom: 11 },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
    gap: 10,
  },
  infoIcon: { marginTop: 2 },
  infoLabel: { fontSize: 12, color: "#666", marginBottom: 2 },
  infoValue: { fontSize: 13, fontWeight: "700", color: "#1E3A5F" },
  simulasiBtn: {
    marginTop: 10,
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
  simulasiBtnDisabled: {
    backgroundColor: "#94a3b8",
  },
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
