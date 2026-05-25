import EarthquakeMap from "@/components/earthquake-map";
import { NetworkErrorModal } from "@/components/ui/network-error-modal";
import { DetailItem, StatItem } from "@/components/ui/quake-card";
import type { MapViewType } from "@/constants/map";
import { useCardAnimation } from "@/hooks/use-card-animation";
import { useNetworkError } from "@/hooks/use-network-error";
import { usePollingWithBackoff } from "@/hooks/use-polling-backoff";
import { shareQuake } from "@/utils/share";
import { Feather } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import {
  buildTsunamiGroupsSignature,
  buildTsunamiMapSlides,
  EMPTY_WARNING,
  fetchTsunamiGroups,
  safeText,
  type TsunamiEventGroup,
} from "../utils/tsunami-content-utils";
import { WarningTabs } from "./warning-tabs";
import { ModalTsunamiInfo } from "./modal-tsunami-info";
import { styles } from "./styles/gempa-dirasakan-content.styles";

const API_URL = process.env.EXPO_PUBLIC_PERINGATAN_TSUNAMI_API_URL ?? "";
const MIN_POLL_MS = 30_000;
const MAX_POLL_MS = 120_000;

type Props = {
  tabBar: ReactNode;
  onLoadingChange?: (loading: boolean) => void;
  isActive?: boolean;
};

export default function TsunamiContent({
  tabBar,
  onLoadingChange,
  isActive = true,
}: Props) {
  const [eventGroups, setEventGroups] = useState<TsunamiEventGroup[]>([]);
  const [selectedEventIndex, setSelectedEventIndex] = useState(0);
  const [selectedWarningIndex, setSelectedWarningIndex] = useState(0);
  const [tsunamiInfoVisible, setTsunamiInfoVisible] = useState(false);
  const mapRef = useRef<MapViewType | null>(null);
  const latestDataSignatureRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);
  const isOfflineRef = useRef(false);

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

  const selectedGroup = eventGroups[selectedEventIndex] ?? null;
  const selectedWarning =
    selectedGroup?.warnings[selectedWarningIndex] ??
    selectedGroup?.warnings[selectedGroup.latestWarningIndex] ??
    EMPTY_WARNING;
  const tsunamiMapSlides = useMemo(
    () => buildTsunamiMapSlides(selectedWarning),
    [selectedWarning],
  );
  const visibleEventGroups = useMemo(
    () => eventGroups.slice(0, 1),
    [eventGroups],
  );

  const markerCoordinates = useMemo(
    () =>
      visibleEventGroups.map((group) => ({
        latitude: group.latitude,
        longitude: group.longitude,
        magnitude: group.magnitude,
        depth: group.kedalaman,
      })),
    [visibleEventGroups],
  );

  const openGroupCard = useCallback(
    (index: number) => {
      const group = eventGroups[index];
      if (!group) return;

      setSelectedEventIndex(index);
      setSelectedWarningIndex(group.latestWarningIndex);
      mapRef.current?.animateToRegion(
        {
          latitude: group.latitude,
          longitude: group.longitude,
          latitudeDelta: 2,
          longitudeDelta: 2,
        },
        600,
      );
      openCard();
    },
    [eventGroups, openCard],
  );

  const shareSelectedWarning = useCallback(() => {
    if (!selectedGroup) return;

    shareQuake(
      {
        magnitude: selectedGroup.magnitude,
        kedalaman: selectedGroup.kedalaman,
        wilayah: selectedGroup.wilayah,
        tanggal: selectedGroup.tanggal,
        jam: selectedGroup.jam,
        latitude: selectedGroup.latitude,
        longitude: selectedGroup.longitude,
        subject: selectedWarning.subject,
        headline: selectedWarning.headline,
        description: selectedWarning.description,
      },
      "tsunami",
    );
  }, [selectedGroup, selectedWarning]);

  const fetchTsunamiEvents = useCallback(
    async (
      silent = true,
      abortSignal: AbortSignal,
    ): Promise<{ changed: boolean; ok: boolean }> => {
      if (isFetchingRef.current) return { changed: false, ok: true };
      isFetchingRef.current = true;
      if (!silent) onLoadingChange?.(true);

      try {
        if (!API_URL) return { changed: false, ok: true };

        const groups = await fetchTsunamiGroups(API_URL, abortSignal);
        const nextSignature = buildTsunamiGroupsSignature(groups);
        const changed = nextSignature !== latestDataSignatureRef.current;

        if (isOfflineRef.current) {
          isOfflineRef.current = false;
          dismissNetworkError();
        }

        if (!changed) return { changed: false, ok: true };

        latestDataSignatureRef.current = nextSignature;
        setEventGroups(groups);

        if (groups.length > 0) {
          setSelectedEventIndex(0);
          setSelectedWarningIndex(groups[0].latestWarningIndex);
          mapRef.current?.animateToRegion(
            {
              latitude: groups[0].latitude,
              longitude: groups[0].longitude,
              latitudeDelta: 2,
              longitudeDelta: 2,
            },
            800,
          );
        } else {
          setSelectedEventIndex(0);
          setSelectedWarningIndex(0);
        }

        return { changed: true, ok: true };
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return { changed: false, ok: false };
        }
        isOfflineRef.current = true;
        showNetworkError();
        return { changed: false, ok: false };
      } finally {
        if (!silent) onLoadingChange?.(false);
        isFetchingRef.current = false;
      }
    },
    [dismissNetworkError, onLoadingChange, showNetworkError],
  );

  usePollingWithBackoff(fetchTsunamiEvents, {
    isActive,
    minMs: MIN_POLL_MS,
    maxMs: MAX_POLL_MS,
  });

  return (
    <View style={styles.container}>
      <EarthquakeMap
        mapRef={mapRef}
        isCardOpen={showCard}
        markerCoordinates={markerCoordinates}
        onMapPress={() => dismissCard()}
        onMarkerPressIndex={openGroupCard}
      />

      <View style={styles.topControls}>
        {tabBar}
        {showCard && (
          <Animated.View style={[styles.mapButtons, { opacity: btnOpacity }]}>
            <TouchableOpacity
              style={styles.mapButton}
              onPress={shareSelectedWarning}
            >
              <Feather name="share" size={12} color="white" />
              <Text style={styles.mapButtonText}>BAGIKAN</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {showCard && selectedGroup && (
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
              value={selectedGroup.magnitude}
              label="Magnitudo"
              styles={styles}
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="rss"
              value={selectedGroup.kedalaman}
              label="Kedalaman"
              styles={styles}
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="compass-outline"
              value={selectedGroup.latText}
              label="LS"
              styles={styles}
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="compass-outline"
              value={selectedGroup.lonText}
              label="BT"
              styles={styles}
            />
          </View>

          <View style={styles.separator} />

          <WarningTabs
            warnings={selectedGroup.warnings}
            selectedIndex={selectedWarningIndex}
            onSelect={setSelectedWarningIndex}
          />

          <DetailItem
            icon="location"
            label="Lokasi Gempa :"
            value={safeText(selectedGroup.wilayah)}
            styles={styles}
          />
          <DetailItem
            icon="alert-circle-outline"
            label="Status :"
            value={safeText(selectedWarning.subject)}
            styles={styles}
          />
          <DetailItem
            icon="time-outline"
            label="Waktu :"
            value={`${safeText(selectedGroup.tanggal)}, ${safeText(selectedGroup.jam)}`}
            styles={styles}
          />
          <DetailItem
            icon="megaphone-outline"
            label="Informasi Tsunami :"
            value={safeText(selectedWarning.headline)}
            styles={styles}
          />

          <TouchableOpacity
            style={styles.simulasiBtn}
            activeOpacity={0.8}
            onPress={() => setTsunamiInfoVisible(true)}
          >
            <Text style={styles.simulasiBtnText}>INFORMASI LENGKAP</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <ModalTsunamiInfo
        visible={tsunamiInfoVisible}
        mapSlides={tsunamiMapSlides}
        wzAreas={selectedWarning.wzAreas}
        obsAreas={selectedWarning.obsAreas}
        onClose={() => setTsunamiInfoVisible(false)}
      />

      <NetworkErrorModal
        visible={networkErrorVisible}
        onClose={dismissNetworkError}
      />
    </View>
  );
}
