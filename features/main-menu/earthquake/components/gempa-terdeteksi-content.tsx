import { NetworkErrorModal } from "@/components/ui/network-error-modal";
import EarthquakeMap from "@/components/earthquake-map";
import type { MapViewType } from "@/constants/map";
import { shareQuake } from "@/utils/share";
import { Feather } from "@expo/vector-icons";
import { DetailItem, StatItem } from "@/components/ui/quake-card";
import { useCallback, useRef, useState } from "react";
import { useCardAnimation } from "@/hooks/use-card-animation";
import { useNetworkError } from "@/hooks/use-network-error";
import { usePollingWithBackoff } from "@/hooks/use-polling-backoff";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { styles } from "./styles/gempa-terdeteksi-content.styles";
import { formatLatText, formatLonText } from "@/utils/geo";

const API_URL = process.env.EXPO_PUBLIC_GEMPA_TERDETEKSI_API_URL!;
const MIN_POLL_MS = 30_000;
const MAX_POLL_MS = 120_000;

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
  isActive?: boolean;
};

export default function GempaTerdeteksi({
  tabBar,
  onLoadingChange,
  isActive = true,
}: Props) {
  const [latestQuake, setLatestQuake] = useState<LatestQuake | null>(null);
  const mapRef = useRef<MapViewType | null>(null);
  const { networkErrorVisible, showNetworkError, dismissNetworkError } =
    useNetworkError();

  const {
    showCard,
    translateY,
    opacity,
    btnOpacity,
    panResponder,
    openCard,
    dismissCard,
  } = useCardAnimation();

  const latestEventIdRef = useRef<string | null>(null);
  const isFirstLoadRef = useRef(true);
  const isFetchingRef = useRef(false);
  const isOfflineRef = useRef(false);

  const fetchLatestQuake = useCallback(
    async (
      silent = true,
      abortSignal: AbortSignal,
    ): Promise<{ changed: boolean; ok: boolean }> => {
      if (isFetchingRef.current) return { changed: false, ok: true };
      isFetchingRef.current = true;
      if (!silent) onLoadingChange?.(true);

      try {
        if (!API_URL) return { changed: false, ok: true };

        const url = `${API_URL.trim()}${Date.now()}`;
        const res = await fetch(url, { signal: abortSignal });
        const data = await res.json();

        const features = data?.features;
        if (!Array.isArray(features) || features.length === 0)
          return { changed: false, ok: true };

        const sorted = [...features].sort((a, b) => {
          const tA = a?.properties?.time ?? "";
          const tB = b?.properties?.time ?? "";
          return tB.localeCompare(tA);
        });
        const latest = sorted[0];
        if (!latest) return { changed: false, ok: true };

        const props = latest?.properties ?? {};
        const coords = latest?.geometry?.coordinates;
        const longitude = parseFloat(coords?.[0] ?? "0");
        const latitude = parseFloat(coords?.[1] ?? "0");
        if (isNaN(latitude) || isNaN(longitude))
          return { changed: false, ok: true };

        const eventId = `${props.time ?? ""}_${latitude}_${longitude}`;
        const isSameEvent = eventId && eventId === latestEventIdRef.current;

        const wasOffline = isOfflineRef.current;
        if (wasOffline) {
          isOfflineRef.current = false;
          dismissNetworkError();
          setTimeout(() => {
            mapRef.current?.animateToRegion(
              { latitude, longitude, latitudeDelta: 2, longitudeDelta: 2 },
              800,
            );
          }, 350);
        }

        if (isSameEvent) return { changed: false, ok: true };

        latestEventIdRef.current = eventId;

        const [tanggal, jamRaw] = (props.time ?? "").split(" ");
        const jam = (jamRaw ?? "").split(".")[0];
        const absLat = Math.abs(latitude).toFixed(2);
        const absLon = Math.abs(longitude).toFixed(2);

        setLatestQuake({
          latitude,
          longitude,
          magnitude: parseFloat(props.mag ?? "0").toFixed(1),
          wilayah: props.place ?? "",
          tanggal: tanggal ?? "",
          jam: jam ?? "",
          kedalaman: `${parseFloat(props.depth ?? "0").toFixed(1)} km`,
          felt: props.fase ?? "",
          latText: formatLatText(latitude),
          lonText: formatLonText(longitude),
        });

        if (!wasOffline) {
          mapRef.current?.animateToRegion(
            { latitude, longitude, latitudeDelta: 2, longitudeDelta: 2 },
            isFirstLoadRef.current ? 800 : 600,
          );
        }
        isFirstLoadRef.current = false;

        return { changed: true, ok: true };
      } catch (e) {
        if ((e as Error).name === "AbortError")
          return { changed: false, ok: false };
        isOfflineRef.current = true;
        if (
          e instanceof TypeError &&
          (e as Error).message.includes("Network")
        ) {
          showNetworkError();
        }
        return { changed: false, ok: false };
      } finally {
        if (!silent) onLoadingChange?.(false);
        isFetchingRef.current = false;
      }
    },
    [dismissNetworkError, onLoadingChange, showNetworkError],
  );

  usePollingWithBackoff(fetchLatestQuake, {
    isActive,
    minMs: MIN_POLL_MS,
    maxMs: MAX_POLL_MS,
  });

  return (
    <View style={styles.container}>
      <EarthquakeMap
        mapRef={mapRef}
        isCardOpen={showCard}
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
        onMarkerPress={() => {
          if (latestQuake) {
            mapRef.current?.animateToRegion(
              {
                latitude: latestQuake.latitude,
                longitude: latestQuake.longitude,
                latitudeDelta: 2,
                longitudeDelta: 2,
              },
              600,
            );
          }
          openCard();
        }}
      />

      <View style={styles.topControls}>
        {tabBar}
        {showCard && (
          <Animated.View style={[styles.mapButtons, { opacity: btnOpacity }]}>
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => shareQuake(latestQuake, "terdeteksi")}
            >
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
              styles={styles}
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="rss"
              value={latestQuake.kedalaman}
              label="Kedalaman"
              styles={styles}
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="compass-outline"
              value={latestQuake.latText}
              label="LS"
              styles={styles}
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="compass-outline"
              value={latestQuake.lonText}
              label="BT"
              styles={styles}
            />
          </View>

          <View style={styles.separator} />

          <DetailItem
            icon="location"
            label="Lokasi Gempa :"
            value={latestQuake.wilayah}
            styles={styles}
          />
          <DetailItem
            icon="calendar-outline"
            label="Tanggal :"
            value={latestQuake.tanggal}
            styles={styles}
          />
          <DetailItem
            icon="time-outline"
            label="Jam :"
            value={latestQuake.jam}
            styles={styles}
          />
          {!!latestQuake.felt && (
            <DetailItem
              icon="alert-circle-outline"
              label="Fase :"
              value={latestQuake.felt}
              styles={styles}
            />
          )}
        </Animated.View>
      )}

      <NetworkErrorModal
        visible={networkErrorVisible}
        onClose={dismissNetworkError}
      />
    </View>
  );
}
