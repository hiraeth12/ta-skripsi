import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export const EARTHQUAKE_TABS = ["GEMPA DIRASAKAN", "GEMPA TERDETEKSI"] as const;
export const EARTHQUAKE_MAP_TABS = [
  "GEMPA DIRASAKAN",
  "GEMPA TERDETEKSI",
  "TSUNAMI",
] as const;
export type EarthquakeTab = (typeof EARTHQUAKE_TABS)[number];
export type EarthquakeMapTab = (typeof EARTHQUAKE_MAP_TABS)[number];

const TAB_LABEL_KEYS: Record<string, string> = {
  "GEMPA DIRASAKAN": "earthquakeTabs.felt",
  "GEMPA TERDETEKSI": "earthquakeTabs.detected",
  "RIWAYAT TSUNAMI": "historyTabs.tsunami",
  TSUNAMI: "earthquakeTabs.tsunami",
};

type Props<TTab extends string = EarthquakeTab> = {
  activeTab: TTab;
  onTabPress: (tab: TTab) => void;
  disabled?: boolean;
  tabs?: readonly TTab[];
};

export default function EarthquakeTabBar<TTab extends string = EarthquakeTab>({
  activeTab,
  onTabPress,
  disabled = false,
  tabs = EARTHQUAKE_TABS as unknown as readonly TTab[],
}: Props<TTab>) {
  const { t } = useTranslation();

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <TouchableOpacity
            key={tab}
            onPress={() => !disabled && onTabPress(tab)}
            style={[styles.tab, isActive && styles.tabActive]}
            activeOpacity={0.8}
            disabled={disabled}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.tabText,
                isActive && styles.tabTextActive,
                disabled && isActive && { opacity: 0.6 },
              ]}
            >
              {TAB_LABEL_KEYS[tab] ? t(TAB_LABEL_KEYS[tab]) : tab}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#EDEDED",
    borderRadius: 50,
    padding: 5,
    maxWidth: "100%",
    alignSelf: "center", // ← rata tengah secara horizontal
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1, // ← tiap tab ambil porsi yang sama
    alignItems: "center", // ← teks di tengah tab
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 50,
  },
  tabActive: {
    backgroundColor: "#0C4A6E",
  },
  tabText: {
    fontSize: 11, // ← turunkan sedikit
    fontWeight: "700",
    color: "#0C4A6E",
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: "#EDEDED",
  },
});
