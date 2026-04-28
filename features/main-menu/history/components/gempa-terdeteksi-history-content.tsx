import EarthquakeMap from "@/components/earthquake-map";
import { getApp } from "@/config/firebase-init";
import type { MapViewType } from "@/constants/map";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { get, getDatabase, ref } from "@react-native-firebase/database";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AppState,
  PanResponder,
  Text,
  View,
} from "react-native";
import styles from "./styles/gempa-terdeteksi-content";

const DB_PATH = "gempa_terdeteksi";
const MIN_POLL_MS = 10_000;
const MAX_POLL_MS = 60_000;
const MAX_POINTS = 20;

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
          ]).start(() => {
            setShowCard(false);
            temporarySelectionRef.current = null;
            setTemporarySelection(null);
          });
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
      setTemporarySelection(null);
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
    if (lastExternalSelectionIdRef.current === externalSelection.eventId)
      return;

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
      500,
    );
    onListSelectionHandled?.();
  }, [onListSelectionHandled, openCard, quakes, selectedListEventId]);

  useEffect(() => {
    isMountedRef.current = true;

    async function fetchLatestQuake(silent = true): Promise<boolean> {
      if (isFetching.current) return false;
      isFetching.current = true;

      const startTime = Date.now();
      console.log(`[Fetch-Terdeteksi] Starting fetchLatestQuake at ${new Date().toISOString()}`);

      if (!silent) onLoadingChange?.(true);

      try {
        console.log(`[Fetch-Terdeteksi] Getting Firebase app and database...`);
        let app;
        try {
          app = getApp();
          console.log(`[Fetch-Terdeteksi] ✅ Firebase app initialized`);
        } catch (appError: any) {
          console.error(`[Fetch-Terdeteksi] ❌ Firebase app not initialized:`, appError.message);
          throw new Error("Firebase app not initialized - ensure google-services.json is configured");
        }
        
        const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
        console.log(`[Fetch-Terdeteksi] Database URL: ${dbUrl ? "✅ configured" : "⚠️ missing - using default"}`);
        const db = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);
        
        const refStart = Date.now();
        console.log(`[Fetch-Terdeteksi] Querying database path: "${DB_PATH}/items"`);
        let snapshot = await get(ref(db, `${DB_PATH}/items`));
        if (!snapshot.exists()) {
          console.log(`[Fetch-Terdeteksi] Fallback query to root path: "${DB_PATH}"`);
          snapshot = await get(ref(db, DB_PATH));
        }
        const refTime = Date.now() - refStart;
        console.log(`[Fetch-Terdeteksi] Database query completed in ${refTime}ms`);

        if (!snapshot.exists()) {
          console.log("No gempa terdeteksi history data in database");
          return false;
        }

        const dbData = snapshot.val();
        if (!dbData || typeof dbData !== "object") {
          console.log(`[Fetch-Terdeteksi] Invalid data type: ${typeof dbData}`);
          return false;
        }

        // Convert database payload to array and normalize
        const convertStart = Date.now();
        const itemsNode = dbData?.items ?? dbData;
        const candidates = Array.isArray(itemsNode)
          ? itemsNode
          : itemsNode && typeof itemsNode === "object"
            ? (Object.values(itemsNode) as any[])
            : [];
        const convertTime = Date.now() - convertStart;
        console.log(`[Fetch-Terdeteksi] Converted to candidates array: ${candidates.length} items in ${convertTime}ms`);
        
        if (candidates.length === 0) return false;

        // Sort by date/time descending (most recent first)
        const sortStart = Date.now();
        const sorted = [...candidates].sort((a: any, b: any) => {
          const tA = String(a?.time ?? a?.jam ?? "");
          const tB = String(b?.time ?? b?.jam ?? "");
          return tB.localeCompare(tA);
        });
        const sortTime = Date.now() - sortStart;
        console.log(`[Fetch-Terdeteksi] Sorted candidates in ${sortTime}ms`);

        const normalizeStart = Date.now();
        const normalized = sorted
          .slice(0, MAX_POINTS)
          .map((item: any, index: number): QuakeItem | null => {
            let latitude = parseFloat(
              String(
                item?.latitude ??
                  item?.lat ??
                  item?.coordinates?.latitude ??
                  "",
              ),
            );
            let longitude = parseFloat(
              String(
                item?.longitude ??
                  item?.lon ??
                  item?.coordinates?.longitude ??
                  "",
              ),
            );

            if (isNaN(latitude) || isNaN(longitude)) {
              const coords = item?.geometry?.coordinates;
              longitude = parseFloat(String(coords?.[0] ?? ""));
              latitude = parseFloat(String(coords?.[1] ?? ""));
            }
            if (isNaN(latitude) || isNaN(longitude)) return null;

            const [tanggal, jamRaw] = String(item?.time ?? item?.tanggal ?? "").split(" ");
            const jam = (jamRaw ?? "").split(".")[0];
            const absLat = Math.abs(latitude).toFixed(2);
            const absLon = Math.abs(longitude).toFixed(2);

            const eventId = String(
              item?.eventId ??
                item?.id ??
                item?.eventid ??
                `${item?.time ?? ""}-${latitude}-${longitude}-${index}`,
            );

            return {
              eventId,
              latitude,
              longitude,
              magnitude: parseFloat(String(item?.mag ?? item?.magnitude ?? "0")).toFixed(1),
              wilayah: String(item?.place ?? item?.area ?? item?.lokasi ?? ""),
              tanggal: tanggal ?? "",
              jam: jam ?? "",
              kedalaman: `${parseFloat(String(item?.depth ?? item?.kedalaman ?? "0")).toFixed(1)} km`,
              felt: String(item?.fase ?? item?.felt ?? ""),
              latText: `${absLat}°${latitude < 0 ? "LS" : "LU"}`,
              lonText: `${absLon}°${longitude >= 0 ? "BT" : "BB"}`,
            };
          })
          .filter((item: QuakeItem | null): item is QuakeItem => Boolean(item));
        const normalizeTime = Date.now() - normalizeStart;
        console.log(`[Fetch-Terdeteksi] Normalized ${normalized.length} items in ${normalizeTime}ms (filtered from ${sorted.length})`);
        

        if (normalized.length === 0) return false;

        const signature = normalized.map((item) => item.eventId).join("|");
        console.log(`[Fetch-Terdeteksi] Data signature: ${signature.substring(0, 50)}...`);
        console.log(`[Fetch-Terdeteksi] Previous signature: ${latestDataSignature.current?.substring(0, 50) ?? "none"}...`);
        
        if (signature === latestDataSignature.current) {
          console.log("[Fetch-Terdeteksi] No data change detected, skipping update");
          return false;
        }
        latestDataSignature.current = signature;

        let foundIndex = -1;
        if (selectedEventIdRef.current) {
          foundIndex = normalized.findIndex(
            (item) => item.eventId === selectedEventIdRef.current,
          );
          console.log(`[Fetch-Terdeteksi] Found selected eventId at index: ${foundIndex}`);
        }

        const currentTemporarySelection = temporarySelectionRef.current;
        const hasTemporarySelection =
          currentTemporarySelection?.eventId !== undefined &&
          currentTemporarySelection.eventId === selectedEventIdRef.current;
        const keepTemporarySelection = hasTemporarySelection && foundIndex < 0;

        console.log(`[Fetch-Terdeteksi] Updating state with ${normalized.length} items`);
        setQuakes(normalized);

        if (keepTemporarySelection) {
          console.log("[Fetch-Terdeteksi] Keeping temporary selection");
          setSelectedIndex(null);
          return true;
        }

        const nextSelectedIndex = foundIndex >= 0 ? foundIndex : 0;
        const focusQuake = normalized[nextSelectedIndex];
        selectedEventIdRef.current = focusQuake?.eventId ?? null;
        setTemporarySelection(null);
        setSelectedIndex(nextSelectedIndex);

        if (!focusQuake) {
          console.log("[Fetch-Terdeteksi] No focus quake to animate");
          return true;
        }

        const animStart = Date.now();
        if (isFirstLoad.current) {
          console.log("[Fetch-Terdeteksi] First load - animating to region");
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
        const animTime = Date.now() - animStart;
        const totalTime = Date.now() - startTime;
        console.log(`[Fetch-Terdeteksi] Map animation scheduled in ${animTime}ms`);
        console.log(`[Fetch-Terdeteksi] ✅ Total fetch completed in ${totalTime}ms`);

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

    fetchLatestQuake(!isActive).then((changed) => {
      if (!isMountedRef.current) return;
      scheduleNextPoll(changed);
    });

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active" && isActive) {
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
          temporarySelection && selectedIndex === null
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
