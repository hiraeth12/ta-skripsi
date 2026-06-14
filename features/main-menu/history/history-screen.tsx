import EarthquakeTabBar from "@/components/ui/earthquake-tab-bar";
import { ModalHistoricalProcess } from "@/components/ui/modal-historical-process";
import { ModalNarasi } from "@/components/ui/modal-narasi";
import Skeleton from "@/components/ui/skeleton";
import { useUserSession } from "@/features/main-menu/account/user-session-context";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import {
  memo,
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GempaDirasakanHistoryContent,
  GempaTerdeteksiHistoryContent,
  TsunamiHistoryContent,
} from "./components";
import { useExternalSelection } from "./hooks/use-external-selection";
import { useHistoryFetch } from "./hooks/use-history-fetch";
import { useHistoryFilter } from "./hooks/use-history-filter";
import styles from "./styles/history-screen";
import {
  MONTH_NAMES_ID,
  parseIsoDate,
  resolveIsoDateRange,
  serializeFilterMonths,
} from "./utils/filter";
import { getDirasakanDisplayLocation } from "./utils/dirasakan-location";
import {
  HISTORY_TABS,
  type HistoryEarthquakeTab,
  type ListItem,
} from "./utils/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEM_HEIGHT = 74;
const LIST_CONTENT_CONTAINER_STYLE = {
  paddingHorizontal: 12,
  paddingBottom: 8,
};

const listStyles = StyleSheet.create({
  skeletonList: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  skeletonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    height: ITEM_HEIGHT - 8,
  },
  skeletonIcon: {
    marginRight: 10,
  },
  skeletonBody: {
    flex: 1,
    gap: 6,
  },
  skeletonLineMuted: {
    backgroundColor: "#E2E8F0",
  },
  item: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    height: ITEM_HEIGHT - 8,
  },
  magBadgeHigh: {
    backgroundColor: "#EF4444",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  magBadgeNormal: {
    backgroundColor: "#F59E0B",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  magValue: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  magLabel: {
    color: "#FFF",
    fontSize: 8,
  },
  itemBody: {
    flex: 1,
  },
  itemLocation: {
    color: "#0F172A",
    fontWeight: "bold",
    fontSize: 13,
    marginBottom: 2,
  },
  itemDatetime: {
    color: "#475569",
    fontSize: 11,
    marginBottom: 2,
  },
  itemDescription: {
    color: "#64748B",
    fontSize: 10,
  },
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "40%",
    backgroundColor: "#0C4A6E",
    paddingTop: 12,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    zIndex: 10,
  },
  panelTitleWrap: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  panelTitle: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "center",
  },
  separator: {
    height: 8,
  },
  emptyText: {
    color: "#E6F4FF",
    textAlign: "center",
    marginTop: 10,
    fontSize: 12,
  },
  topControlsSpacer: {
    flex: 1,
  },
  mapArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function asSingle(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function roundCoord(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);
  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.7],
  });
  return (
    <Animated.View
      style={[listStyles.skeletonCard, { opacity }]}
    >
      <Skeleton
        width={40}
        height={40}
        borderRadius={20}
        style={listStyles.skeletonIcon}
      />
      <View style={listStyles.skeletonBody}>
        <Skeleton width="70%" height={12} />
        <Skeleton
          width="50%"
          height={10}
          style={listStyles.skeletonLineMuted}
        />
        <Skeleton
          width="85%"
          height={9}
          style={listStyles.skeletonLineMuted}
        />
      </View>
    </Animated.View>
  );
}

function SkeletonList() {
  return (
    <View style={listStyles.skeletonList}>
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

type EarthquakeListItemProps = {
  displayLocation: string;
  item: ListItem;
  onPress: (item: ListItem) => void;
};

const EarthquakeListItem = memo(function EarthquakeListItem({
  displayLocation,
  item,
  onPress,
}: EarthquakeListItemProps) {
  const magValue = parseFloat(item.magnitude);
  const magBadgeStyle =
    magValue >= 5 ? listStyles.magBadgeHigh : listStyles.magBadgeNormal;
  const handlePress = useCallback(() => onPress(item), [item, onPress]);
  const isTsunami = item.eventType === "tsunami";

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={listStyles.item}
    >
      <View style={magBadgeStyle}>
        <Text style={listStyles.magValue}>{item.magnitude}</Text>
        <Text style={listStyles.magLabel}>Mag</Text>
      </View>
      <View style={listStyles.itemBody}>
        <Text
          style={listStyles.itemLocation}
          numberOfLines={1}
        >
          {displayLocation || "-"}
        </Text>
        <Text style={listStyles.itemDatetime}>
          {item.tanggal} • {item.jam}
        </Text>
        <Text style={listStyles.itemDescription} numberOfLines={1}>
          {isTsunami
            ? `Kedalaman: ${item.kedalaman} • ${item.status || "-"}`
            : `Kedalaman: ${item.kedalaman} • ${item.distanceKm} km dari Anda`}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

function ListItemSeparator() {
  return <View style={listStyles.separator} />;
}

// ─── HistoryListPanel ─────────────────────────────────────────────────────────

type HistoryListPanelProps = {
  emptyComponent: ReactElement;
  getItemLayout: (
    _: unknown,
    index: number,
  ) => { length: number; offset: number; index: number };
  items: ListItem[];
  keyExtractor: (item: ListItem) => string;
  listLoading: boolean;
  renderItem: ({ item }: { item: ListItem }) => ReactElement;
  slideAnim: Animated.Value;
  title: string;
};

const HistoryListPanel = memo(function HistoryListPanel({
  emptyComponent,
  getItemLayout,
  items,
  keyExtractor,
  listLoading,
  renderItem,
  slideAnim,
  title,
}: HistoryListPanelProps) {
  const panelStyle = useMemo(
    () => [
      listStyles.panel,
      {
        transform: [
          {
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 500],
            }),
          },
        ],
      },
    ],
    [slideAnim],
  );

  return (
    <Animated.View style={panelStyle}>
      <View style={listStyles.panelTitleWrap}>
        <Text style={listStyles.panelTitle}>{title}</Text>
      </View>
      {listLoading && items.length === 0 ? (
        <SkeletonList />
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          removeClippedSubviews
          maxToRenderPerBatch={8}
          initialNumToRender={6}
          windowSize={3}
          updateCellsBatchingPeriod={80}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={LIST_CONTENT_CONTAINER_STYLE}
          ListEmptyComponent={emptyComponent}
          ItemSeparatorComponent={ListItemSeparator}
        />
      )}
    </Animated.View>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function History() {
  const router = useRouter();
  const pathname = usePathname();
  const isFocused = useIsFocused();
  const session = useUserSession();
  const searchParams = useLocalSearchParams<{
    tab?: string;
    filterYear?: string;
    filterMonth?: string;
    filterMonths?: string;
    filterMode?: string;
    filterDateFrom?: string;
    filterDateTo?: string;
    restoreListPanel?: string;
    restoreListPanelToken?: string;
    selectedEventId?: string;
  }>();

  // ── Tab ──────────────────────────────────────────────────────────────────

  const tabParam = asSingle(searchParams.tab);
  const selectedEventId = asSingle(searchParams.selectedEventId);
  const initialTab: HistoryEarthquakeTab =
    tabParam === "tsunami"
      ? "RIWAYAT TSUNAMI"
      : tabParam === "terdeteksi"
        ? "GEMPA TERDETEKSI"
        : "GEMPA DIRASAKAN";

  const [activeTab, setActiveTab] = useState<HistoryEarthquakeTab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [isHistoryCardOpen, setIsHistoryCardOpen] = useState(
    Boolean(selectedEventId),
  );
  const [narasiVisible, setNarasiVisible] = useState(false);
  const [narasiHtmlContent, setNarasiHtmlContent] = useState<string | null>(
    null,
  );
  const [narasiLoading, setNarasiLoading] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyRawContent, setHistoryRawContent] = useState<string | null>(
    null,
  );
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasMountedDirasakan, setHasMountedDirasakan] = useState(
    initialTab === "GEMPA DIRASAKAN",
  );
  const [hasMountedTerdeteksi, setHasMountedTerdeteksi] = useState(
    initialTab === "GEMPA TERDETEKSI",
  );
  const [hasMountedTsunami, setHasMountedTsunami] = useState(
    initialTab === "RIWAYAT TSUNAMI",
  );

  useEffect(() => {
    const incoming = asSingle(searchParams.tab);
    if (incoming === "tsunami") setActiveTab("RIWAYAT TSUNAMI");
    else if (incoming === "terdeteksi") setActiveTab("GEMPA TERDETEKSI");
    else if (incoming === "dirasakan") setActiveTab("GEMPA DIRASAKAN");
  }, [searchParams.tab]);

  useEffect(() => {
    if (activeTab === "GEMPA DIRASAKAN") setHasMountedDirasakan(true);
    else if (activeTab === "GEMPA TERDETEKSI") setHasMountedTerdeteksi(true);
    else setHasMountedTsunami(true);
  }, [activeTab]);

  // ── Filter (dari hook) ────────────────────────────────────────────────────

  const now = useMemo(() => new Date(), []);
  const isTsunamiTab = activeTab === "RIWAYAT TSUNAMI";
  const filterModeParam = asSingle(searchParams.filterMode);
  const effectiveFilterMode: "bulan" | "range" = useMemo(() => {
    if (isTsunamiTab) return "bulan";
    return filterModeParam === "bulan" ? "bulan" : "range";
  }, [filterModeParam, isTsunamiTab]);
  const effectiveDateRange = useMemo(
    () =>
      resolveIsoDateRange(
        asSingle(searchParams.filterDateFrom),
        asSingle(searchParams.filterDateTo),
        now,
      ),
    [now, searchParams.filterDateFrom, searchParams.filterDateTo],
  );
  const filterDateFrom = effectiveDateRange.from;
  const filterDateTo = effectiveDateRange.to;
  const { effectiveFilter, effectiveMonths, tsunamiFilters } = useHistoryFilter(
    {
      activeTab,
      rawYear: Number.parseInt(asSingle(searchParams.filterYear), 10),
      rawMonth: Number.parseInt(asSingle(searchParams.filterMonth), 10),
      rawMonthsParam: asSingle(searchParams.filterMonths),
      now,
    },
  );

  // ── External selection (dari hook) ───────────────────────────────────────

  const { externalSelection, clearSelectionParams } = useExternalSelection();

  // ── User location ─────────────────────────────────────────────────────────

  const [userLocation, setUserLocation] = useState({
    lat: roundCoord(-6.9175),
    lon: roundCoord(107.6191),
  });

  useEffect(() => {
    if (!session.location) return;
    const next = {
      lat: roundCoord(session.location.latitude),
      lon: roundCoord(session.location.longitude),
    };
    setUserLocation((cur) =>
      cur.lat === next.lat && cur.lon === next.lon ? cur : next,
    );
  }, [session.location]);

  // ── Fetch (dari hook) ─────────────────────────────────────────────────────

  const { items, listLoading } = useHistoryFetch({
    activeTab,
    effectiveYear: effectiveFilter.year,
    effectiveMonths,
    tsunamiFilters,
    userLat: userLocation.lat,
    userLon: userLocation.lon,
    filterMode: effectiveFilterMode,
    filterDateFrom,
    filterDateTo,
  });

  // ── Panel animation ───────────────────────────────────────────────────────

  const listPanelSlide = useRef(
    new Animated.Value(selectedEventId ? 1 : 0),
  ).current;
  const listPanelVisibleRef = useRef(!selectedEventId);
  const cardOpenRef = useRef(Boolean(selectedEventId));
  const lastRestoreListPanelTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedEventId) {
      setIsHistoryCardOpen(true);
    }
  }, [selectedEventId]);

  const showListPanel = useCallback(() => {
    listPanelVisibleRef.current = true;
    cardOpenRef.current = false;
    setIsHistoryCardOpen(false);
    Animated.timing(listPanelSlide, {
      toValue: 0,
      duration: 400,
      easing: Easing.out(Easing.bezier(0.16, 1, 0.3, 1)),
      useNativeDriver: false,
    }).start();
  }, [listPanelSlide]);

  const hideListPanel = useCallback(() => {
    listPanelVisibleRef.current = false;
    Animated.timing(listPanelSlide, {
      toValue: 1,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [listPanelSlide]);

  const handleCardOpen = useCallback(() => {
    cardOpenRef.current = true;
    setIsHistoryCardOpen(true);
    hideListPanel();
  }, [hideListPanel]);

  const handleCardClose = useCallback(() => {
    showListPanel();
  }, [showListPanel]);

  useEffect(() => {
    const shouldRestoreListPanel =
      asSingle(searchParams.restoreListPanel) === "1";
    if (!isFocused || !shouldRestoreListPanel) return;

    const restoreToken =
      asSingle(searchParams.restoreListPanelToken) || "restore-list-panel";
    if (lastRestoreListPanelTokenRef.current === restoreToken) return;

    lastRestoreListPanelTokenRef.current = restoreToken;
    showListPanel();
    router.setParams({
      restoreListPanel: undefined,
      restoreListPanelToken: undefined,
    });
  }, [
    isFocused,
    router,
    searchParams.restoreListPanel,
    searchParams.restoreListPanelToken,
    showListPanel,
  ]);

  // ── Tab handlers ──────────────────────────────────────────────────────────

  const [isOpeningFilter, setIsOpeningFilter] = useState(false);

  useEffect(() => {
    if (isFocused) setIsOpeningFilter(false);
  }, [isFocused]);

  const handleAppTabPress = useCallback(
    (tab: HistoryEarthquakeTab) => {
      clearSelectionParams();
      setActiveTab(tab);
      showListPanel();
      if (tab === "GEMPA DIRASAKAN") setHasMountedDirasakan(true);
      else if (tab === "GEMPA TERDETEKSI") setHasMountedTerdeteksi(true);
      else setHasMountedTsunami(true);
    },
    [clearSelectionParams, showListPanel],
  );

  const handleFilterPress = useCallback(() => {
    if (isOpeningFilter) return;
    setIsOpeningFilter(true);
    const nextParams: Record<string, string> = {
      tab:
        activeTab === "RIWAYAT TSUNAMI"
          ? "tsunami"
          : activeTab === "GEMPA DIRASAKAN"
            ? "dirasakan"
            : "terdeteksi",
      filterYear: String(effectiveFilter.year),
      returnTo: pathname,
    };
    if (activeTab !== "RIWAYAT TSUNAMI") {
      nextParams.filterMonth = String(effectiveMonths[0]);
      nextParams.filterMonths = serializeFilterMonths(effectiveMonths);
      nextParams.filterMode = effectiveFilterMode;
      if (effectiveFilterMode === "range") {
        nextParams.filterDateFrom = filterDateFrom;
        nextParams.filterDateTo = filterDateTo;
      }
    }
    if (listPanelVisibleRef.current || cardOpenRef.current) {
      nextParams.restoreListPanel = "1";
    }
    router.push({
      pathname: "/main-menu/filter-gempa-screen",
      params: nextParams,
    });
  }, [
    activeTab,
    effectiveFilter.year,
    effectiveFilterMode,
    effectiveMonths,
    filterDateFrom,
    filterDateTo,
    isOpeningFilter,
    pathname,
    router,
  ]);

  // ── List item press ───────────────────────────────────────────────────────

  const openHistoryForItem = useCallback(
    (item: ListItem) => {
      router.setParams({ selectedEventId: undefined });
      setTimeout(() => {
        const nextParams: Record<string, string> = {
          tab:
            activeTab === "RIWAYAT TSUNAMI"
              ? "tsunami"
              : activeTab === "GEMPA DIRASAKAN"
                ? "dirasakan"
                : "terdeteksi",
          filterYear: String(effectiveFilter.year),
          selectedEventId: item.id,
          selectedLatitude: String(item.latitude),
          selectedLongitude: String(item.longitude),
          selectedMagnitude: item.magnitude,
          selectedLocation: item.lokasi,
          selectedWaktu: item.waktu,
          selectedJarak: item.jarak,
          selectedDistanceKm: item.distanceKm,
          selectedTanggal: item.tanggal,
          selectedJam: item.jam,
          selectedKedalaman: item.kedalaman,
          selectedFelt: item.felt,
          selectedShakemap: item.shakemap ?? "",
          selectedStatus: item.status ?? "",
          selectedHeadline: item.headline ?? "",
          selectedLatestWarningId: item.latestWarningId ?? "",
        };
        if (activeTab !== "RIWAYAT TSUNAMI") {
          nextParams.filterMonth = String(effectiveMonths[0]);
          nextParams.filterMonths = serializeFilterMonths(effectiveMonths);
          nextParams.filterMode = effectiveFilterMode;
          if (effectiveFilterMode === "range") {
            nextParams.filterDateFrom = filterDateFrom;
            nextParams.filterDateTo = filterDateTo;
          }
        }
        router.setParams(nextParams);
      }, 0);
      cardOpenRef.current = true;
      setIsHistoryCardOpen(true);
      hideListPanel();
    },
    [
      activeTab,
      effectiveFilter.year,
      effectiveFilterMode,
      effectiveMonths,
      filterDateFrom,
      filterDateTo,
      hideListPanel,
      router,
    ],
  );

  // ── FlatList helpers ──────────────────────────────────────────────────────

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );
  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      const displayLocation =
        activeTab === "GEMPA DIRASAKAN"
          ? getDirasakanDisplayLocation(item.lokasi)
          : item.lokasi;

      return (
        <EarthquakeListItem
          displayLocation={displayLocation}
          item={item}
          onPress={openHistoryForItem}
        />
      );
    },
    [activeTab, openHistoryForItem],
  );
  const keyExtractor = useCallback((item: ListItem) => item.id, []);

  const listEmpty = useMemo(
    () => (
      <Text style={listStyles.emptyText}>
        {activeTab === "RIWAYAT TSUNAMI"
          ? "Data tsunami belum tersedia."
          : "Data gempa belum tersedia."}
      </Text>
    ),
    [activeTab],
  );

  const listTitle = useMemo(() => {
    if (activeTab === "RIWAYAT TSUNAMI") return "Riwayat Tsunami";
    if (activeTab === "GEMPA DIRASAKAN") return "Gempa Dirasakan Terbaru";
    return "Gempa Terdeteksi Terbaru";
  }, [activeTab]);

  // ── Tab bar ───────────────────────────────────────────────────────────────

  const periodLabel = useMemo(() => {
    if (activeTab !== "RIWAYAT TSUNAMI") {
      if (effectiveFilterMode === "range") {
        const formatRangeDate = (value: string) => {
          const parsed = parseIsoDate(value);
          if (!parsed) return value;
          return parsed.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        };

        return `${formatRangeDate(filterDateFrom)} - ${formatRangeDate(
          filterDateTo,
        )}`;
      }

      const first = MONTH_NAMES_ID[(effectiveMonths[0] ?? 1) - 1];
      const last =
        MONTH_NAMES_ID[(effectiveMonths[effectiveMonths.length - 1] ?? 1) - 1];

      const monthLabel =
        first === last
          ? first
          : `${first} - ${last}`; 

      return `${monthLabel} ${effectiveFilter.year}`;
    }
    return String(effectiveFilter.year);
  }, [
    activeTab,
    effectiveFilter.year,
    effectiveFilterMode,
    effectiveMonths,
    filterDateFrom,
    filterDateTo,
  ]);

  const tabBar = useMemo(
    () => (
      <View style={styles.topControls}>
        <EarthquakeTabBar
          activeTab={activeTab}
          onTabPress={handleAppTabPress}
          disabled={loading}
          tabs={HISTORY_TABS}
        />
        {!isHistoryCardOpen && (
          <View style={styles.designSection}>
            <View style={styles.periodChip}>
              <Text style={styles.periodChipText}>{periodLabel}</Text>
            </View>
            <View style={styles.actionRow}>
              <View style={listStyles.topControlsSpacer} />
              <TouchableOpacity
                style={[
                  styles.sidePill,
                  styles.sidePillRight,
                  styles.sidePillRightContent,
                ]}
                activeOpacity={0.85}
                onPress={handleFilterPress}
                disabled={isOpeningFilter}
              >
                <Ionicons name="options" size={17} color="#FFFFFF" />
                <Text style={[styles.sidePillText, styles.sidePillTextLeft]}>
                  FILTER
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    ),
    [
      activeTab,
      handleAppTabPress,
      handleFilterPress,
      isHistoryCardOpen,
      isOpeningFilter,
      loading,
      periodLabel,
    ],
  );

  const handleExternalSelectionHandled = useCallback(
    () => clearSelectionParams(),
    [clearSelectionParams],
  );

  const openNarasi = useCallback(async (url: string) => {
    setNarasiHtmlContent(null);
    setNarasiLoading(true);
    setNarasiVisible(true);

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`narasi fetch failed: ${res.status}`);
      const text = await res.text();
      setNarasiHtmlContent(text);
    } catch {
      setNarasiHtmlContent(null);
    } finally {
      setNarasiLoading(false);
    }
  }, []);

  const openHistory = useCallback(async (url: string) => {
    setHistoryRawContent(null);
    setHistoryLoading(true);
    setHistoryVisible(true);

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`history fetch failed: ${res.status}`);
      const text = await res.text();
      setHistoryRawContent(text);
    } catch {
      setHistoryRawContent(null);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const closeNarasi = useCallback(() => {
    setNarasiVisible(false);
    setNarasiHtmlContent(null);
  }, []);

  const closeHistory = useCallback(() => {
    setHistoryVisible(false);
    setHistoryRawContent(null);
  }, []);

  const dirasakanActive = isFocused && activeTab === "GEMPA DIRASAKAN";
  const terdeteksiActive = isFocused && activeTab === "GEMPA TERDETEKSI";
  const tsunamiActive = isFocused && activeTab === "RIWAYAT TSUNAMI";
  const mapAreaStyle = useMemo(
    () => [
      listStyles.mapArea,
      {
        bottom: listPanelSlide.interpolate({
          inputRange: [0, 1],
          outputRange: ["40%", "0%"],
        }),
      },
    ],
    [listPanelSlide],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <Animated.View style={mapAreaStyle}>
        {hasMountedDirasakan && (
          <View
            style={[
              styles.tabPane,
              activeTab !== "GEMPA DIRASAKAN" && styles.hiddenPane,
            ]}
            pointerEvents={activeTab === "GEMPA DIRASAKAN" ? "auto" : "none"}
          >
            <GempaDirasakanHistoryContent
              tabBar={tabBar}
              onLoadingChange={setLoading}
              externalSelection={externalSelection}
              onListSelectionHandled={handleExternalSelectionHandled}
              onCardClose={handleCardClose}
              onCardOpen={handleCardOpen}
              onOpenNarasi={openNarasi}
              filterYear={effectiveFilter.year}
              filterMonths={effectiveMonths}
              filterMode={effectiveFilterMode}
              filterDateFrom={filterDateFrom}
              filterDateTo={filterDateTo}
              isActive={dirasakanActive}
            />
          </View>
        )}
        {hasMountedTerdeteksi && (
          <View
            style={[
              styles.tabPane,
              activeTab !== "GEMPA TERDETEKSI" && styles.hiddenPane,
            ]}
            pointerEvents={activeTab === "GEMPA TERDETEKSI" ? "auto" : "none"}
          >
            <GempaTerdeteksiHistoryContent
              tabBar={tabBar}
              onLoadingChange={setLoading}
              externalSelection={externalSelection}
              onListSelectionHandled={handleExternalSelectionHandled}
              onCardClose={handleCardClose}
              onCardOpen={handleCardOpen}
              onOpenHistory={openHistory}
              filterYear={effectiveFilter.year}
              filterMonths={effectiveMonths}
              filterMode={effectiveFilterMode}
              filterDateFrom={filterDateFrom}
              filterDateTo={filterDateTo}
              isActive={terdeteksiActive}
            />
          </View>
        )}
        {hasMountedTsunami && (
          <View
            style={[
              styles.tabPane,
              activeTab !== "RIWAYAT TSUNAMI" && styles.hiddenPane,
            ]}
            pointerEvents={activeTab === "RIWAYAT TSUNAMI" ? "auto" : "none"}
          >
            <TsunamiHistoryContent
              tabBar={tabBar}
              onLoadingChange={setLoading}
              externalSelection={externalSelection}
              onListSelectionHandled={handleExternalSelectionHandled}
              onCardClose={handleCardClose}
              onCardOpen={handleCardOpen}
              onOpenNarasi={openNarasi}
              filters={tsunamiFilters}
              isActive={tsunamiActive}
            />
          </View>
        )}
      </Animated.View>

      <HistoryListPanel
        emptyComponent={listEmpty}
        getItemLayout={getItemLayout}
        items={items}
        keyExtractor={keyExtractor}
        listLoading={listLoading}
        renderItem={renderItem}
        slideAnim={listPanelSlide}
        title={listTitle}
      />
      <ModalNarasi
        visible={narasiVisible}
        htmlContent={narasiHtmlContent}
        loading={narasiLoading}
        onClose={closeNarasi}
      />
      <ModalHistoricalProcess
        visible={historyVisible}
        rawContent={historyRawContent}
        loading={historyLoading}
        onClose={closeHistory}
      />
    </View>
  );
}
