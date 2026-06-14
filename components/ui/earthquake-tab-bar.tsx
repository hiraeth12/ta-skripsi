import { useTranslation } from "react-i18next";
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  useWindowDimensions,
  View,
} from "react-native";

export const EARTHQUAKE_TABS = ["GEMPA DIRASAKAN", "GEMPA TERDETEKSI"] as const;
export const EARTHQUAKE_MAP_TABS = [
  "GEMPA DIRASAKAN",
  "GEMPA TERDETEKSI",
  "TSUNAMI",
] as const;
export type EarthquakeTab = (typeof EARTHQUAKE_TABS)[number];
export type EarthquakeMapTab = (typeof EARTHQUAKE_MAP_TABS)[number];

const isBridgeless =
  (
    globalThis as typeof globalThis & {
      RN$Bridgeless?: boolean;
    }
  ).RN$Bridgeless === true;

if (Platform.OS === "android" && !isBridgeless) {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const TAB_LABEL_KEYS: Record<string, string> = {
  "GEMPA DIRASAKAN": "earthquakeTabs.felt",
  "GEMPA TERDETEKSI": "earthquakeTabs.detected",
  "RIWAYAT TSUNAMI": "historyTabs.tsunami",
  TSUNAMI: "earthquakeTabs.tsunami",
};

const TAB_BAR_MAX_WIDTH = 360;
const TAB_BAR_HORIZONTAL_SAFE_SPACE = 40;
const ACTIVE_TAB_FLEX = 1.75;
const INACTIVE_TAB_FLEX = 1;

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
  const { width } = useWindowDimensions();
  const tabBarWidth = Math.min(
    Math.max(width - TAB_BAR_HORIZONTAL_SAFE_SPACE, 0),
    TAB_BAR_MAX_WIDTH,
  );

  return (
    <View style={[styles.tabBarFrame, { width: tabBarWidth }]}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          const handlePress = () => {
            if (disabled) return;
            if (!isActive) {
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
              );
            }
            onTabPress(tab);
          };

          return (
            <TouchableOpacity
              key={tab}
              onPress={handlePress}
              style={[
                styles.tab,
                { flex: isActive ? ACTIVE_TAB_FLEX : INACTIVE_TAB_FLEX },
                isActive && styles.tabActive,
              ]}
              activeOpacity={0.8}
              disabled={disabled}
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
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
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarFrame: {
    alignSelf: "center",
    maxWidth: "100%",
  },
  tabBar: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#EDEDED",
    borderRadius: 50,
    height: 42,
    padding: 5,
    width: "100%",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 50,
    overflow: "hidden",
  },
  tabActive: {
    backgroundColor: "#0C4A6E",
  },
  tabText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#0C4A6E",
    letterSpacing: 0,
    textAlign: "center",
  },
  tabTextActive: {
    color: "#EDEDED",
  },
});
