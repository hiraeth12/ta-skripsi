import type { TsunamiMapSlide } from "@/components/modal-tsunami-info";
import { ModalTsunamiInfo } from "@/components/modal-tsunami-info";
import EarthquakeMap from "@/components/ui/earthquake-map";
import { DetailItem, StatItem } from "@/components/ui/quake-card";
import { WarningTabs } from "@/components/warning-tabs";
import { getApp } from "@/config/firebase-init";
import type { MapViewType } from "@/constants/map";
import { useCardAnimation } from "@/hooks/use-card-animation";
import { CACHE_KEYS, getCachedData, setCacheData } from "@/utils/cache";
import { formatLatText, formatLonText } from "@/utils/geo";
import { buildTsunamiMapSlides, safeText } from "@/utils/tsunami-shared-utils";
import { getDatabase } from "@react-native-firebase/database";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  externalSelection,
  isActive = true,
  filters,
}: Props) {
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
  const [tsunamiInfoVisible, setTsunamiInfoVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const tsunamiMapSlides = useMemo(
    () => buildTsunamiMapSlides(activeWarning),
    [activeWarning],
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
          setErrorMessage(describeRealtimeReadError(error, "riwayat tsunami"));
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
  }, [filters, isActive, onLoadingChange, overrideEvent]);

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
      />

      <View style={styles.topControls}>{tabBar}</View>

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
              label="Magnitudo"
              styles={styles}
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="rss"
              value={activeEvent.depth}
              label="Kedalaman"
              styles={styles}
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="compass-outline"
              value={activeEvent.latText}
              label="LS"
              styles={styles}
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="compass-outline"
              value={activeEvent.lonText}
              label="BT"
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
            />

            <DetailItem
              icon="location"
              label="Lokasi Gempa :"
              value={activeEvent.area}
              styles={styles}
            />
            <DetailItem
              icon="time-outline"
              label="Waktu :"
              value={`${activeEvent.date}, ${activeEvent.time}`}
              styles={styles}
            />
            <DetailItem
              icon="alert-circle-outline"
              label="Status :"
              value={
                activeEvent.warnings.length > 0
                  ? activeWarning.subject
                  : activeEvent.latestSubject
              }
              styles={styles}
            />
            <DetailItem
              icon="megaphone-outline"
              label="Informasi Tsunami :"
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
            <Text style={styles.simulasiBtnText}>INFORMASI LENGKAP</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <ModalTsunamiInfo
        visible={tsunamiInfoVisible}
        mapSlides={tsunamiMapSlides}
        wzAreas={activeWarning.wzAreas}
        obsAreas={activeWarning.obsAreas}
        headline={modalHeadline}
        onClose={() => setTsunamiInfoVisible(false)}
      />
    </View>
  );
}

export default function TsunamiHistoryRoute() {
  return <TsunamiHistoryContent tabBar={null} />;
}
