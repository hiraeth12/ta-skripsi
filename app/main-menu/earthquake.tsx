import { useState } from "react";
import EarthquakeTabBar, {
  type EarthquakeTab,
} from "../../components/earthquake-tab-bar";
import GempaDirasakan from "./gempa-dirasakan";
import GempaTerdeteksi from "./gempa-terdeteksi";

export default function Earthquake() {
  const [activeTab, setActiveTab] = useState<EarthquakeTab>("GEMPA DIRASAKAN");
  const [loading, setLoading] = useState(false);

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
