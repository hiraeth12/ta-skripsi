import type { TsunamiMapSlide } from "@/components/modal-tsunami-info";
import { ModalTsunamiInfo } from "@/components/modal-tsunami-info";
import EarthquakeMap from "@/components/ui/earthquake-map";
import { DetailItem, StatItem } from "@/components/ui/quake-card";
import { WarningTabs } from "@/components/warning-tabs";
import { getApp } from "@/config/firebase-init";
import type { MapViewType } from "@/constants/map";
import { checkTextAssetAvailable } from "@/features/main-menu/earthquake/utils/text-asset-utils";
import { buildNarasiUrl } from "@/features/main-menu/home/utils/coord-utils";
import { useCardAnimation } from "@/hooks/use-card-animation";
import { CACHE_KEYS, getCachedData, setCacheData } from "@/utils/cache";
import { formatLatText, formatLonText } from "@/utils/geo";
import {
  buildTsunamiMapSlides,
  safeText,
  type TsunamiMapSlideTitles,
} from "@/utils/tsunami-shared-utils";
import type { WzArea, WzLevel } from "@/utils/wzarea-highlights";
import { Feather } from "@expo/vector-icons";
import { getDatabase } from "@react-native-firebase/database";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Dimensions,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  describeRealtimeReadError,
  readRealtimeNode,
} from "../utils/read-realtime-node";
import {
  applyTsunamiHistoryFilters,
  normalizeTsunamiHistoryEvents,
  type TsunamiHistoryEvent,
  type TsunamiHistoryFilters,
  type TsunamiHistoryWarning,
} from "../utils/tsunami-history";
import styles from "./styles/gempa-dirasakan-history-content";

const DB_PATH = "tsunamiEvents";
const LIST_HIDE_TO_CARD_DELAY_MS = 340;
const CARD_BODY_MAX_HEIGHT = Dimensions.get("window").height * 0.4;
const CACHE_TTL_MS = 5 * 60_000;
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

function getWarningSubject(
  subject: string | undefined,
  fallback: string,
): string {
  const text = String(subject ?? "").trim();
  return text && text !== "-" ? text : fallback;
}

const EMPTY_WARNING: TsunamiHistoryWarning = {
  id: "empty",
  warningId: "empty",
  subject: "-",
  headline: "-",
  description: "-",
  instruction: "-",
  timesent: "-",
  timesentMs: Number.NEGATIVE_INFINITY,
  shakemap: "",
  wzmap: "",
  ttmap: "",
  sshmap: "",
  wzAreas: [],
  obsAreas: [],
  rawIndex: 0,
};

function getLatestWarning(
  event: TsunamiHistoryEvent | null,
): TsunamiHistoryWarning {
  if (!event) return EMPTY_WARNING;
  return (
    event.warnings[event.latestWarningIndex] ??
    event.warnings[0] ??
    EMPTY_WARNING
  );
}

function buildExternalEvent(selection: ExternalSelection): TsunamiHistoryEvent {
  return {
    id: selection.eventId,
    eventKey: selection.eventId,
    latitude: selection.latitude,
    longitude: selection.longitude,
    magnitude: safeText(selection.magnitude),
    depth: safeText(selection.kedalaman),
    area: safeText(selection.lokasi),
    date: safeText(selection.tanggal),
    time: safeText(selection.jam),
    latText: formatLatText(selection.latitude),
    lonText: formatLonText(selection.longitude),
    latestWarningId: safeText(selection.latestWarningId, ""),
    latestSubject: safeText(selection.status),
    latestHeadline: safeText(selection.headline),
    latestTimesent: "-",
    latestWarningIndex: 0,
    warnings: [],
    createdAt: "",
    updatedAt: "",
    sortTimeMs: Number.NEGATIVE_INFINITY,
  };
}

function preloadMapSlides(slides: TsunamiMapSlide[]): void {
  slides.forEach((slide) => {
    if (slide.imageUrl) Image.prefetch(slide.imageUrl).catch(() => {});
  });
}

type ExternalSelection = {
  eventId: string;
  latitude: number;
  longitude: number;
  magnitude: string;
  lokasi: string;
  tanggal: string;
  jam: string;
  kedalaman: string;
  status?: string;
  headline?: string;
  latestWarningId?: string;
};

export type TsunamiHistoryListItem = {
  eventId: string;
  magnitude: string;
  lokasi: string;
  waktu: string;
  status: string;
};

type Props = {
  tabBar: React.ReactNode;
  onLoadingChange?: (loading: boolean) => void;
  onListDataChange?: (items: TsunamiHistoryListItem[]) => void;
  selectedListEventId?: string | null;
  onListSelectionHandled?: () => void;
  onCardClose?: () => void;
  onCardOpen?: () => void;
  onOpenNarasi?: (url: string) => void;
  externalSelection?: ExternalSelection | null;
  isActive?: boolean;
  filters?: TsunamiHistoryFilters;
};

export function TsunamiHistoryContent({
  tabBar,
  onLoadingChange,
  onListDataChange,
  selectedListEventId,
  onListSelectionHandled,
  onCardClose,
  onCardOpen,
  onOpenNarasi,
  externalSelection,
  isActive = true,
  filters,
}: Props) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<TsunamiHistoryEvent[]>([]);

  useEffect(() => {
    const cached = getCachedData<TsunamiHistoryEvent[]>(
      CACHE_KEYS.TSUNAMI_HISTORY,
    );
    if (cached && cached.length > 0) {
      setEvents(cached);
    }
  }, []); 
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [overrideEvent, setOverrideEvent] =
    useState<TsunamiHistoryEvent | null>(null);
  const [selectedWarningIndex, setSelectedWarningIndex] = useState(0);
  const [narasiWarning, setNarasiWarning] = useState<{
    warningId: string;
    url: string;
  } | null>(null);
  const [tsunamiInfoVisible, setTsunamiInfoVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mapChromeLabels = useMemo(
    () => ({
      showFaultLines: t("map.showFaultLines"),
      showBmkgSeismicSensors: t("map.showBmkgSeismicSensors"),
      showGlobalSeismicSensors: t("map.showGlobalSeismicSensors"),
    }),
    [t],
  );
  const tsunamiMapSlideTitles = useMemo<TsunamiMapSlideTitles>(
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
  const readErrorMessages = useMemo(
    () => ({
      permissionDenied: (label: string) =>
        t("historyErrors.firebasePermission", { label }),
      timeout: (label: string) =>
        t("historyErrors.firebaseTimeout", { label }),
      fallback: () => t("historyErrors.loadFailed"),
    }),
    [t],
  );

  const mapRef = useRef<MapViewType | null>(null);
  const selectedEventIdRef = useRef<string | null>(null);
  const lastExternalIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const openCardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeEvent: TsunamiHistoryEvent | null =
    selectedIndex !== null && events[selectedIndex]
      ? events[selectedIndex]
      : overrideEvent;

  const activeWarning =
    activeEvent?.warnings[selectedWarningIndex] ??
    getLatestWarning(activeEvent);
  const activeWarningKey = activeWarning.warningId || activeWarning.id;
  const activeNarasiUrl =
    narasiWarning?.warningId === activeWarningKey ? narasiWarning.url : null;

  const tsunamiMapSlides = useMemo(
    () => buildTsunamiMapSlides(activeWarning, tsunamiMapSlideTitles),
    [activeWarning, tsunamiMapSlideTitles],
  );
  const activeWarningSubject = getWarningSubject(
    activeEvent?.warnings.length
      ? activeWarning.subject
      : activeEvent?.latestSubject,
    t("tsunamiScreen.defaultWarningSubject"),
  );
  const activeMapWzAreas = useMemo(
    () => toMapWzAreas(activeWarning.wzAreas),
    [activeWarning.wzAreas],
  );

  const markerCoordinates = useMemo(
    () =>
      events.map((event) => ({
        latitude: event.latitude,
        longitude: event.longitude,
        magnitude: event.magnitude,
        depth: event.depth,
        eventId: event.eventKey,
      })),
    [events],
  );

  const listItems = useMemo(
    () =>
      events.map((event) => ({
        eventId: event.eventKey,
        magnitude: event.magnitude,
        lokasi: event.area,
        waktu: `${event.time} • ${event.date}`,
        status: event.latestSubject,
      })),
    [events],
  );

  const modalHeadline =
    activeEvent && activeEvent.warnings.length > 0
      ? activeWarning.headline
      : activeEvent?.latestHeadline;

  useEffect(() => {
    const candidateNarasiUrl = activeWarning.shakemap
      ? buildNarasiUrl(activeWarning.shakemap)
      : null;

    setNarasiWarning(null);
    if (!candidateNarasiUrl || activeWarningKey === EMPTY_WARNING.id) return;

    const controller = new AbortController();

    void checkTextAssetAvailable(candidateNarasiUrl, controller.signal).then(
      (availableUrl) => {
        if (!controller.signal.aborted && availableUrl) {
          setNarasiWarning({
            warningId: activeWarningKey,
            url: availableUrl,
          });
        }
      },
    );

    return () => controller.abort();
  }, [activeWarning.shakemap, activeWarningKey]);

  useEffect(() => {
    if (tsunamiMapSlides.length > 0) {
      preloadMapSlides(tsunamiMapSlides);
    }
  }, [tsunamiMapSlides]);

  const clearCardSelection = useCallback(() => {
    setTsunamiInfoVisible(false);
    setSelectedIndex(null);
    setOverrideEvent(null);
    selectedEventIdRef.current = null;
    lastExternalIdRef.current = null;
  }, []);

  const handleSwipeDismiss = useCallback(() => {
    clearCardSelection();
    onCardClose?.();
  }, [clearCardSelection, onCardClose]);

  const {
    showCard,
    showCardRef,
    translateY,
    opacity,
    btnOpacity,
    panResponder,
    openCard: openCardAnimation,
    dismissCard: dismissCardAnimation,
    closeCardForReplacement,
    hideCardImmediately,
  } = useCardAnimation({ onSwipeDismiss: handleSwipeDismiss });

  const openCard = useCallback(
    (notifyParent = true) => {
      if (notifyParent) onCardOpen?.();
      openCardAnimation();
    },
    [onCardOpen, openCardAnimation],
  );

  const dismissCard = useCallback(
    (callback?: () => void) => {
      dismissCardAnimation(() => {
        clearCardSelection();
        onCardClose?.();
        callback?.();
      });
    },
    [clearCardSelection, dismissCardAnimation, onCardClose],
  );

  const flyToAndOpen = useCallback(
    (event: TsunamiHistoryEvent, delay = 300, notifyParent = true) => {
      if (openCardTimeoutRef.current) {
        clearTimeout(openCardTimeoutRef.current);
      }

      mapRef.current?.animateToRegion(
        {
          latitude: event.latitude - 0.12,
          longitude: event.longitude,
          latitudeDelta: 2,
          longitudeDelta: 2,
        },
        400,
      );
      openCardTimeoutRef.current = setTimeout(() => {
        openCardTimeoutRef.current = null;
        openCard(notifyParent);
      }, delay);
    },
    [openCard],
  );

  const selectEvent = useCallback(
    (event: TsunamiHistoryEvent, index: number | null, notifyParent = true) => {
      selectedEventIdRef.current = event.eventKey;
      setSelectedWarningIndex(event.latestWarningIndex);
      if (index === null) {
        setSelectedIndex(null);
        setOverrideEvent(event);
      } else {
        setOverrideEvent(null);
        setSelectedIndex(index);
      }
      flyToAndOpen(event, LIST_HIDE_TO_CARD_DELAY_MS, notifyParent);
    },
    [flyToAndOpen],
  );

  const onPressMarker = useCallback(
    (index: number) => {
      const event = events[index];
      if (!event) return;
      onCardOpen?.();
      closeCardForReplacement(() => selectEvent(event, index, false));
    },
    [closeCardForReplacement, events, onCardOpen, selectEvent],
  );

  useEffect(() => {
    return () => {
      if (openCardTimeoutRef.current) clearTimeout(openCardTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isActive) {
      hideCardImmediately();
      clearCardSelection();
    }
  }, [clearCardSelection, hideCardImmediately, isActive]);

  useEffect(() => {
    onListDataChange?.(listItems);
  }, [listItems, onListDataChange]);

  useEffect(() => {
    if (!isActive) return;
    isMountedRef.current = true;

    const app = getApp();
    const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
    const db = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);

    const runFetch = async () => {
      setLoading(true);
      setErrorMessage(null);
      onLoadingChange?.(true);

      try {
        const rawData = await readRealtimeNode(db, dbUrl, DB_PATH);
        if (!isMountedRef.current) return;

        if (!rawData) {
          setEvents([]);
          return;
        }

        const normalized = normalizeTsunamiHistoryEvents(rawData);
        const filtered = applyTsunamiHistoryFilters(normalized, filters ?? {});

        // Simpan ke cache agar cold start lebih cepat
        setCacheData(CACHE_KEYS.TSUNAMI_HISTORY, filtered, CACHE_TTL_MS);

        setEvents(filtered);

        const foundIndex = selectedEventIdRef.current
          ? filtered.findIndex(
              (event) => event.eventKey === selectedEventIdRef.current,
            )
          : -1;

        if (overrideEvent && foundIndex >= 0) setOverrideEvent(null);
        if (showCardRef.current && foundIndex >= 0) {
          setSelectedIndex(foundIndex);
          setSelectedWarningIndex(filtered[foundIndex].latestWarningIndex);
        }

        if (!showCardRef.current && filtered[0]) {
          mapRef.current?.animateToRegion(
            {
              latitude: filtered[0].latitude,
              longitude: filtered[0].longitude,
              latitudeDelta: 2,
              longitudeDelta: 2,
            },
            800,
          );
        }
      } catch (error) {
        console.warn("[TsunamiHistory] Failed to load tsunami history:", error);
        if (isMountedRef.current) {
          setEvents([]);
          setErrorMessage(
            describeRealtimeReadError(
              error,
              t("historyErrors.tsunamiHistoryLabel"),
              readErrorMessages,
            ),
          );
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          onLoadingChange?.(false);
        }
      }
    };

    void runFetch();

    return () => {
      isMountedRef.current = false;
    };
  }, [
    filters,
    isActive,
    onLoadingChange,
    overrideEvent,
    readErrorMessages,
    t,
  ]);

  useEffect(() => {
    if (!externalSelection?.eventId) return;
    if (lastExternalIdRef.current === externalSelection.eventId) return;
    if (!isActive) return;
    lastExternalIdRef.current = externalSelection.eventId;

    const targetIndex = events.findIndex(
      (event) => event.eventKey === externalSelection.eventId,
    );
    const event =
      targetIndex >= 0
        ? events[targetIndex]
        : buildExternalEvent(externalSelection);

    selectEvent(event, targetIndex >= 0 ? targetIndex : null);
    onListSelectionHandled?.();
  }, [
    events,
    externalSelection,
    isActive,
    onListSelectionHandled,
    selectEvent,
  ]);

  useEffect(() => {
    if (!selectedListEventId || events.length === 0) return;
    const targetIndex = events.findIndex(
      (event) => event.eventKey === selectedListEventId,
    );
    if (targetIndex < 0) {
      onListSelectionHandled?.();
      return;
    }

    selectEvent(events[targetIndex], targetIndex);
    onListSelectionHandled?.();
  }, [events, onListSelectionHandled, selectedListEventId, selectEvent]);

  return (
    <View style={styles.container}>
      <EarthquakeMap
        mapRef={mapRef}
        markerCoordinates={markerCoordinates}
        temporaryMarkerCoordinate={
          overrideEvent && selectedIndex === null
            ? {
                latitude: overrideEvent.latitude,
                longitude: overrideEvent.longitude,
                magnitude: overrideEvent.magnitude,
                depth: overrideEvent.depth,
              }
            : null
        }
        onMapPress={() => dismissCard()}
        onMarkerPressIndex={onPressMarker}
        isCardOpen={showCard}
        wzAreas={activeMapWzAreas}
        chromeLabels={mapChromeLabels}
      />

      <View style={styles.topControls}>
        {tabBar}
        {showCard && activeNarasiUrl && onOpenNarasi && (
          <Animated.View style={[styles.mapButtons, { opacity: btnOpacity }]}>
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => onOpenNarasi(activeNarasiUrl)}
            >
              <Feather name="file-text" size={12} color="white" />
              <Text style={styles.mapButtonText}>
                {t("earthquake.officialNarrative")}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {showCard && activeEvent && (
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
              value={activeEvent.magnitude}
              label={t("earthquake.magnitude")}
              styles={styles}
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="rss"
              value={activeEvent.depth}
              label={t("earthquake.depth")}
              styles={styles}
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="compass-outline"
              value={activeEvent.latText}
              label={t("earthquake.latitude")}
              styles={styles}
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="compass-outline"
              value={activeEvent.lonText}
              label={t("earthquake.longitude")}
              styles={styles}
            />
          </View>

          <View style={styles.separator} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: CARD_BODY_MAX_HEIGHT }}
          >
            <WarningTabs
              warnings={activeEvent.warnings}
              selectedIndex={selectedWarningIndex}
              onSelect={setSelectedWarningIndex}
              updateLabel={getWarningUpdateLabel}
            />

            <DetailItem
              icon="location"
              label={t("gempaDirasakanScreen.labelLocation")}
              value={activeEvent.area}
              styles={styles}
            />
            <DetailItem
              icon="time-outline"
              label={t("gempaDirasakanScreen.labelTime")}
              value={`${activeEvent.date}, ${activeEvent.time}`}
              styles={styles}
            />
            <DetailItem
              icon="alert-circle-outline"
              label={t("tsunamiScreen.labelStatus")}
              value={activeWarningSubject}
              styles={styles}
            />
            <DetailItem
              icon="megaphone-outline"
              label={t("tsunamiScreen.labelTsunamiInfo")}
              value={
                activeEvent.warnings.length > 0
                  ? activeWarning.headline
                  : activeEvent.latestHeadline
              }
              styles={styles}
              valueNumberOfLines={3}
            />
          </ScrollView>

          <TouchableOpacity
            style={styles.simulasiBtn}
            activeOpacity={0.8}
            onPress={() => setTsunamiInfoVisible(true)}
          >
            <Text style={styles.simulasiBtnText}>
              {t("tsunamiScreen.btnFullInfo")}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <ModalTsunamiInfo
        visible={tsunamiInfoVisible}
        mapSlides={tsunamiMapSlides}
        wzAreas={activeWarning.wzAreas}
        obsAreas={activeWarning.obsAreas}
        headline={modalHeadline}
        texts={tsunamiInfoModalTexts}
        onClose={() => setTsunamiInfoVisible(false)}
      />
    </View>
  );
}

export default function TsunamiHistoryRoute() {
  return <TsunamiHistoryContent tabBar={null} />;
}
