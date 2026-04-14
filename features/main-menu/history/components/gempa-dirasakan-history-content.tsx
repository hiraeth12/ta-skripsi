import EarthquakeMap from "@/components/earthquake-map";
import type { MapViewType } from "@/constants/map";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { XMLParser } from "fast-xml-parser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    AppState,
    Dimensions,
    Image,
    InteractionManager,
    Modal,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const SHAKEMAP_BASE = "https://bmkg-content-inatews.storage.googleapis.com";

const API_URL = process.env.EXPO_PUBLIC_GEMPA_DIRASAKAN_HISTORY!;
const MIN_POLL_MS = 10_000;
const MAX_POLL_MS = 60_000;
const MAX_POINTS = 15;
const REFERENCE_LOCATION = {
  latitude: -6.9175,
  longitude: 107.6191,
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

function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const radLat1 = toRad(lat1);
  const radLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) *
      Math.cos(radLat2) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

type QuakeItem = {
  eventId: string;
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
  shakemap: string | null;
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
  shakemap: string | null;
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

export function GempaDirasakanHistoryContent({
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
  const [shakeMapVisible, setShakeMapVisible] = useState(false);
  const [temporarySelection, setTemporarySelection] =
    useState<QuakeItem | null>(null);

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
  const mapRef = useRef<MapViewType | null>(null);
  const translateY = useRef(new Animated.Value(600)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const selectedQuake =
    selectedIndex !== null && quakes[selectedIndex]
      ? quakes[selectedIndex]
      : temporarySelection;
  const shakeMapUrl = selectedQuake?.shakemap
    ? `${SHAKEMAP_BASE}/${selectedQuake.shakemap}`
    : null;

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

  const dismissCard = useCallback(
    (callback?: () => void) => {
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
    },
    [opacity, translateY],
  );

  const onPressMarker = useCallback(
    (index: number) => {
      if (!quakes[index]) return;
      selectedEventIdRef.current = quakes[index].eventId;
      setSelectedIndex(index);
      openCard();
    },
    [openCard, quakes],
  );

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
        jarak: `${quake.distanceKm} km dari Bandung`,
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
    if (lastExternalSelectionIdRef.current === externalSelection.eventId)
      return;

    const targetIndex = quakes.findIndex(
      (quake) => quake.eventId === externalSelection.eventId,
    );
    const targetQuake: QuakeItem = {
      eventId: externalSelection.eventId,
      latitude: externalSelection.latitude,
      longitude: externalSelection.longitude,
      distanceKm: externalSelection.distanceKm,
      magnitude: externalSelection.magnitude,
      wilayah: externalSelection.lokasi,
      tanggal: externalSelection.tanggal,
      jam: externalSelection.jam,
      kedalaman: externalSelection.kedalaman,
      felt: externalSelection.felt,
      latText: `${Math.abs(externalSelection.latitude).toFixed(2)}°${externalSelection.latitude < 0 ? "LS" : "LU"}`,
      lonText: `${Math.abs(externalSelection.longitude).toFixed(2)}°${externalSelection.longitude >= 0 ? "BT" : "BB"}`,
      shakemap: externalSelection.shakemap,
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
            "GEMPA_DIRASAKAN_HISTORY is undefined - restart Metro with --clear",
          );
          return false;
        }
        const res = await fetch(withCacheBuster(API_URL));
        const raw = await res.text();

        let candidates: any[] = [];
        let globalIdentifier = "";

        try {
          const parsedJson = JSON.parse(raw);
          const infoRaw = parsedJson?.info;
          candidates = Array.isArray(infoRaw)
            ? infoRaw
            : infoRaw
              ? [infoRaw]
              : [];
          globalIdentifier = String(parsedJson?.identifier ?? "");
        } catch {
          const parser = new XMLParser({ ignoreAttributes: false });
          const parsedXml = parser.parse(raw);
          const infoRaw = parsedXml?.alert?.info;
          candidates = Array.isArray(infoRaw)
            ? infoRaw
            : infoRaw
              ? [infoRaw]
              : [];
          globalIdentifier = String(parsedXml?.alert?.identifier ?? "");
        }

        if (candidates.length === 0) return false;

        const normalized = candidates
          .map((candidate, index): QuakeItem | null => {
            const coordStr: string = String(
              candidate?.point?.coordinates ?? "",
            );
            const [lonStr, latStr] = coordStr.split(",");
            const latitude = parseFloat(latStr);
            const longitude = parseFloat(lonStr);
            if (isNaN(latitude) || isNaN(longitude)) return null;

            const absLat = Math.abs(latitude).toFixed(2);
            const absLon = Math.abs(longitude).toFixed(2);
            const distanceKm = haversineDistanceKm(
              REFERENCE_LOCATION.latitude,
              REFERENCE_LOCATION.longitude,
              latitude,
              longitude,
            ).toFixed(1);

            const eventId = String(
              candidate?.eventid ??
                candidate?.identifier ??
                `${globalIdentifier}-${candidate?.time ?? ""}-${candidate?.date ?? ""}-${index}`,
            );

            return {
              eventId,
              latitude,
              longitude,
              distanceKm,
              magnitude: String(candidate?.magnitude ?? ""),
              wilayah: String(candidate?.area ?? ""),
              tanggal: String(candidate?.date ?? ""),
              jam: String(candidate?.time ?? ""),
              kedalaman: String(candidate?.depth ?? ""),
              felt: String(candidate?.felt ?? ""),
              latText: `${absLat}\u00B0${latitude < 0 ? "LS" : "LU"}`,
              lonText: `${absLon}\u00B0${longitude >= 0 ? "BT" : "BB"}`,
              shakemap: candidate?.shakemap ? String(candidate.shakemap) : null,
            };
          })
          .filter((item): item is QuakeItem => Boolean(item))
          .slice(0, MAX_POINTS);

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
        console.error("Failed to fetch gempa dirasakan history:", e);
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
              name="time-outline"
              size={18}
              color="#1E6F9F"
              style={styles.infoIcon}
            />
            <View>
              <Text style={styles.infoLabel}>Waktu :</Text>
              <Text style={styles.infoValue}>
                {selectedQuake.tanggal}, {selectedQuake.jam}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons
              name="walk-outline"
              size={18}
              color="#1E6F9F"
              style={styles.infoIcon}
            />
            <View>
              <Text style={styles.infoLabel}>Jarak :</Text>
              <Text style={styles.infoValue}>
                {selectedQuake.distanceKm} km
              </Text>
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
                <Text style={styles.infoLabel}>
                  Wilayah Dirasakan (Skala MMI) :
                </Text>
                <Text style={styles.infoValue}>{selectedQuake.felt}</Text>
              </View>
            </View>
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

      <Modal visible={shakeMapVisible} transparent animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View
            style={[styles.modalCardBottom, { height: SCREEN_HEIGHT * 0.9 }]}
          >
            <View style={styles.handleBar} />
            <View style={styles.modalHeaderBottom}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitleBottom}>PETA GUNCANGAN</Text>
                <Text style={styles.modalSubtitle}>
                  Sumber data: BMKG ShakeMap
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShakeMapVisible(false)}
                style={styles.modalCloseCircle}
              >
                <Ionicons name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }}>
              {shakeMapUrl && (
                <Image
                  source={{ uri: shakeMapUrl }}
                  style={styles.maximizedImage}
                  resizeMode="contain"
                />
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <Text style={styles.scrollHint}>
                * Data diperbarui secara otomatis dari BMKG ShakeMap
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function GempaDirasakanHistoryRoute() {
  return <GempaDirasakanHistoryContent tabBar={null} />;
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
  simulasiBtn: {
    marginTop: 11,
    marginBottom: -11,
    backgroundColor: "#1E6F9F",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
  },
  simulasiBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 1,
  },
  simulasiBtnDisabled: { backgroundColor: "#94a3b8" },
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalCardBottom: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    width: "100%",
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: "#ccc",
    borderRadius: 10,
    alignSelf: "center",
    marginTop: 12,
  },
  modalHeaderBottom: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitleBottom: { color: "#0C4A6E", fontWeight: "700", fontSize: 16 },
  modalSubtitle: { fontSize: 11, color: "#777" },
  maximizedImage: { width: SCREEN_WIDTH, height: 600, marginTop: 10 },
  modalFooter: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fafafa",
  },
  scrollHint: {
    textAlign: "center",
    fontSize: 12,
    color: "#1E6F9F",
    fontWeight: "500",
  },
  modalCloseCircle: {
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    padding: 4,
  },
});
