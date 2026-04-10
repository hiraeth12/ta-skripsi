import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    AppState,
    InteractionManager,
    PanResponder,
    StyleSheet,
    Text,
    View,
} from "react-native";
import type MapView from "react-native-maps";

import EarthquakeMap from "@/components/earthquake-map";

const API_URL = process.env.EXPO_PUBLIC_GEMPA_TERDETEKSI_HISTORY!;
const MIN_POLL_MS = 10_000;
const MAX_POLL_MS = 60_000;
const MAX_POINTS = 15;

type QuakeItem = {
  eventId: string;
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

type ExternalSelection = {
  eventId: string;
  latitude: number;
  longitude: number;
  magnitude: string;
  lokasi: string;
  tanggal: string;
  jam: string;
  distanceKm: string;
  kedalaman: string;
  felt: string;
};

export type HistoryListItem = {
  eventId: string;
  magnitude: string;
  lokasi: string;
  waktu: string;
  jarak: string;
};

type Props = {
  tabBar: React.ReactNode;
  onLoadingChange?: (loading: boolean) => void;
  onListDataChange?: (items: HistoryListItem[]) => void;
  selectedListEventId?: string | null;
  onListSelectionHandled?: () => void;
  externalSelection?: ExternalSelection | null;
  isActive?: boolean;
};

function withCacheBuster(url: string) {
  const base = url.trim();
  const separator = base.includes("?")
    ? base.endsWith("?") || base.endsWith("&")
      ? ""
      : "&"
    : "?";
  return `${base}${separator}t=${Date.now()}`;
}

export function GempaTerdeteksiHistoryContent({
  tabBar,
  onLoadingChange,
  onListDataChange,
  selectedListEventId,
  onListSelectionHandled,
  externalSelection,
  isActive = true,
}: Props) {
  const [quakes, setQuakes] = useState<QuakeItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showCard, setShowCard] = useState(false);
  const [temporarySelection, setTemporarySelection] = useState<QuakeItem | null>(null);

  const selectedEventIdRef = useRef<string | null>(null);
  const latestDataSignature = useRef<string | null>(null);
  const lastExternalSelectionIdRef = useRef<string | null>(null);
  const temporarySelectionRef = useRef<QuakeItem | null>(null);
  const isFirstLoad = useRef(true);
  const isFetching = useRef(false);
  const showCardRef = useRef(false);
  const pollDelayRef = useRef(MIN_POLL_MS);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const mapRef = useRef<MapView | null>(null);
  const translateY = useRef(new Animated.Value(600)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const selectedQuake =
    selectedIndex !== null && quakes[selectedIndex]
      ? quakes[selectedIndex]
      : temporarySelection;

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
          ]).start(() => setShowCard(false));
        } else {
          Animated.parallel([
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    showCardRef.current = showCard;
  }, [showCard]);

  useEffect(() => {
    temporarySelectionRef.current = temporarySelection;
  }, [temporarySelection]);

  const openCard = useCallback(() => {
    translateY.setValue(600);
    opacity.setValue(0);
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
    ]).start();
  }, [opacity, translateY]);

  const dismissCard = useCallback((callback?: () => void) => {
    if (showCardRef.current) {
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
      ]).start(() => {
        setShowCard(false);
        temporarySelectionRef.current = null;
        setTemporarySelection(null);
        callback?.();
      });
    } else {
      callback?.();
    }
  }, [opacity, translateY]);

  const onPressMarker = useCallback((index: number) => {
    if (!quakes[index]) return;
    selectedEventIdRef.current = quakes[index].eventId;
    setSelectedIndex(index);
    openCard();
  }, [openCard, quakes]);

  const markerCoordinates = useMemo(
    () =>
      quakes.map((quake) => ({
        latitude: quake.latitude,
        longitude: quake.longitude,
        magnitude: quake.magnitude,
        depth: quake.kedalaman,
        eventId: quake.eventId,
      })),
    [quakes],
  );

  const listItems = useMemo(
    () =>
      quakes.map((quake) => ({
        eventId: quake.eventId,
        magnitude: quake.magnitude,
        lokasi: quake.wilayah,
        waktu: `${quake.jam} • ${quake.tanggal}`,
        jarak: "-",
      })),
    [quakes],
  );

  const handleMapPress = useCallback(() => dismissCard(), [dismissCard]);
  const handleMarkerPressIndex = useCallback(
    (index: number) => onPressMarker(index),
    [onPressMarker],
  );

  useEffect(() => {
    if (!externalSelection?.eventId) return;
    if (lastExternalSelectionIdRef.current === externalSelection.eventId) return;

    const targetIndex = quakes.findIndex(
      (quake) => quake.eventId === externalSelection.eventId,
    );
    const targetQuake: QuakeItem = {
      eventId: externalSelection.eventId,
      latitude: externalSelection.latitude,
      longitude: externalSelection.longitude,
      magnitude: externalSelection.magnitude,
      wilayah: externalSelection.lokasi,
      tanggal: externalSelection.tanggal,
      jam: externalSelection.jam,
      kedalaman: externalSelection.kedalaman,
      felt: externalSelection.felt,
      latText: `${Math.abs(externalSelection.latitude).toFixed(2)}°${externalSelection.latitude < 0 ? "LS" : "LU"}`,
      lonText: `${Math.abs(externalSelection.longitude).toFixed(2)}°${externalSelection.longitude >= 0 ? "BT" : "BB"}`,
    };

    selectedEventIdRef.current = externalSelection.eventId;
    lastExternalSelectionIdRef.current = externalSelection.eventId;

    if (targetIndex >= 0) {
      setTemporarySelection(null);
      setSelectedIndex(targetIndex);
      openCard();
      mapRef.current?.animateToRegion(
        {
          latitude: targetQuake.latitude,
          longitude: targetQuake.longitude,
          latitudeDelta: 2,
          longitudeDelta: 2,
        },
        800,
      );
      onListSelectionHandled?.();
      return;
    }

    setSelectedIndex(null);
    setTemporarySelection(targetQuake);
    openCard();
    mapRef.current?.animateToRegion(
      {
        latitude: targetQuake.latitude,
        longitude: targetQuake.longitude,
        latitudeDelta: 2,
        longitudeDelta: 2,
      },
      800,
    );
    onListSelectionHandled?.();
  }, [externalSelection, onListSelectionHandled, openCard, quakes]);

  useEffect(() => {
    onListDataChange?.(listItems);
  }, [listItems, onListDataChange]);

  useEffect(() => {
    if (!selectedListEventId || quakes.length === 0) return;
    const targetIndex = quakes.findIndex(
      (quake) => quake.eventId === selectedListEventId,
    );
    if (targetIndex < 0) {
      onListSelectionHandled?.();
      return;
    }

    const targetQuake = quakes[targetIndex];
    selectedEventIdRef.current = targetQuake.eventId;
    setSelectedIndex(targetIndex);
    openCard();
    mapRef.current?.animateToRegion(
      {
        latitude: targetQuake.latitude,
        longitude: targetQuake.longitude,
        latitudeDelta: 2,
        longitudeDelta: 2,
      },
      500,
    );
    onListSelectionHandled?.();
  }, [onListSelectionHandled, openCard, quakes, selectedListEventId]);

  useEffect(() => {
    if (!isActive) return;
    isMountedRef.current = true;

    async function fetchLatestQuake(silent = true): Promise<boolean> {
      if (isFetching.current) return false;
      isFetching.current = true;

      if (!silent) onLoadingChange?.(true);

      try {
        if (!API_URL) {
          console.error(
            "GEMPA_TERDETEKSI_HISTORY is undefined - restart Metro with --clear",
          );
          return false;
        }

        const res = await fetch(withCacheBuster(API_URL));
        const data = await res.json();

        const features = data?.features;
        if (!Array.isArray(features) || features.length === 0) return false;

        const sorted = [...features].sort((a, b) => {
          const tA = String(a?.properties?.time ?? "");
          const tB = String(b?.properties?.time ?? "");
          return tB.localeCompare(tA);
        });

        const normalized = sorted
          .slice(0, MAX_POINTS)
          .map((feature: any, index: number): QuakeItem | null => {
            const props = feature?.properties ?? {};
            const coords = feature?.geometry?.coordinates;
            const longitude = parseFloat(coords?.[0] ?? "0");
            const latitude = parseFloat(coords?.[1] ?? "0");
            if (isNaN(latitude) || isNaN(longitude)) return null;

            const [tanggal, jamRaw] = String(props.time ?? "").split(" ");
            const jam = (jamRaw ?? "").split(".")[0];
            const absLat = Math.abs(latitude).toFixed(2);
            const absLon = Math.abs(longitude).toFixed(2);

            const eventId = String(
              props.eventid ??
                props.identifier ??
                `${props.time ?? ""}-${latitude}-${longitude}-${index}`,
            );

            return {
              eventId,
              latitude,
              longitude,
              magnitude: parseFloat(props.mag ?? "0").toFixed(1),
              wilayah: String(props.place ?? ""),
              tanggal: tanggal ?? "",
              jam: jam ?? "",
              kedalaman: `${parseFloat(props.depth ?? "0").toFixed(1)} km`,
              felt: String(props.fase ?? ""),
              latText: `${absLat}°${latitude < 0 ? "LS" : "LU"}`,
              lonText: `${absLon}°${longitude >= 0 ? "BT" : "BB"}`,
            };
          })
          .filter((item: QuakeItem | null): item is QuakeItem => Boolean(item));

        if (normalized.length === 0) return false;

        const signature = normalized.map((item) => item.eventId).join("|");
        if (signature === latestDataSignature.current) return false;
        latestDataSignature.current = signature;

        let foundIndex = -1;
        if (selectedEventIdRef.current) {
          foundIndex = normalized.findIndex(
            (item) => item.eventId === selectedEventIdRef.current,
          );
        }

        const currentTemporarySelection = temporarySelectionRef.current;
        const hasTemporarySelection =
          currentTemporarySelection?.eventId !== undefined &&
          currentTemporarySelection.eventId === selectedEventIdRef.current;
        const keepTemporarySelection = hasTemporarySelection && foundIndex < 0;

        setQuakes(normalized);

        if (keepTemporarySelection) {
          setSelectedIndex(null);
          return true;
        }

        const nextSelectedIndex = foundIndex >= 0 ? foundIndex : 0;
        const focusQuake = normalized[nextSelectedIndex];
        selectedEventIdRef.current = focusQuake?.eventId ?? null;
        setTemporarySelection(null);
        setSelectedIndex(nextSelectedIndex);

        if (!focusQuake) return true;

        if (isFirstLoad.current) {
          isFirstLoad.current = false;
          mapRef.current?.animateToRegion(
            {
              latitude: focusQuake.latitude,
              longitude: focusQuake.longitude,
              latitudeDelta: 2,
              longitudeDelta: 2,
            },
            800,
          );
        } else {
          mapRef.current?.animateToRegion(
            {
              latitude: focusQuake.latitude,
              longitude: focusQuake.longitude,
              latitudeDelta: 2,
              longitudeDelta: 2,
            },
            600,
          );
        }

        return true;
      } catch (e) {
        console.error("Failed to fetch gempa terdeteksi history:", e);
        return false;
      } finally {
        if (!silent) onLoadingChange?.(false);
        isFetching.current = false;
      }
    }

    function clearPollTimer() {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
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
      if (!isMountedRef.current) return;
      const changed = await fetchLatestQuake(true);
      scheduleNextPoll(changed);
    }

    InteractionManager.runAfterInteractions(() => {
      if (!isMountedRef.current) return;
      fetchLatestQuake(false).then((changed) => {
        scheduleNextPoll(changed);
      });
    });

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
        markerCoordinates={markerCoordinates}
        temporaryMarkerCoordinate={
          temporarySelection
            ? {
                latitude: temporarySelection.latitude,
                longitude: temporarySelection.longitude,
                magnitude: temporarySelection.magnitude,
                depth: temporarySelection.kedalaman,
              }
            : null
        }
        onMapPress={handleMapPress}
        onMarkerPressIndex={handleMarkerPressIndex}
      />

      <View style={styles.topControls}>{tabBar}</View>

      {showCard && selectedQuake && (
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
            <View style={styles.statTopItem}>
              <MaterialCommunityIcons
                name="triangle-wave"
                size={20}
                color="#0369A1"
              />
              <Text style={styles.statTopValue}>{selectedQuake.magnitude}</Text>
              <Text style={styles.statTopLabel}>Magnitudo</Text>
            </View>
            <View style={styles.statTopDivider} />
            <View style={styles.statTopItem}>
              <MaterialCommunityIcons name="rss" size={20} color="#0369A1" />
              <Text style={styles.statTopValue}>{selectedQuake.kedalaman}</Text>
              <Text style={styles.statTopLabel}>Kedalaman</Text>
            </View>
            <View style={styles.statTopDivider} />
            <View style={styles.statTopItem}>
              <MaterialCommunityIcons
                name="compass-outline"
                size={20}
                color="#0369A1"
              />
              <Text style={styles.statTopValue}>{selectedQuake.latText}</Text>
              <Text style={styles.statTopLabel}>LS</Text>
            </View>
            <View style={styles.statTopDivider} />
            <View style={styles.statTopItem}>
              <MaterialCommunityIcons
                name="compass-outline"
                size={20}
                color="#0369A1"
              />
              <Text style={styles.statTopValue}>{selectedQuake.lonText}</Text>
              <Text style={styles.statTopLabel}>BT</Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <Ionicons
              name="location"
              size={18}
              color="#1E6F9F"
              style={styles.infoIcon}
            />
            <View>
              <Text style={styles.infoLabel}>Lokasi Gempa :</Text>
              <Text style={styles.infoValue}>{selectedQuake.wilayah}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color="#1E6F9F"
              style={styles.infoIcon}
            />
            <View>
              <Text style={styles.infoLabel}>Tanggal :</Text>
              <Text style={styles.infoValue}>{selectedQuake.tanggal}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons
              name="time-outline"
              size={18}
              color="#1E6F9F"
              style={styles.infoIcon}
            />
            <View>
              <Text style={styles.infoLabel}>Jam :</Text>
              <Text style={styles.infoValue}>{selectedQuake.jam}</Text>
            </View>
          </View>
          {!!selectedQuake.felt && (
            <View style={styles.infoRow}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color="#1E6F9F"
                style={styles.infoIcon}
              />
              <View style={styles.infoTextFlex}>
                <Text style={styles.infoLabel}>Fase :</Text>
                <Text style={styles.infoValue}>{selectedQuake.felt}</Text>
              </View>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

export default function GempaTerdeteksiHistoryRoute() {
  return <GempaTerdeteksiHistoryContent tabBar={null} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topControls: {
    position: "absolute",
    top: 16,
    left: 10,
    right: 10,
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
  },
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
    alignSelf: "center",
  },
  statsTopRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 11,
  },
  statTopItem: { flex: 1, alignItems: "center", gap: 2 },
  statTopValue: { fontSize: 14, fontWeight: "700", color: "#000000" },
  statTopLabel: { fontSize: 12, color: "#000000", fontWeight: "500" },
  statTopDivider: { width: 1, backgroundColor: "#E0E0E0", marginVertical: 4 },
  separator: { height: 2, backgroundColor: "#0369A1", marginBottom: 11 },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
    gap: 10,
  },
  infoIcon: { marginTop: 2 },
  infoTextFlex: { flex: 1 },
  infoLabel: { fontSize: 12, color: "#666", marginBottom: 2 },
  infoValue: { fontSize: 13, fontWeight: "700", color: "#1E3A5F" },
});
