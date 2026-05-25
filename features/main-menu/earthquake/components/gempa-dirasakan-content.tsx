import { ModalShakeMap } from "@/components/modal-shakemap";
import { NetworkErrorModal } from "@/components/ui/network-error-modal";
import { DetailItem, StatItem } from "@/components/ui/quake-card";
import { useCardAnimation } from "@/hooks/use-card-animation";
import { useNetworkError } from "@/hooks/use-network-error";
import { usePollingWithBackoff } from "@/hooks/use-polling-backoff";
import {
  getRealisticShakeRadiiMeters,
  parseDepthKm,
} from "@/utils/earthquake-impact";
import { haversineDistanceKm,formatLatText,formatLonText } from "@/utils/geo";
import { shareQuake } from "@/utils/share";
import { Feather } from "@expo/vector-icons";
import { XMLParser } from "fast-xml-parser";
import { useCallback, useMemo, useRef, useState } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";

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


const xmlParser = new XMLParser({ ignoreAttributes: false });

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
  const [shakeMapUrl, setShakeMapUrl] = useState<string | null>(null);
  const [shakeMapVisible, setShakeMapVisible] = useState(false);

  const {
    showCard,
    translateY,
    opacity,
    btnOpacity,
    panResponder,
    openCard,
    dismissCard,
  } = useCardAnimation();

  const latestEventId = useRef<string | null>(null);
  const isFirstLoad = useRef(true);
  const isFetching = useRef(false);

  const isOfflineRef = useRef(false);
  const mapRef = useRef<MapViewType | null>(null);
  const { networkErrorVisible, showNetworkError, dismissNetworkError } =
    useNetworkError();

  const waveOverlays = useMemo(() => {
    if (!latestQuake) return [];

    const magnitude =
      parseFloat(String(latestQuake.magnitude).replace("M", "")) || 0;

    const depthKm = parseDepthKm(latestQuake.kedalaman) ?? 0;

    const radii = getRealisticShakeRadiiMeters(magnitude, depthKm);

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

  const fetchLatestQuake = useCallback(
    async (
      silent = true,
      abortSignal?: AbortSignal,
    ): Promise<{
      changed: boolean;
      ok: boolean;
      latitude?: number;
      longitude?: number;
    }> => {
      if (isFetching.current) return { changed: false, ok: true };
      isFetching.current = true;
      if (!silent) onLoadingChange?.(true);
      try {
        if (!API_URL) return { changed: false, ok: true };
        const res = await fetch(`${API_URL.trim()}${Date.now()}`, {
          signal: abortSignal,
        });
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

        const eventId = String(
          latest.eventid ?? latest.identifier ?? globalIdentifier,
        );
        const isSameEvent = eventId && eventId === latestEventId.current;
        if (!isSameEvent) latestEventId.current = eventId;

        const coordStr: string = String(latest?.point?.coordinates ?? "");
        const [lonStr, latStr] = coordStr.split(",");
        const latitude = parseFloat(latStr);
        const longitude = parseFloat(lonStr);
        if (isNaN(latitude) || isNaN(longitude))
          return { changed: false, ok: true };

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

        if (!isSameEvent) {
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
            latText: formatLatText(latitude),
            lonText: formatLonText(longitude),
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
      } catch (err: any) {
        if (err?.name === "AbortError") return { changed: false, ok: false };
        isOfflineRef.current = true;
        showNetworkError();
        return { changed: false, ok: false };
      } finally {
        if (!silent) onLoadingChange?.(false);
        isFetching.current = false;
      }
    },
    [onLoadingChange, showNetworkError, dismissNetworkError],
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
            icon="time-outline"
            label="Waktu :"
            value={`${latestQuake.tanggal}, ${latestQuake.jam}`}
            styles={styles}
          />
          <DetailItem
            icon="walk-outline"
            label="Jarak :"
            value={`${latestQuake.distanceKm} km`}
            styles={styles}
          />
          {!!latestQuake.felt && (
            <DetailItem
              icon="alert-circle-outline"
              label="Wilayah Dirasakan (Skala MMI) :"
              value={latestQuake.felt}
              styles={styles}
            />
          )}
          <TouchableOpacity
            style={[
              styles.simulasiBtn,
              !shakeMapUrl && styles.simulasiBtnDisabled,
            ]}
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
        visible={networkErrorVisible}
        onClose={dismissNetworkError}
      />
    </View>
  );
}
