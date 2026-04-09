import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import EarthquakeTabBar, {
  type EarthquakeTab,
} from "../../components/earthquake-tab-bar";
import GempaDirasakan from "./gempa-dirasakan";
import GempaTerdeteksi from "./gempa-terdeteksi";

export default function Earthquake() {
  const { tab } = useLocalSearchParams<{ tab?: string | string[] }>();
  const [activeTab, setActiveTab] = useState<EarthquakeTab>("GEMPA DIRASAKAN");
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
    <EarthquakeTabBar
      activeTab={activeTab}
      onTabPress={setActiveTab}
      disabled={loading}
    />
  );

  if (activeTab === "GEMPA DIRASAKAN") {
    return <GempaDirasakan tabBar={tabBar} onLoadingChange={setLoading} />;
  }

  return <GempaTerdeteksi tabBar={tabBar} onLoadingChange={setLoading} />;
}
