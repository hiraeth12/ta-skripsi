import { ModalHistoricalProcess } from "@/components/ui/modal-historical-process";
import { ModalNarasi } from "@/components/ui/modal-narasi";
import EarthquakeTabBar, {
    EARTHQUAKE_MAP_TABS,
    type EarthquakeMapTab,
} from "@/components/ui/earthquake-tab-bar";
import { useIsFocused } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import GempaDirasakan from "./components/gempa-dirasakan-content";
import GempaTerdeteksi from "./components/gempa-terdeteksi-content";
import TsunamiContent from "./components/tsunami-content";

export default function Earthquake() {
  const { tab } = useLocalSearchParams<{ tab?: string | string[] }>();
  const isFocused = useIsFocused();
  const [activeTab, setActiveTab] =
    useState<EarthquakeMapTab>("GEMPA DIRASAKAN");
  const [loading, setLoading] = useState(false);
  const [hasMountedDirasakan, setHasMountedDirasakan] = useState(true);
  const [hasMountedTerdeteksi, setHasMountedTerdeteksi] = useState(false);
  const [hasMountedTsunami, setHasMountedTsunami] = useState(false);
  const [narasiVisible, setNarasiVisible] = useState(false);
  const [narasiHtmlContent, setNarasiHtmlContent] = useState<string | null>(null);
  const [narasiLoading, setNarasiLoading] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyRawContent, setHistoryRawContent] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const rawTab = Array.isArray(tab) ? tab[0] : tab;
    if (rawTab === "TSUNAMI") {
      setActiveTab("TSUNAMI");
      return;
    }
    if (rawTab === "GEMPA TERDETEKSI") {
      setActiveTab("GEMPA TERDETEKSI");
      return;
    }
    if (rawTab === "GEMPA DIRASAKAN") {
      setActiveTab("GEMPA DIRASAKAN");
    }
  }, [tab]);

  useEffect(() => {
    if (activeTab === "GEMPA DIRASAKAN") {
      setHasMountedDirasakan(true);
      return;
    }
    if (activeTab === "GEMPA TERDETEKSI") {
      setHasMountedTerdeteksi(true);
      return;
    }
    setHasMountedTsunami(true);
  }, [activeTab]);

  const handleTabPress = useCallback((nextTab: EarthquakeMapTab) => {
    setActiveTab(nextTab);
  }, []);

  const renderTabBar = useCallback(
    () => (
      <EarthquakeTabBar
        activeTab={activeTab}
        onTabPress={handleTabPress}
        disabled={loading}
        tabs={EARTHQUAKE_MAP_TABS}
      />
    ),
    [activeTab, handleTabPress, loading],
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

  const dirasakanActive = isFocused && activeTab === "GEMPA DIRASAKAN";
  const terdeteksiActive = isFocused && activeTab === "GEMPA TERDETEKSI";
  const tsunamiActive = isFocused && activeTab === "TSUNAMI";

  return (
    <View style={styles.container}>
      {hasMountedDirasakan && (
        <View
          style={[
            styles.tabPane,
            activeTab !== "GEMPA DIRASAKAN" && styles.hiddenPane,
          ]}
          pointerEvents={activeTab === "GEMPA DIRASAKAN" ? "auto" : "none"}
        >
          <GempaDirasakan
            tabBar={renderTabBar()}
            onLoadingChange={setLoading}
            onOpenNarasi={openNarasi}
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
          <GempaTerdeteksi
            tabBar={renderTabBar()}
            onLoadingChange={setLoading}
            onOpenHistory={openHistory}
            isActive={terdeteksiActive}
          />
        </View>
      )}

      {hasMountedTsunami && (
        <View
          style={[styles.tabPane, activeTab !== "TSUNAMI" && styles.hiddenPane]}
          pointerEvents={activeTab === "TSUNAMI" ? "auto" : "none"}
        >
          <TsunamiContent
            tabBar={renderTabBar()}
            onLoadingChange={setLoading}
            onOpenNarasi={openNarasi}
            isActive={tsunamiActive}
          />
        </View>
      )}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabPane: { flex: 1 },
  hiddenPane: {
    opacity: 0,
    position: "absolute",
    zIndex: -1,
    pointerEvents: "none", // already handled by parent but belt-and-suspenders
  },
});
