import EarthquakeMap from "@/components/earthquake-map";
import { NetworkErrorModal } from "@/components/ui/network-error-modal";
import type { MapViewType } from "@/constants/map";
import { shareQuake } from "@/utils/share";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { XMLParser } from "fast-xml-parser";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ModalTsunamiInfo,
  type TsunamiMapSlide,
  type TsunamiObsArea,
  type TsunamiWzArea,
} from "./modal-tsunami-info";
import { styles } from "./styles/gempa-dirasakan-content.styles";

const API_URL = process.env.EXPO_PUBLIC_PERINGATAN_TSUNAMI_API_URL ?? "";
const MAP_ASSET_BASE = "https://bmkg-content-inatews.storage.googleapis.com";
const xmlParser = new XMLParser({ ignoreAttributes: false });

export type TsunamiWarning = {
  id: string;
  subject: string;
  headline: string;
  description: string;
  timesent: string;
  timesentMs: number;
  shakemap: string;
  wzmap: string;
  ttmap: string;
  sshmap: string;
  wzAreas: TsunamiWzArea[];
  obsAreas: TsunamiObsArea[];
  rawIndex: number;
};

export type TsunamiEventGroup = {
  id: string;
  latitude: number;
  longitude: number;
  magnitude: string;
  kedalaman: string;
  latText: string;
  lonText: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  latestWarningIndex: number;
  warnings: TsunamiWarning[];
};

type ParsedTsunamiInfo = Omit<TsunamiEventGroup, "latestWarningIndex" | "warnings"> & {
  groupKey: string;
  warning: TsunamiWarning;
};

type Props = {
  tabBar: ReactNode;
  onLoadingChange?: (loading: boolean) => void;
  isActive?: boolean;
};

const EMPTY_WARNING: TsunamiWarning = {
  id: "empty",
  subject: "-",
  headline: "-",
  description: "-",
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

function safeText(value: unknown, fallback = "-"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function rawText(value: unknown): string {
  return String(value ?? "").trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function withCacheBuster(url: string): string {
  const base = url.trim();
  if (!base) return "";
  if (base.endsWith("=") || base.endsWith("?") || base.endsWith("&")) {
    return `${base}${Date.now()}`;
  }
  return `${base}${base.includes("?") ? "&" : "?"}t=${Date.now()}`;
}

function buildAssetUrl(path: string): string {
  const value = path.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${MAP_ASSET_BASE}/${value}`;
}

function getInfoItems(parsed: Record<string, unknown>): unknown[] {
  const alert = asRecord(parsed.alert);
  const root = Object.keys(alert).length > 0 ? alert : parsed;
  return normalizeArray<unknown>(root.info);
}

function parseCoordinates(value: unknown): {
  latitude: number;
  longitude: number;
} | null {
  const [lonText, latText] = rawText(value).split(",").map((part) => part.trim());
  const latitude = parseFloat(latText ?? "");
  const longitude = parseFloat(lonText ?? "");

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  return { latitude, longitude };
}

function parseTimesent(value: unknown): number {
  const text = rawText(value).replace(/\s*WIB$/i, "").trim();
  const match = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/,
  );

  if (!match) return Number.NEGATIVE_INFINITY;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10) - 1;
  const year = Number.parseInt(match[3], 10);
  const hour = Number.parseInt(match[4], 10);
  const minute = Number.parseInt(match[5], 10);
  const second = Number.parseInt(match[6], 10);
  const timestamp = new Date(year, month, day, hour, minute, second).getTime();

  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function getEventGroupKey(info: Record<string, unknown>, coordinates: string): string {
  const composite = [
    rawText(info.date),
    rawText(info.time),
    coordinates,
    rawText(info.magnitude),
  ]
    .map((part) => part.toLowerCase())
    .join("|");

  if (composite.replace(/\|/g, "")) return composite;

  return rawText(info.eventid) || `tsunami-${Date.now()}`;
}

function getWarningTabLabel(subject: string, index: number): string {
  const match = subject.match(/\bPD[-\s]*([0-9]+(?:\.[0-9]+)?)\b/i);
  return match ? `PD-${match[1]}` : `Update ${index + 1}`;
}

function hasAnyRecordValue(
  record: Record<string, unknown>,
  keys: string[],
): boolean {
  return keys.some((key) => rawText(record[key]) !== "");
}

function buildTsunamiMapSlides(warning: TsunamiWarning): TsunamiMapSlide[] {
  return [
    {
      title: "Shakemap / Peta Guncangan",
      imageUrl: warning.shakemap,
    },
    {
      title: "WZMap / Peta Zona Peringatan",
      imageUrl: warning.wzmap,
    },
    {
      title: "TTMap / Peta Waktu Tiba Tsunami",
      imageUrl: warning.ttmap,
    },
    {
      title: "SSHMap / Peta Tinggi Muka Laut / Sea Surface Height",
      imageUrl: warning.sshmap,
    },
  ].filter((slide) => slide.imageUrl);
}

function parseWzAreas(value: unknown): TsunamiWzArea[] {
  return normalizeArray<unknown>(value).reduce<TsunamiWzArea[]>((acc, item) => {
    const area = asRecord(item);
    if (
      !hasAnyRecordValue(area, ["province", "district", "level", "date", "time"])
    ) {
      return acc;
    }

    acc.push({
      province: safeText(area.province),
      district: safeText(area.district),
      level: safeText(area.level),
      date: safeText(area.date),
      time: safeText(area.time),
    });
    return acc;
  }, []);
}

function parseObsAreas(value: unknown): TsunamiObsArea[] {
  return normalizeArray<unknown>(value).reduce<TsunamiObsArea[]>((acc, item) => {
    const area = asRecord(item);
    if (
      !hasAnyRecordValue(area, [
        "location",
        "loclatitude",
        "loclongitude",
        "height",
        "date",
        "time",
      ])
    ) {
      return acc;
    }

    acc.push({
      location: safeText(area.location),
      loclatitude: safeText(area.loclatitude),
      loclongitude: safeText(area.loclongitude),
      height: safeText(area.height),
      date: safeText(area.date),
      time: safeText(area.time),
    });
    return acc;
  }, []);
}

function parseTsunamiInfo(item: unknown, index: number): ParsedTsunamiInfo | null {
  const info = asRecord(item);
  const point = asRecord(info.point);
  const coordText = rawText(point.coordinates);
  const coordinates = parseCoordinates(coordText);

  if (!coordinates) return null;

  const groupKey = getEventGroupKey(info, coordText);
  const eventId = rawText(info.eventid) || `${groupKey}-${index}`;
  const timesent = safeText(info.timesent);
  const warning: TsunamiWarning = {
    id: `${eventId}-${index}`,
    subject: safeText(info.subject),
    headline: safeText(info.headline),
    description: safeText(info.description),
    timesent,
    timesentMs: parseTimesent(timesent),
    shakemap: buildAssetUrl(rawText(info.shakemap)),
    wzmap: buildAssetUrl(rawText(info.wzmap)),
    ttmap: buildAssetUrl(rawText(info.ttmap)),
    sshmap: buildAssetUrl(rawText(info.sshmap)),
    wzAreas: parseWzAreas(info.wzarea),
    obsAreas: parseObsAreas(info.obsarea),
    rawIndex: index,
  };

  return {
    id: groupKey,
    groupKey,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    magnitude: safeText(info.magnitude),
    kedalaman: safeText(info.depth),
    latText: safeText(info.latitude),
    lonText: safeText(info.longitude),
    wilayah: safeText(info.area),
    tanggal: safeText(info.date),
    jam: safeText(info.time),
    warning,
  };
}

function getLatestWarningIndex(warnings: TsunamiWarning[]): number {
  if (warnings.length === 0) return 0;

  const hasValidTimesent = warnings.some(
    (warning) => warning.timesentMs !== Number.NEGATIVE_INFINITY,
  );

  if (!hasValidTimesent) return warnings.length - 1;

  return warnings.reduce((latestIndex, warning, index) => {
    const latest = warnings[latestIndex];
    if (warning.timesentMs > latest.timesentMs) return index;
    if (
      warning.timesentMs === latest.timesentMs &&
      warning.rawIndex > latest.rawIndex
    ) {
      return index;
    }
    return latestIndex;
  }, 0);
}

function sortWarnings(warnings: TsunamiWarning[]): TsunamiWarning[] {
  const hasValidTimesent = warnings.some(
    (warning) => warning.timesentMs !== Number.NEGATIVE_INFINITY,
  );

  if (!hasValidTimesent) return warnings;

  return [...warnings].sort((a, b) => {
    if (a.timesentMs !== b.timesentMs) return a.timesentMs - b.timesentMs;
    return a.rawIndex - b.rawIndex;
  });
}

function normalizeTsunamiGroups(items: unknown[]): TsunamiEventGroup[] {
  const groupMap = new Map<
    string,
    ParsedTsunamiInfo & { warnings: TsunamiWarning[] }
  >();

  items.forEach((item, index) => {
    const parsed = parseTsunamiInfo(item, index);
    if (!parsed) return;

    const existing = groupMap.get(parsed.groupKey);
    if (existing) {
      existing.warnings.push(parsed.warning);
      return;
    }

    groupMap.set(parsed.groupKey, {
      ...parsed,
      warnings: [parsed.warning],
    });
  });

  return Array.from(groupMap.values())
    .map((group) => {
      const warnings = sortWarnings(group.warnings);
      const latestWarningIndex = getLatestWarningIndex(warnings);

      return {
        id: group.id,
        latitude: group.latitude,
        longitude: group.longitude,
        magnitude: group.magnitude,
        kedalaman: group.kedalaman,
        latText: group.latText,
        lonText: group.lonText,
        wilayah: group.wilayah,
        tanggal: group.tanggal,
        jam: group.jam,
        latestWarningIndex,
        warnings,
      };
    })
    .sort((a, b) => {
      const aLatest = a.warnings[a.latestWarningIndex] ?? EMPTY_WARNING;
      const bLatest = b.warnings[b.latestWarningIndex] ?? EMPTY_WARNING;
      if (aLatest.timesentMs !== bLatest.timesentMs) {
        return bLatest.timesentMs - aLatest.timesentMs;
      }
      return bLatest.rawIndex - aLatest.rawIndex;
    });
}

export default function TsunamiContent({
  tabBar,
  onLoadingChange,
  isActive = true,
}: Props) {
  const [eventGroups, setEventGroups] = useState<TsunamiEventGroup[]>([]);
  const [selectedEventIndex, setSelectedEventIndex] = useState(0);
  const [selectedWarningIndex, setSelectedWarningIndex] = useState(0);
  const [showCard, setShowCard] = useState(false);
  const [tsunamiInfoVisible, setTsunamiInfoVisible] = useState(false);
  const [networkErrorModalVisible, setNetworkErrorModalVisible] = useState(false);

  const mapRef = useRef<MapViewType | null>(null);
  const showCardRef = useRef(false);
  const hasFetchedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const networkErrorShownRef = useRef(false);
  const translateY = useRef(new Animated.Value(600)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  const selectedGroup = eventGroups[selectedEventIndex] ?? null;
  const selectedWarning =
    selectedGroup?.warnings[selectedWarningIndex] ??
    selectedGroup?.warnings[selectedGroup.latestWarningIndex] ??
    EMPTY_WARNING;
  const tsunamiMapSlides = useMemo(
    () => buildTsunamiMapSlides(selectedWarning),
    [selectedWarning],
  );
  const visibleEventGroups = useMemo(() => eventGroups.slice(0, 1), [eventGroups]);

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

  const showNetworkError = useCallback(() => {
    if (networkErrorShownRef.current) return;
    networkErrorShownRef.current = true;
    setNetworkErrorModalVisible(true);
  }, []);

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
          dismissCard();
          return;
        }

        Animated.parallel([
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(btnOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      },
    }),
  ).current;

  const openCard = useCallback(() => {
    translateY.setValue(600);
    opacity.setValue(0);
    btnOpacity.setValue(0);
    showCardRef.current = true;
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
      Animated.timing(btnOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [btnOpacity, opacity, translateY]);

  const dismissCard = useCallback(
    (callback?: () => void) => {
      if (!showCardRef.current) {
        callback?.();
        return;
      }

      showCardRef.current = false;
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
        Animated.timing(btnOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowCard(false);
        callback?.();
      });
    },
    [btnOpacity, opacity, translateY],
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

  useEffect(() => {
    if (!isActive) return;
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    abortRef.current = new AbortController();

    async function fetchTsunamiEvents() {
      onLoadingChange?.(true);
      try {
        if (!API_URL) return;

        const res = await fetch(withCacheBuster(API_URL), {
          signal: abortRef.current?.signal,
        });
        if (!res.ok) throw new Error(`tsunami fetch failed: ${res.status}`);

        const raw = await res.text();
        const parsed = xmlParser.parse(raw) as Record<string, unknown>;
        const groups = normalizeTsunamiGroups(getInfoItems(parsed));

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
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        showNetworkError();
      } finally {
        onLoadingChange?.(false);
      }
    }

    fetchTsunamiEvents();
    return () => abortRef.current?.abort();
  }, [isActive, onLoadingChange, showNetworkError]);

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
            <TouchableOpacity style={styles.mapButton} onPress={shareSelectedWarning}>
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
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="rss"
              value={selectedGroup.kedalaman}
              label="Kedalaman"
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="compass-outline"
              value={selectedGroup.latText}
              label="LS"
            />
            <View style={styles.statTopDivider} />
            <StatItem
              icon="compass-outline"
              value={selectedGroup.lonText}
              label="BT"
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
          />
          <DetailItem
            icon="alert-circle-outline"
            label="Status :"
            value={safeText(selectedWarning.subject)}
          />
          <DetailItem
            icon="time-outline"
            label="Waktu :"
            value={`${safeText(selectedGroup.tanggal)}, ${safeText(selectedGroup.jam)}`}
          />
          <DetailItem
            icon="megaphone-outline"
            label="Informasi Tsunami :"
            value={safeText(selectedWarning.headline)}
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
        visible={networkErrorModalVisible}
        onClose={() => {
          setNetworkErrorModalVisible(false);
          networkErrorShownRef.current = false;
        }}
      />
    </View>
  );
}

function WarningTabs({
  warnings,
  selectedIndex,
  onSelect,
}: {
  warnings: TsunamiWarning[];
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
            key={warning.id}
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

const StatItem = ({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) => (
  <View style={styles.statTopItem}>
    <MaterialCommunityIcons name={icon as never} size={20} color="#0369A1" />
    <Text style={styles.statTopValue}>{safeText(value)}</Text>
    <Text style={styles.statTopLabel}>{label}</Text>
  </View>
);

const DetailItem = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon as never} size={18} color="#1E6F9F" style={styles.infoIcon} />
    <View style={localStyles.infoText}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{safeText(value)}</Text>
    </View>
  </View>
);

const localStyles = StyleSheet.create({
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
  infoText: {
    flex: 1,
  },
});
