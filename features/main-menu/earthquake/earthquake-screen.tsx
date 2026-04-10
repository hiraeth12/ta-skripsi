import EarthquakeTabBar, {
  type EarthquakeTab,
} from "@/components/earthquake-tab-bar";
import { useIsFocused } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import GempaDirasakan from "./components/gempa-dirasakan-content";
import GempaTerdeteksi from "./components/gempa-terdeteksi-content";

export default function Earthquake() {
  const { tab } = useLocalSearchParams<{ tab?: string | string[] }>();
  const isFocused = useIsFocused();
  const [activeTab, setActiveTab] = useState<EarthquakeTab>("GEMPA DIRASAKAN");
  const [loading, setLoading] = useState(false);
  const [hasMountedDirasakan, setHasMountedDirasakan] = useState(true);
  const [hasMountedTerdeteksi, setHasMountedTerdeteksi] = useState(false);

  useEffect(() => {
    const rawTab = Array.isArray(tab) ? tab[0] : tab;
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
    setHasMountedTerdeteksi(true);
  }, [activeTab]);

  const handleTabPress = useCallback((nextTab: EarthquakeTab) => {
    setActiveTab(nextTab);
  }, []);

  const tabBar = useMemo(
    () => (
      <EarthquakeTabBar
        activeTab={activeTab}
        onTabPress={handleTabPress}
        disabled={loading}
      />
    ),
    [activeTab, handleTabPress, loading],
  );

  const dirasakanActive = isFocused && activeTab === "GEMPA DIRASAKAN";
  const terdeteksiActive = isFocused && activeTab === "GEMPA TERDETEKSI";

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
            tabBar={tabBar}
            onLoadingChange={setLoading}
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
            tabBar={tabBar}
            onLoadingChange={setLoading}
            isActive={terdeteksiActive}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabPane: { flex: 1 },
  hiddenPane: { display: "none" },
});
