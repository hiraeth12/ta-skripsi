import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import EarthquakeTabBar, {
  type EarthquakeTab,
} from "../../components/earthquake-tab-bar";
import {
  GempaDirasakanHistoryContent,
  GempaTerdeteksiHistoryContent,
} from "./main-menu-history";

export default function History() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{
    tab?: string;
    selectedEventId?: string;
    selectedLatitude?: string;
    selectedLongitude?: string;
    selectedMagnitude?: string;
    selectedLocation?: string;
    selectedWaktu?: string;
    selectedJarak?: string;
    selectedDistanceKm?: string;
    selectedTanggal?: string;
    selectedJam?: string;
    selectedKedalaman?: string;
    selectedFelt?: string;
    selectedShakemap?: string;
  }>();

  function asSingle(value?: string | string[]) {
    if (Array.isArray(value)) return value[0] ?? "";
    return value ?? "";
  }

  const tabParam = asSingle(searchParams.tab);
  const initialTab: EarthquakeTab =
    tabParam === "terdeteksi" ? "GEMPA TERDETEKSI" : "GEMPA DIRASAKAN";
  const [activeTab, setActiveTab] = useState<EarthquakeTab>(initialTab);
  const [loading, setLoading] = useState(false);

  const clearSelectionParams = useCallback(() => {
    router.setParams({
      tab: undefined,
      selectedEventId: undefined,
      selectedLatitude: undefined,
      selectedLongitude: undefined,
      selectedMagnitude: undefined,
      selectedLocation: undefined,
      selectedWaktu: undefined,
      selectedJarak: undefined,
      selectedDistanceKm: undefined,
      selectedTanggal: undefined,
      selectedJam: undefined,
      selectedKedalaman: undefined,
      selectedFelt: undefined,
      selectedShakemap: undefined,
    });
  }, [router]);

  useEffect(() => {
    const incomingTab = asSingle(searchParams.tab);
    if (incomingTab === "terdeteksi") {
      setActiveTab("GEMPA TERDETEKSI");
    } else if (incomingTab === "dirasakan") {
      setActiveTab("GEMPA DIRASAKAN");
    }
  }, [searchParams.tab]);

  const externalSelection = useMemo(() => {
    const eventId = asSingle(searchParams.selectedEventId);
    const latitude = parseFloat(asSingle(searchParams.selectedLatitude));
    const longitude = parseFloat(asSingle(searchParams.selectedLongitude));
    if (!eventId || Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

    const tanggal = asSingle(searchParams.selectedTanggal);
    const jam = asSingle(searchParams.selectedJam);
    const waktu = asSingle(searchParams.selectedWaktu);
    const [fallbackJam, fallbackTanggal] = waktu.split("•").map((part) => part.trim());
    const distanceKm =
      asSingle(searchParams.selectedDistanceKm) ||
      asSingle(searchParams.selectedJarak).replace(/[^0-9.,]/g, "") ||
      "0";

    return {
      eventId,
      latitude,
      longitude,
      magnitude: asSingle(searchParams.selectedMagnitude) || "-",
      lokasi: asSingle(searchParams.selectedLocation) || "-",
      tanggal: tanggal || fallbackTanggal || "",
      jam: jam || fallbackJam || "",
      distanceKm,
      kedalaman: asSingle(searchParams.selectedKedalaman) || "-",
      felt: asSingle(searchParams.selectedFelt),
      shakemap: asSingle(searchParams.selectedShakemap) || null,
    };
  }, [searchParams]);

  function handleTabPress(tab: EarthquakeTab) {
    setActiveTab(tab);
  }

  function handleExternalSelectionHandled() {
    clearSelectionParams();
  }

  function handleListPress() {
    router.push({
      pathname: "/main-menu/list-gempa",
      params: {
        tab: activeTab === "GEMPA DIRASAKAN" ? "dirasakan" : "terdeteksi",
      },
    });
  }

  const tabBar = (
    <View style={styles.topControls}>
      <EarthquakeTabBar
        activeTab={activeTab}
        onTabPress={handleTabPress}
        disabled={loading}
      />

      <View style={styles.designSection}>
        <View style={styles.periodChip}>
          <Text style={styles.periodChipText}>Oktober 2025 • Jawa Barat</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.sidePill, styles.sidePillLeft, styles.sidePillLeftContent]}
            activeOpacity={0.85}
            onPress={handleListPress}
          >
            <Text style={[styles.sidePillText, styles.sidePillTextRight]}>
              LIST
            </Text>
            <Ionicons name="chevron-forward" size={17} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sidePill,
              styles.sidePillRight,
              styles.sidePillRightContent,
            ]}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={17} color="#FFFFFF" />
            <Text style={[styles.sidePillText, styles.sidePillTextLeft]}>
              FILTER
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const content =
    activeTab === "GEMPA DIRASAKAN" ? (
      <GempaDirasakanHistoryContent
        tabBar={tabBar}
        onLoadingChange={setLoading}
        externalSelection={externalSelection}
        onListSelectionHandled={handleExternalSelectionHandled}
      />
    ) : (
      <GempaTerdeteksiHistoryContent
        tabBar={tabBar}
        onLoadingChange={setLoading}
        externalSelection={externalSelection}
        onListSelectionHandled={handleExternalSelectionHandled}
      />
    );

  return content;
}

const styles = StyleSheet.create({
  topControls: {
    position: "absolute",
    left: 10,
    right: 10,
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
  },
  designSection: {
    width: "100%",
    alignItems: "center",
    gap: 10,
  },
  periodChip: {
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 6,
    borderRadius: 999,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    alignSelf: "center",
  },
  periodChipText: {
    color: "#0369A1",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  actionRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 0,
  },
  sidePill: {
    minWidth: 108,
    height: 31,
    borderRadius: 999,
    backgroundColor: "#1195BD",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 3,
    marginTop: 6,
  },
  sidePillLeft: {
    marginLeft: -40,
  },
  sidePillLeftContent: {
    justifyContent: "flex-end",
  },
  sidePillRight: {
    marginRight: -40,
  },
  sidePillRightContent: {
    justifyContent: "flex-start",
  },
  sidePillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  sidePillTextRight: {
    textAlign: "right",
    marginRight: 6,
  },
  sidePillTextLeft: {
    textAlign: "left",
    marginLeft: 6,
  },
});
