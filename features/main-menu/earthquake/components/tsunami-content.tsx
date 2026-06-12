import EarthquakeMap from "@/components/ui/earthquake-map";
import { NetworkErrorModal } from "@/components/ui/network-error-modal";
import { DetailItem, StatItem } from "@/components/ui/quake-card";
import { WarningTabs } from "@/components/warning-tabs";
import type { MapViewType } from "@/constants/map";
import { buildNarasiUrl } from "@/features/main-menu/home/utils/coord-utils";
import { useCardAnimation } from "@/hooks/use-card-animation";
import { useNetworkError } from "@/hooks/use-network-error";
import { usePollingWithBackoff } from "@/hooks/use-polling-backoff";
import { getShareQuakeLabels, shareQuake } from "@/utils/share";
import type { WzArea, WzLevel } from "@/utils/wzarea-highlights";
import { Feather } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ModalTsunamiInfo } from "@/components/modal-tsunami-info";
import {
  buildTsunamiGroupsSignature,
  buildTsunamiMapSlides,
  EMPTY_WARNING,
  fetchTsunamiGroups,
  safeText,
  type TsunamiEventGroup,
} from "../utils/tsunami-content-utils";
import { checkTextAssetAvailable } from "../utils/text-asset-utils";
import { styles } from "./styles/gempa-dirasakan-content.styles";

const API_URL = process.env.EXPO_PUBLIC_PERINGATAN_TSUNAMI_API_URL ?? "";
const CARD_BODY_MAX_HEIGHT = Dimensions.get("window").height * 0.4;
const MIN_POLL_MS = 30_000;
const MAX_POLL_MS = 120_000;
const WZ_LEVELS = new Set<WzLevel>(["AWAS", "SIAGA", "WASPADA", "NORMAL"]);

type SourceWzArea = {
  province: string;
  district: string;
  level: string;
  date: string;
  time: string;
};

function normalizeWzLevel(level: string): WzLevel {
  const value = String(level ?? "")
    .trim()
    .toUpperCase() as WzLevel;

  return WZ_LEVELS.has(value) ? value : "NORMAL";
}

function toMapWzAreas(wzAreas: SourceWzArea[]): WzArea[] {
  return wzAreas.map((area) => ({
    province: area.province,
    district: area.district,
    level: normalizeWzLevel(area.level),
    date: area.date,
    time: area.time,
  }));
}

function getWarningSubject(subject: string, fallback: string): string {
  const text = String(subject ?? "").trim();
  return text && text !== "-" ? text : fallback;
}

type Props = {
  tabBar: ReactNode;
  onLoadingChange?: (loading: boolean) => void;
  onOpenNarasi?: (url: string) => void;
  isActive?: boolean;
};

export default function TsunamiContent({
  tabBar,
  onLoadingChange,
  onOpenNarasi,
  isActive = true,
}: Props) {
  const { t } = useTranslation();
  const [eventGroups, setEventGroups] = useState<TsunamiEventGroup[]>([]);
  const [selectedEventIndex, setSelectedEventIndex] = useState(0);
  const [selectedWarningIndex, setSelectedWarningIndex] = useState(0);
  const [narasiAvailability, setNarasiAvailability] = useState<{
    warningId: string;
    url: string;
  } | null>(null);
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

  const shareLabels = useMemo(() => getShareQuakeLabels(t), [t]);
  const networkErrorTexts = useMemo(
    () => ({
      title: t("networkErrorModal.title"),
      description: t("networkErrorModal.description"),
      button: t("networkErrorModal.button"),
    }),
    [t],
  );
  const mapChromeLabels = useMemo(
    () => ({
      showFaultLines: t("map.showFaultLines"),
      showBmkgSeismicSensors: t("map.showBmkgSeismicSensors"),
      showGlobalSeismicSensors: t("map.showGlobalSeismicSensors"),
    }),
    [t],
  );
  const tsunamiMapSlideTitles = useMemo(
    () => ({
      shakemap: t("tsunamiMapSlides.shakemap"),
      wzmap: t("tsunamiMapSlides.wzmap"),
      ttmap: t("tsunamiMapSlides.ttmap"),
      sshmap: t("tsunamiMapSlides.sshmap"),
    }),
    [t],
  );
  const tsunamiInfoModalTexts = useMemo(
    () => ({
      title: t("tsunamiInfoModal.title"),
      subtitle: t("tsunamiInfoModal.subtitle"),
      tsunamiInfoLabel: t("tsunamiInfoModal.labelTsunamiInfo"),
      visualInfoTitle: t("tsunamiInfoModal.visualInfoTitle"),
      warningAreaTitle: t("tsunamiInfoModal.warningAreaTitle"),
      provinceLabel: t("tsunamiInfoModal.provinceLabel"),
      regionLabel: t("tsunamiInfoModal.regionLabel"),
      levelLabel: t("tsunamiInfoModal.levelLabel"),
      timeLabel: t("tsunamiInfoModal.timeLabel"),
      observationTitle: t("tsunamiInfoModal.observationTitle"),
      locationLabel: t("tsunamiInfoModal.locationLabel"),
      coordinateLabel: t("tsunamiInfoModal.coordinateLabel"),
      heightLabel: t("tsunamiInfoModal.heightLabel"),
      empty: t("tsunamiInfoModal.empty"),
    }),
    [t],
  );
  const getWarningUpdateLabel = useCallback(
    (index: number) => t("warningTabs.update", { number: index + 1 }),
    [t],
  );

  const selectedGroup = eventGroups[selectedEventIndex] ?? null;
  const selectedWarning =
    selectedGroup?.warnings[selectedWarningIndex] ??
    selectedGroup?.warnings[selectedGroup.latestWarningIndex] ??
    EMPTY_WARNING;
  const tsunamiMapSlides = useMemo(
    () => buildTsunamiMapSlides(selectedWarning, tsunamiMapSlideTitles),
    [selectedWarning, tsunamiMapSlideTitles],
  );
  const selectedWarningSubject = getWarningSubject(
    selectedWarning.subject,
    t("tsunamiScreen.defaultWarningSubject"),
  );
  const selectedNarasiUrl =
    narasiAvailability?.warningId === selectedWarning.id
      ? narasiAvailability.url
      : null;
  const selectedMapWzAreas = useMemo(
    () => toMapWzAreas(selectedWarning.wzAreas),
    [selectedWarning.wzAreas],
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
        subject: selectedWarningSubject,
        headline: selectedWarning.headline,
        description: selectedWarning.description,
      },
      "tsunami",
      shareLabels,
    );
  }, [selectedGroup, selectedWarning, selectedWarningSubject, shareLabels]);

  useEffect(() => {
    const candidateNarasiUrl = buildNarasiUrl(selectedWarning.shakemap);
    const warningId = selectedWarning.id;

    setNarasiAvailability(null);
    if (!candidateNarasiUrl || warningId === EMPTY_WARNING.id) return;

    const controller = new AbortController();
    checkTextAssetAvailable(candidateNarasiUrl, controller.signal).then(
      (available) => {
        if (!controller.signal.aborted && available) {
          setNarasiAvailability({ warningId, url: available });
        }
      },
    );

    return () => controller.abort();
  }, [selectedWarning.id, selectedWarning.shakemap]);

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
        wzAreas={selectedMapWzAreas}
        chromeLabels={mapChromeLabels}
        onMapPress={() => dismissCard()}
        onMarkerPressIndex={openGroupCard}
      />

      <View style={styles.topControls}>
        {tabBar}
        {showCard && (
          <Animated.View style={[styles.mapButtons, { opacity: btnOpacity }]}>
            {selectedNarasiUrl && onOpenNarasi && (
              <TouchableOpacity
                style={styles.mapButton}
                onPress={() => onOpenNarasi(selectedNarasiUrl)}
              >
                <Feather name="file-text" size={12} color="white" />
                <Text style={styles.mapButtonText}>{t("earthquake.officialNarrative")}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.mapButton}
              onPress={shareSelectedWarning}
            >
              <Feather name="share" size={12} color="white" />
              <Text style={styles.mapButtonText}>{t("common.share")}</Text>
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
              label={t("earthquake.magnitude")}
              styles={styles}
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="rss"
              value={selectedGroup.kedalaman}
              label={t("earthquake.depth")}
              styles={styles}
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="compass-outline"
              value={selectedGroup.latText}
              label={t("earthquake.latitude")}
              styles={styles}
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="compass-outline"
              value={selectedGroup.lonText}
              label={t("earthquake.longitude")}
              styles={styles}
            />
          </View>

          <View style={styles.separator} />

          <WarningTabs
            warnings={selectedGroup.warnings}
            selectedIndex={selectedWarningIndex}
            onSelect={setSelectedWarningIndex}
            updateLabel={getWarningUpdateLabel}
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: CARD_BODY_MAX_HEIGHT }}
          >
            <DetailItem
              icon="location"
              label={t("gempaDirasakanScreen.labelLocation")}
              value={safeText(selectedGroup.wilayah)}
              styles={styles}
            />
            <DetailItem
              icon="alert-circle-outline"
              label={t("tsunamiScreen.labelStatus")}
              value={selectedWarningSubject}
              styles={styles}
            />
            <DetailItem
              icon="time-outline"
              label={t("gempaDirasakanScreen.labelTime")}
              value={`${safeText(selectedGroup.tanggal)}, ${safeText(selectedGroup.jam)}`}
              styles={styles}
            />
            <DetailItem
              icon="megaphone-outline"
              label={t("tsunamiScreen.labelTsunamiInfo")}
              value={safeText(selectedWarning.headline)}
              valueNumberOfLines={3}
              styles={styles}
            />
          </ScrollView>

          <TouchableOpacity
            style={styles.simulasiBtn}
            activeOpacity={0.8}
            onPress={() => setTsunamiInfoVisible(true)}
          >
            <Text style={styles.simulasiBtnText}>{t("tsunamiScreen.btnFullInfo")}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <ModalTsunamiInfo
        visible={tsunamiInfoVisible}
        mapSlides={tsunamiMapSlides}
        wzAreas={selectedWarning.wzAreas}
        obsAreas={selectedWarning.obsAreas}
        headline={selectedWarning.headline}
        texts={tsunamiInfoModalTexts}
        onClose={() => setTsunamiInfoVisible(false)}
      />

      <NetworkErrorModal
        visible={networkErrorVisible}
        texts={networkErrorTexts}
        onClose={dismissNetworkError}
      />
    </View>
  );
}
