import { NetworkErrorModal } from "@/components/ui/network-error-modal";
import { ModalShakeMap } from "@/components/modal-shakemap";
import { useEarthquakeShare } from "@/hooks/use-earthquake-share";
import { useHaversine } from "@/hooks/use-haversine";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { XMLParser } from "fast-xml-parser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AppState,
  PanResponder,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import EarthquakeMap from "@/components/earthquake-map";
import type { MapViewType } from "@/constants/map";
import { styles } from "./styles/gempa-dirasakan-content.styles";

const SHAKEMAP_BASE = "https://bmkg-content-inatews.storage.googleapis.com";

const API_URL = process.env.EXPO_PUBLIC_GEMPA_DIRASAKAN_API_URL!;
const MIN_POLL_MS = 30_000;
const MAX_POLL_MS = 120_000;
const REFERENCE_LOCATION = {
  latitude: -6.9175,
  longitude: 107.6191,
};

// Module-level singleton — not recreated on every poll
const xmlParser = new XMLParser({ ignoreAttributes: false });

function getMagnitudeScaleFactor(magnitude: number): number {
  const deltaMagnitude = magnitude - 5;
  const scale = Math.pow(10, 0.5 * deltaMagnitude);
  return Math.max(0.05, Math.min(scale, 3.5));
}

function getDepthAttenuationFactor(depthKm: number): number {
  const attenuation = 1 / (1 + depthKm / 200);
  return Math.max(0.35, Math.min(attenuation, 1));
}

function getStaticWaveRadiiMeters(magnitude: number, depthKm: number) {
  const scale = getMagnitudeScaleFactor(magnitude);
  const depthFactor = getDepthAttenuationFactor(depthKm);
  const outerRadiusMeters = (100000 + 240000 * scale) * depthFactor;
  const innerRadiusMeters = (35000 + 80000 * scale) * depthFactor;
  return { outerRadiusMeters, innerRadiusMeters };
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
  const { haversineDistanceKm } = useHaversine();
  const { shareQuake } = useEarthquakeShare();
  const [latestQuake, setLatestQuake] = useState<LatestQuake | null>(null);
  const [showCard, setShowCard] = useState(false);
  const showCardRef = useRef(false);
  const [shakeMapUrl, setShakeMapUrl] = useState<string | null>(null);
  const [shakeMapVisible, setShakeMapVisible] = useState(false);
  const [networkErrorModalVisible, setNetworkErrorModalVisible] = useState(false);
  const latestEventId = useRef<string | null>(null);
  const isFirstLoad = useRef(true);
  const isFetching = useRef(false);
  const pollDelayRef = useRef(MIN_POLL_MS);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const networkErrorShownRef = useRef(false);
  const isOfflineRef = useRef(false); // true when last fetch failed due to network loss
  const mapRef = useRef<MapViewType | null>(null);
  const translateY = useRef(new Animated.Value(600)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  
  const showNetworkError = useCallback(() => {
    if (networkErrorShownRef.current) return;
    networkErrorShownRef.current = true;
    setNetworkErrorModalVisible(true);
  }, []);

  const waveOverlays = useMemo(() => {
    if (!latestQuake) return [];
    const magnitude = parseFloat(String(latestQuake.magnitude).replace("M", "")) || 0;
    const depthKm = parseFloat(String(latestQuake.kedalaman).replace(/[^\d.-]/g, "")) || 0;
    const radii = getStaticWaveRadiiMeters(magnitude, depthKm);
    return [
      {
        id: latestQuake.id,
        center: { latitude: latestQuake.latitude, longitude: latestQuake.longitude },
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
            Animated.timing(translateY, { toValue: 600, duration: 220, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
            Animated.timing(btnOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
          ]).start(() => {
            showCardRef.current = false;
            setShowCard(false);
          });
        } else {
          Animated.parallel([
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
            Animated.timing(btnOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          ]).start();
        }
      },
    }),
  ).current;

  function openCard() {
    translateY.setValue(600);
    opacity.setValue(0);
    btnOpacity.setValue(0);
    showCardRef.current = true;
    setShowCard(true);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, bounciness: 4, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(btnOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }

  function dismissCard(callback?: () => void) {
    if (showCardRef.current) {
      showCardRef.current = false;
      Animated.parallel([
        Animated.timing(translateY, { toValue: 600, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(btnOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
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

    type FetchResult = {
      changed: boolean;   
      ok: boolean;        
      latitude?: number;
      longitude?: number;
    };

    async function fetchLatestQuake(silent = true): Promise<FetchResult> {
      if (isFetching.current) return { changed: false, ok: true };
      isFetching.current = true;
      if (!silent) onLoadingChange?.(true);
      try {
        if (!API_URL) return { changed: false, ok: true };
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
          const parsedXml = xmlParser.parse(raw);
          const infoRaw = parsedXml?.alert?.info;
          latest = Array.isArray(infoRaw) ? infoRaw[0] : infoRaw;
          globalIdentifier = String(parsedXml?.alert?.identifier ?? "");
        }
        if (!latest) return { changed: false, ok: true };

        const eventId = String(latest.eventid ?? latest.identifier ?? globalIdentifier);
        const isSameEvent = eventId && eventId === latestEventId.current;
        if (!isSameEvent) latestEventId.current = eventId;

        const coordStr: string = String(latest?.point?.coordinates ?? "");
        const [lonStr, latStr] = coordStr.split(",");
        const latitude = parseFloat(latStr);
        const longitude = parseFloat(lonStr);
        if (isNaN(latitude) || isNaN(longitude)) return { changed: false, ok: true };

        
        const wasOffline = isOfflineRef.current;
        if (wasOffline) {
          isOfflineRef.current = false;
          networkErrorShownRef.current = false;
          setNetworkErrorModalVisible(false);
          setTimeout(() => {
            mapRef.current?.animateToRegion(
              { latitude, longitude, latitudeDelta: 2, longitudeDelta: 2 },
              800,
            );
          }, 350);
        }

        if (!isSameEvent) {
          setShakeMapUrl(latest.shakemap ? `${SHAKEMAP_BASE}/${latest.shakemap}` : null);
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

          
          if (!wasOffline) {
            mapRef.current?.animateToRegion(
              { latitude, longitude, latitudeDelta: 2, longitudeDelta: 2 },
              isFirstLoad.current ? 800 : 600,
            );
          }
          isFirstLoad.current = false;
        }

        return { changed: !isSameEvent, ok: true, latitude, longitude };
      } catch {
        // Mark as offline and show the error modal
        isOfflineRef.current = true;
        showNetworkError();
        return { changed: false, ok: false };
      } finally {
        if (!silent) onLoadingChange?.(false);
        isFetching.current = false;
      }
    }

    function clearPollTimer() {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    }
    function scheduleNextPoll({ changed, ok }: FetchResult) {
      if (!isMountedRef.current) return;
      // Back off slower when offline so we don't hammer a dead connection
      if (!ok) {
        pollDelayRef.current = Math.min(pollDelayRef.current + 15_000, MAX_POLL_MS);
      } else {
        pollDelayRef.current = changed
          ? MIN_POLL_MS
          : Math.min(pollDelayRef.current + 10_000, MAX_POLL_MS);
      }
      clearPollTimer();
      pollTimerRef.current = setTimeout(runPollingLoop, pollDelayRef.current);
    }
    async function runPollingLoop() {
      const result = await fetchLatestQuake(true);
      scheduleNextPoll(result);
    }

    fetchLatestQuake(false).then(scheduleNextPoll);

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active" && isMountedRef.current && isActive) {
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
  }, [isActive, onLoadingChange, showNetworkError]);

  // FIX 3: NetworkErrorModal is now inside the single root <View>, not after it
  return (
    <View style={styles.container}>
      <EarthquakeMap
        mapRef={mapRef}
        isCardOpen={showCard}
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
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => shareQuake(latestQuake, "dirasakan")}
            >
              <Feather name="share" size={12} color="white" />
              <Text style={styles.mapButtonText}>BAGIKAN</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {showCard && latestQuake && (
        <Animated.View
          style={[styles.locationCard, { transform: [{ translateY }], opacity }]}
        >
          <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
            <View style={styles.dragHandle} />
          </View>
          <View style={styles.statsTopRow}>
            <StatItem icon="triangle-wave" value={latestQuake.magnitude} label="Magnitudo" />
            <View style={styles.statTopDivider} />
            <StatItem icon="rss" value={latestQuake.kedalaman} label="Kedalaman" />
            <View style={styles.statTopDivider} />
            <StatItem icon="compass-outline" value={latestQuake.latText} label="LS" />
            <View style={styles.statTopDivider} />
            <StatItem icon="compass-outline" value={latestQuake.lonText} label="BT" />
          </View>
          <View style={styles.separator} />
          <DetailItem icon="location" label="Lokasi Gempa :" value={latestQuake.wilayah} />
          <DetailItem icon="time-outline" label="Waktu :" value={`${latestQuake.tanggal}, ${latestQuake.jam}`} />
          <DetailItem icon="walk-outline" label="Jarak :" value={`${latestQuake.distanceKm} km`} />
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

      <ModalShakeMap
        visible={shakeMapVisible}
        imageUrl={shakeMapUrl}
        onClose={() => setShakeMapVisible(false)}
      />

      <NetworkErrorModal
        visible={networkErrorModalVisible}
        onClose={() => {
          setNetworkErrorModalVisible(false);
          networkErrorShownRef.current = false;
        }}
      />
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
