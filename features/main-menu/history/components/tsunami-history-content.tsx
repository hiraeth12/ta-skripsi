import EarthquakeMap from "@/components/earthquake-map";
import { getApp } from "@/config/firebase-init";
import type { MapViewType } from "@/constants/map";
import { ModalTsunamiInfo } from "@/features/main-menu/earthquake/components/modal-tsunami-info";
import { useCardAnimation } from "@/hooks/use-card-animation";
import { formatLatText, formatLonText } from "@/utils/geo";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { getDatabase } from "@react-native-firebase/database";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  applyTsunamiHistoryFilters,
  buildTsunamiMapSlides,
  getWarningTabLabel,
  normalizeTsunamiHistoryEvents,
  safeText,
  type TsunamiHistoryEvent,
  type TsunamiHistoryFilters,
  type TsunamiHistoryWarning,
} from "../utils/tsunami-history";
import {
  describeRealtimeReadError,
  readRealtimeNode,
} from "../utils/read-realtime-node";
import styles from "./styles/gempa-dirasakan-history-content";

const DB_PATH = "tsunamiEvents";
const LIST_HIDE_TO_CARD_DELAY_MS = 340;

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

function getLatestWarning(event: TsunamiHistoryEvent | null): TsunamiHistoryWarning {
  if (!event) return EMPTY_WARNING;
  return event.warnings[event.latestWarningIndex] ?? event.warnings[0] ?? EMPTY_WARNING;
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

const StatItem = ({ icon, value, label }: { icon: string; value: string; label: string }) => (
  <View style={styles.statTopItem}>
    <MaterialCommunityIcons name={icon as never} size={20} color="#0369A1" />
    <Text style={styles.statTopValue}>{safeText(value)}</Text>
    <Text style={styles.statTopLabel}>{label}</Text>
  </View>
);

const DetailItem = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon as never} size={18} color="#1E6F9F" style={styles.infoIcon} />
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{safeText(value)}</Text>
    </View>
  </View>
);

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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [overrideEvent, setOverrideEvent] = useState<TsunamiHistoryEvent | null>(null);
  const [selectedWarningIndex, setSelectedWarningIndex] = useState(0);
  const [tsunamiInfoVisible, setTsunamiInfoVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mapRef = useRef<MapViewType | null>(null);
  const selectedEventIdRef = useRef<string | null>(null);
  const lastExternalIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const openCardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const activeEvent: TsunamiHistoryEvent | null =
    selectedIndex !== null && events[selectedIndex]
      ? events[selectedIndex]
      : overrideEvent;
  const activeWarning =
    activeEvent?.warnings[selectedWarningIndex] ?? getLatestWarning(activeEvent);
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

  const openCard = useCallback((notifyParent = true) => {
    if (notifyParent) onCardOpen?.();
    openCardAnimation();
  }, [onCardOpen, openCardAnimation]);

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
        setEvents(filtered);

        const foundIndex = selectedEventIdRef.current
          ? filtered.findIndex((event) => event.eventKey === selectedEventIdRef.current)
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
  }, [events, externalSelection, isActive, onListSelectionHandled, selectEvent]);

  useEffect(() => {
    if (!selectedListEventId || events.length === 0) return;
    const targetIndex = events.findIndex((event) => event.eventKey === selectedListEventId);
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
          style={[styles.locationCard, { transform: [{ translateY }], opacity }]}
        >
          <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
            <View style={styles.dragHandle} />
          </View>

          <View style={styles.statsTopRow}>
            <StatItem icon="triangle-wave" value={activeEvent.magnitude} label="Magnitudo" />
            <View style={styles.statTopDivider} />
            <StatItem icon="rss" value={activeEvent.depth} label="Kedalaman" />
            <View style={styles.statTopDivider} />
            <StatItem icon="compass-outline" value={activeEvent.latText} label="LS" />
            <View style={styles.statTopDivider} />
            <StatItem icon="compass-outline" value={activeEvent.lonText} label="BT" />
          </View>

          <View style={styles.separator} />

          <WarningTabs
            warnings={activeEvent.warnings}
            selectedIndex={selectedWarningIndex}
            onSelect={setSelectedWarningIndex}
          />

          <DetailItem icon="location" label="Lokasi Gempa :" value={activeEvent.area} />
          <DetailItem
            icon="time-outline"
            label="Waktu :"
            value={`${activeEvent.date}, ${activeEvent.time}`}
          />
          <DetailItem
            icon="alert-circle-outline"
            label="Status :"
            value={
              activeEvent.warnings.length > 0
                ? activeWarning.subject
                : activeEvent.latestSubject
            }
          />
          <DetailItem
            icon="megaphone-outline"
            label="Informasi Tsunami :"
            value={
              activeEvent.warnings.length > 0
                ? activeWarning.headline
                : activeEvent.latestHeadline
            }
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
        wzAreas={activeWarning.wzAreas}
        obsAreas={activeWarning.obsAreas}
        onClose={() => setTsunamiInfoVisible(false)}
      />
    </View>
  );
}

function WarningTabs({
  warnings,
  selectedIndex,
  onSelect,
}: {
  warnings: TsunamiHistoryWarning[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const safeWarnings = warnings.length > 0 ? warnings : [EMPTY_WARNING];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={localStyles.warningTabs}
    >
      {safeWarnings.map((warning, index) => {
        const isSelected = selectedIndex === index;
        return (
          <TouchableOpacity
            key={`${warning.id}-${index}`}
            activeOpacity={0.85}
            onPress={() => onSelect(index)}
            style={[
              localStyles.warningTab,
              isSelected && localStyles.warningTabActive,
            ]}
          >
            <Text
              style={[
                localStyles.warningTabText,
                isSelected && localStyles.warningTabTextActive,
              ]}
            >
              {getWarningTabLabel(warning.subject, index)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const localStyles = StyleSheet.create({
  statePill: {
    position: "absolute",
    top: 122,
    left: 20,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  stateText: {
    color: "#0C4A6E",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  warningTabs: {
    gap: 8,
    paddingBottom: 10,
  },
  warningTab: {
    borderWidth: 1,
    borderColor: "#D0E3EE",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF",
  },
  warningTabActive: {
    borderColor: "#0369A1",
    backgroundColor: "#E0F2FE",
  },
  warningTabText: {
    color: "#1E3A5F",
    fontSize: 12,
    fontWeight: "700",
  },
  warningTabTextActive: {
    color: "#0369A1",
  },
});

export default function TsunamiHistoryRoute() {
  return <TsunamiHistoryContent tabBar={null} />;
}
