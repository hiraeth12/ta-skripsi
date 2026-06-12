import { ModalHistoricalProcess } from "@/components/ui/modal-historical-process";
import { ModalNarasi } from "@/components/ui/modal-narasi";
import { ModalShakeMap } from "@/components/ui/modal-shakemap";
import { NetworkErrorModal } from "@/components/ui/network-error-modal";
import PullToRefresh from "@/components/ui/pull-to-refresh";
import Skeleton from "@/components/ui/skeleton";
import { CACHE_KEYS, getPersistentCache } from "@/utils/cache";
import { calculateTimeAgo } from "@/utils/date";
import { computeStatus } from "@/utils/earthquake";
import { shareQuake } from "@/utils/share";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CardSkeleton } from "./components/card-skeleton";
import { DirasakanCard } from "./components/dirasakan-card";
import { InfoModal } from "./components/info-modal";
import { TerdeteksiCard } from "./components/terdeteksi-card";
import { TsunamiCard } from "./components/tsunami-card";
import { SCREEN_WIDTH } from "./constants";
import { useHomeData } from "@/features/main-menu/home/hooks/use-home-data";
import { useHomePolling } from "@/features/main-menu/home/hooks/use-home-polling";
import { useUserLocation } from "@/features/main-menu/home/hooks/use-user-location";
import { styles } from "./styles/homeStyles";
import { useUserSession } from "@/features/main-menu/account/user-session-context";
import type { DirasakanQuake, TerdeteksiQuake } from "./types";
import type { TsunamiQuake } from "./components/tsunami-card";

export default function Home() {
  const router = useRouter();
  const session = useUserSession();

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [activeShakeMapUrl, setActiveShakeMapUrl] = useState<string | null>(null);
  const [shakeMapVisible, setShakeMapVisible] = useState(false);
  const [narasiVisible, setNarasiVisible] = useState(false);
  const [narasiHtmlContent, setNarasiHtmlContent] = useState<string | null>(null);
  const [narasiLoading, setNarasiLoading] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyRawContent, setHistoryRawContent] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [infoVisibleDirasakan, setInfoVisibleDirasakan] = useState(false);
  const [infoVisibleTerdeteksi, setInfoVisibleTerdeteksi] = useState(false);
  const [infoVisibleTsunami, setInfoVisibleTsunami] = useState(false);
  const [networkErrorModalVisible, setNetworkErrorModalVisible] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const networkErrorShownRef = useRef(false);

  const showNetworkError = useCallback(() => {
    if (networkErrorShownRef.current) return;
    networkErrorShownRef.current = true;
    setNetworkErrorModalVisible(true);
  }, []);

  const {
    dirasakanData,
    setDirasakanData,
    terdeteksiData,
    setTerdeteksiData,
    tsunamiData,
    setTsunamiData,
    dirasakanShakeMapUrl,
    dirasakanNarasiUrl,
    tsunamiNarasiUrl,
    terdeteksiHistoryUrl,
    fetchLatestHomeCards,
  } = useHomeData(isMountedRef);

  const {
    userLocation,
    userLocationRef,
    locationImageUrl,
    locationImageLoading,
    setLocationImageLoading,
    userName,
    applyHomeUserData,
  } = useUserLocation(session.user?.uid, isMountedRef);

  const { handleRefresh } = useHomePolling({
    isMountedRef,
    userLocationRef,
    fetchLatestHomeCards,
    applyHomeUserData,
    setRefreshing,
    showNetworkError,
  });

  const status = useMemo(() => computeStatus(dirasakanData), [dirasakanData]);
  const timeAgo = useMemo(
    () => calculateTimeAgo(dirasakanData?.tanggal ?? "", dirasakanData?.jam ?? ""),
    [dirasakanData?.tanggal, dirasakanData?.jam],
  );

  const handleShareDirasakan = useCallback(
    () => shareQuake(dirasakanData, "dirasakan"),
    [dirasakanData],
  );
  const handleShareTerdeteksi = useCallback(
    () => shareQuake(terdeteksiData, "terdeteksi"),
    [terdeteksiData],
  );
  const handleShareTsunami = useCallback(
    () => shareQuake(tsunamiData, "tsunami"),
    [tsunamiData],
  );

  /**
   * Generic: fetch isi narasi .txt lalu buka modal.
   * Dipakai oleh handler dirasakan maupun tsunami.
   */
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

  const handleOpenNarasiDirasakan = useCallback(() => {
    if (!dirasakanNarasiUrl) return;
    openNarasi(dirasakanNarasiUrl);
  }, [dirasakanNarasiUrl, openNarasi]);

  const handleOpenNarasiTsunami = useCallback(() => {
    if (!tsunamiNarasiUrl) return;
    openNarasi(tsunamiNarasiUrl);
  }, [tsunamiNarasiUrl, openNarasi]);

  const handleOpenHistory = useCallback(async () => {
    if (!terdeteksiHistoryUrl) return;
    setHistoryRawContent(null);
    setHistoryLoading(true);
    setHistoryVisible(true);

    try {
      const res = await fetch(terdeteksiHistoryUrl);
      if (!res.ok) throw new Error(`history fetch failed: ${res.status}`);
      const text = await res.text();
      setHistoryRawContent(text);
    } catch {
      setHistoryRawContent(null);
    } finally {
      setHistoryLoading(false);
    }
  }, [terdeteksiHistoryUrl]);

  useEffect(() => {
    let isMounted = true;
    async function hydrateLatestFromStorage() {
      const [cachedDirasakan, cachedTerdeteksi, cachedTsunami] =
        await Promise.all([
          getPersistentCache<DirasakanQuake>(CACHE_KEYS.DIRASAKAN),
          getPersistentCache<TerdeteksiQuake>(CACHE_KEYS.TERDETEKSI),
          getPersistentCache<TsunamiQuake>(CACHE_KEYS.TSUNAMI),
        ]);
      if (!isMounted) return;
      if (!dirasakanData && cachedDirasakan) setDirasakanData(cachedDirasakan);
      if (!terdeteksiData && cachedTerdeteksi) setTerdeteksiData(cachedTerdeteksi);
      if (!tsunamiData && cachedTsunami) setTsunamiData(cachedTsunami);
    }
    hydrateLatestFromStorage();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    applyHomeUserData(session.profile, session.location).catch(() => {
      if (isMountedRef.current) setLocationImageLoading(false);
    });
  }, [applyHomeUserData, session.location, session.profile]);

  useEffect(() => {
    setCurrentDate(new Date());
    const id = setInterval(() => setCurrentDate(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setActiveTab((prev) => (prev !== index ? index : prev));
    },
    [],
  );

  return (
    <View style={styles.container}>
      <PullToRefresh refreshing={refreshing} onRefresh={handleRefresh}>
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greeting}>Halo, {userName} !</Text>
            <Text style={styles.date}>
              {currentDate.toLocaleDateString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
        </View>

        {/* Location card */}
        <View style={styles.locationCard}>
          {locationImageLoading || !locationImageUrl ? (
            <View style={[styles.locationImage, styles.skeletonLoading]} />
          ) : (
            <Image source={{ uri: locationImageUrl }} style={styles.locationImage} />
          )}
          <Text style={styles.locationText}>
            <Ionicons name="location-outline" size={16} /> {userLocation.name}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialIcons name="history" size={20} color="#1E6F9F" />
              <Text style={styles.statLabel}>GEMPA TERAKHIR</Text>
              {dirasakanData ? (
                <Text style={styles.statValue}>{timeAgo}</Text>
              ) : (
                <Skeleton width={80} height={14} borderRadius={4} />
              )}
            </View>
            <View style={styles.statItem}>
              <Ionicons name="location-outline" size={20} color="#1E6F9F" />
              <Text style={styles.statLabel}>JARAK GEMPA</Text>
              {dirasakanData ? (
                <Text style={styles.statValue}>{`${dirasakanData.distanceKm} km`}</Text>
              ) : (
                <Skeleton width={60} height={14} borderRadius={4} />
              )}
            </View>
            <View style={styles.statItem}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={dirasakanData ? status.color : "#CBD5E1"}
              />
              <Text style={styles.statLabel}>STATUS WILAYAH</Text>
              {dirasakanData ? (
                <Text style={[styles.statValue, { color: status.color, fontWeight: "bold" }]}>
                  {status.label}
                </Text>
              ) : (
                <Skeleton width={70} height={14} borderRadius={4} />
              )}
            </View>
          </View>
        </View>

        {/* Cards carousel */}
        <View style={styles.bottomSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            onScroll={handleScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
          >
            {/* Dirasakan */}
            <View style={{ width: SCREEN_WIDTH }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Gempabumi Terakhir Dirasakan</Text>
                <TouchableOpacity onPress={() => setInfoVisibleDirasakan(true)}>
                  <Ionicons name="information-circle-outline" size={25} color="#fff" />
                </TouchableOpacity>
              </View>
              {dirasakanData ? (
                <DirasakanCard
                  data={dirasakanData}
                  onShakeMap={() => {
                    setActiveShakeMapUrl(dirasakanShakeMapUrl);
                    setShakeMapVisible(true);
                  }}
                  hasShakeMap={!!dirasakanShakeMapUrl}
                  onNarasi={handleOpenNarasiDirasakan}
                  hasNarasi={!!dirasakanNarasiUrl}
                  onShare={handleShareDirasakan}
                  onCardPress={() =>
                    router.push({ pathname: "/main-menu/earthquake", params: { tab: "GEMPA DIRASAKAN" } })
                  }
                />
              ) : (
                <CardSkeleton />
              )}
            </View>

            {/* Terdeteksi */}
            <View style={{ width: SCREEN_WIDTH }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Gempabumi Terakhir Terdeteksi</Text>
                <TouchableOpacity onPress={() => setInfoVisibleTerdeteksi(true)}>
                  <Ionicons name="information-circle-outline" size={25} color="#fff" />
                </TouchableOpacity>
              </View>
              {terdeteksiData ? (
                <TerdeteksiCard
                  data={terdeteksiData}
                  onShare={handleShareTerdeteksi}
                  onHistory={handleOpenHistory}
                  hasHistory={!!terdeteksiHistoryUrl}
                  onCardPress={() =>
                    router.push({ pathname: "/main-menu/earthquake", params: { tab: "GEMPA TERDETEKSI" } })
                  }
                />
              ) : (
                <CardSkeleton />
              )}
            </View>

            {/* Tsunami */}
            <View style={{ width: SCREEN_WIDTH }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Informasi Tsunami Terakhir</Text>
                <TouchableOpacity onPress={() => setInfoVisibleTsunami(true)}>
                  <Ionicons name="information-circle-outline" size={25} color="#fff" />
                </TouchableOpacity>
              </View>
              <TsunamiCard
                data={tsunamiData}
                onShakeMap={() => {
                  setActiveShakeMapUrl(tsunamiData?.shakemap ?? null);
                  setShakeMapVisible(true);
                }}
                hasShakeMap={!!tsunamiData?.shakemap}
                onNarasi={handleOpenNarasiTsunami}
                hasNarasi={!!tsunamiNarasiUrl}
                onShare={handleShareTsunami}
                onCardPress={() =>
                  router.push({ pathname: "/main-menu/earthquake", params: { tab: "TSUNAMI" } })
                }
              />
            </View>
          </ScrollView>

          <View style={styles.paginationContainer}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[styles.dot, activeTab === i ? styles.dotActive : styles.dotInactive]}
              />
            ))}
          </View>
        </View>
      </PullToRefresh>

      {/* Modals */}
      <InfoModal
        visible={infoVisibleDirasakan}
        onClose={() => setInfoVisibleDirasakan(false)}
        title="Gempabumi Terakhir Dirasakan"
        desc="Menampilkan kejadian gempa yang telah diverifikasi oleh BMKG , termasuk informasi dampak dan tingkat kerusakannya."
      />
      <InfoModal
        visible={infoVisibleTerdeteksi}
        onClose={() => setInfoVisibleTerdeteksi(false)}
        title="Gempabumi Terakhir Terdeteksi"
        desc="Menampilkan kejadian gempa yang masih berada pada tahap terdeteksi oleh seismograf. Informasi ini mengutamakan kecepatan, sehingga dampak dan tingkat kerusakannya belum diverifikasi oleh BMKG."
      />
      <InfoModal
        visible={infoVisibleTsunami}
        onClose={() => setInfoVisibleTsunami(false)}
        title="Peringatan Tsunami"
        desc="Menampilkan informasi peringatan dini tsunami terbaru dari BMKG, termasuk tahapan PD-1 hingga PD-4 sebagai pembaruan status peringatan, mulai dari informasi awal, pemutakhiran data, pemantauan ancaman, hingga peringatan dinyatakan berakhir.
"
      />
      <NetworkErrorModal
        visible={networkErrorModalVisible}
        onClose={() => {
          setNetworkErrorModalVisible(false);
          networkErrorShownRef.current = false;
        }}
      />
      <ModalShakeMap
        visible={shakeMapVisible}
        imageUrl={activeShakeMapUrl}
        onClose={() => setShakeMapVisible(false)}
      />
      {/* Modal narasi resmi BMKG */}
      <ModalNarasi
        visible={narasiVisible}
        htmlContent={narasiHtmlContent}
        loading={narasiLoading}
        onClose={() => {
          setNarasiVisible(false);
          setNarasiHtmlContent(null);
        }}
      />
      <ModalHistoricalProcess
        visible={historyVisible}
        rawContent={historyRawContent}
        loading={historyLoading}
        onClose={() => {
          setHistoryVisible(false);
          setHistoryRawContent(null);
        }}
      />
    </View>
  );
}
