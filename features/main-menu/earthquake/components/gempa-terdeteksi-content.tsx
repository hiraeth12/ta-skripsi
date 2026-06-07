import EarthquakeMap from "@/components/ui/earthquake-map";
import { NetworkErrorModal } from "@/components/ui/network-error-modal";
import { DetailItem, StatItem } from "@/components/ui/quake-card";
import type { MapViewType } from "@/constants/map";
import { TERDETEKSI_API_URL_FAST } from "@/features/main-menu/home/constants";
import { buildHistoryUrl } from "@/features/main-menu/home/utils/coord-utils";
import {
  getLatestTerdeteksiGempa,
  parseTerdeteksiPayload,
} from "@/features/main-menu/home/utils/parse-terdeteksi";
import { useCardAnimation } from "@/hooks/use-card-animation";
import { useNetworkError } from "@/hooks/use-network-error";
import { usePollingWithBackoff } from "@/hooks/use-polling-backoff";
import { formatLatText, formatLonText } from "@/utils/geo";
import { shareQuake } from "@/utils/share";
import { Feather } from "@expo/vector-icons";
import { XMLParser } from "fast-xml-parser";
import { useCallback, useRef, useState } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { checkTextAssetAvailable } from "../utils/text-asset-utils";
import { styles } from "./styles/gempa-terdeteksi-content.styles";

const MIN_POLL_MS = 30_000;
const MAX_POLL_MS = 120_000;
const xmlParser = new XMLParser({ ignoreAttributes: false });

function withCacheBuster(url: string): string {
  const base = url.trim();
  if (!base) return "";
  if (base.endsWith("=") || base.endsWith("?") || base.endsWith("&")) {
    return `${base}${Date.now()}`;
  }
  return `${base}${base.includes("?") ? "&" : "?"}t=${Date.now()}`;
}

type LatestQuake = {
  eventId: string;
  latitude: number;
  longitude: number;
  magnitude: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  kedalaman: string;
  status: string;
  latText: string;
  lonText: string;
};

type Props = {
  tabBar: React.ReactNode;
  onLoadingChange?: (loading: boolean) => void;
  onOpenHistory?: (url: string) => void;
  isActive?: boolean;
};

export default function GempaTerdeteksi({
  tabBar,
  onLoadingChange,
  onOpenHistory,
  isActive = true,
}: Props) {
  const [latestQuake, setLatestQuake] = useState<LatestQuake | null>(null);
  const [historyUrl, setHistoryUrl] = useState<string | null>(null);
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
        if (!TERDETEKSI_API_URL_FAST) return { changed: false, ok: true };

        const res = await fetch(withCacheBuster(TERDETEKSI_API_URL_FAST), {
          signal: abortSignal,
        });
        if (!res.ok) throw new Error(`terdeteksi fetch failed: ${res.status}`);

        const raw = await res.text();
        const xml = xmlParser.parse(raw) as Record<string, unknown>;
        const latest = getLatestTerdeteksiGempa(xml);
        const parsed = parseTerdeteksiPayload(latest);
        if (!parsed) return { changed: false, ok: true };

        const { latitude, longitude } = parsed;
        const sourceEventId = parsed.eventId.trim();
        const eventKey =
          sourceEventId || `${parsed.tanggal}_${parsed.jam}_${latitude}_${longitude}`;
        const isSameEvent = eventKey && eventKey === latestEventIdRef.current;

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

        latestEventIdRef.current = eventKey;

        setLatestQuake({
          eventId: sourceEventId || eventKey,
          latitude,
          longitude,
          magnitude: parsed.magnitude,
          wilayah: parsed.wilayah,
          tanggal: parsed.tanggal,
          jam: parsed.jam,
          kedalaman: parsed.kedalaman,
          status: parsed.status,
          latText: formatLatText(latitude),
          lonText: formatLonText(longitude),
        });
        setHistoryUrl(null);

        if (!wasOffline) {
          mapRef.current?.animateToRegion(
            { latitude, longitude, latitudeDelta: 2, longitudeDelta: 2 },
            isFirstLoadRef.current ? 800 : 600,
          );
        }
        isFirstLoadRef.current = false;

        const candidateHistoryUrl = sourceEventId
          ? buildHistoryUrl(sourceEventId)
          : null;
        if (candidateHistoryUrl) {
          const available = await checkTextAssetAvailable(
            candidateHistoryUrl,
            abortSignal,
          );
          if (!abortSignal?.aborted && latestEventIdRef.current === eventKey) {
            setHistoryUrl(available);
          }
        }

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
          {!!latestQuake.status && (
            <DetailItem
              icon="alert-circle-outline"
              label="Status :"
              value={latestQuake.status}
              styles={styles}
            />
          )}
          {historyUrl && onOpenHistory && (
            <TouchableOpacity
              style={styles.simulasiBtn}
              activeOpacity={0.8}
              onPress={() => historyUrl && onOpenHistory(historyUrl)}
            >
              <Text style={styles.simulasiBtnText}>PROSES HISTORIS</Text>
            </TouchableOpacity>
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
