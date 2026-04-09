import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import GempaDirasakan from "./gempa-dirasakan";
import GempaTerdeteksi from "./gempa-terdeteksi";

const TABS = ["GEMPA DIRASAKAN", "GEMPA TERDETEKSI"] as const;
type Tab = (typeof TABS)[number];

export default function Earthquake() {
  const { tab } = useLocalSearchParams<{ tab?: string | string[] }>();
  const [activeTab, setActiveTab] = useState<Tab>("GEMPA DIRASAKAN");
  const [loading, setLoading] = useState(false);

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

  const tabBar = (
    <View style={styles.tabBar}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <TouchableOpacity
            key={tab}
            onPress={() => !loading && setActiveTab(tab)}
            style={[styles.tab, isActive && styles.tabActive]}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text
              style={[
                styles.tabText,
                isActive && styles.tabTextActive,
                loading && isActive && { opacity: 0.6 },
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (activeTab === "GEMPA DIRASAKAN") {
    return <GempaDirasakan tabBar={tabBar} onLoadingChange={setLoading} />;
  }

  return <GempaTerdeteksi tabBar={tabBar} onLoadingChange={setLoading} />;
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 50,
    padding: 5,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 50,
  },
  tabActive: {
    backgroundColor: "#0369A1",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E88C8",
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: "#fff",
  },
});
