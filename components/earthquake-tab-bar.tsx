import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export const EARTHQUAKE_TABS = ["GEMPA DIRASAKAN", "GEMPA TERDETEKSI"] as const;
export type EarthquakeTab = (typeof EARTHQUAKE_TABS)[number];

type Props = {
  activeTab: EarthquakeTab;
  onTabPress: (tab: EarthquakeTab) => void;
  disabled?: boolean;
};

export default function EarthquakeTabBar({
  activeTab,
  onTabPress,
  disabled = false,
}: Props) {
  return (
    <View style={styles.tabBar}>
      {EARTHQUAKE_TABS.map((tab) => {
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
              style={[
                styles.tabText,
                isActive && styles.tabTextActive,
                disabled && isActive && { opacity: 0.6 },
              ]}
            >
              {tab}
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
    backgroundColor: "#0C4A6E",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0C4A6E",
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: "#EDEDED",
  },
});
