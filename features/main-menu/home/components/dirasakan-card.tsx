import Feather from "@expo/vector-icons/Feather";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../styles/homeStyles";
import { DetailItem } from "./detail-item";
import { StatItem } from "./stat-item";

type DirasakanQuake = {
  distanceKm: string;
  magnitude: string;
  kedalaman: string;
  latText: string;
  lonText: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  felt: string;
  latitude?: number;
  longitude?: number;
};

export const DirasakanCard = ({
  data,
  onShakeMap,
  hasShakeMap,
  onCardPress,
  onShare,
}: {
  data: DirasakanQuake | null;
  onShakeMap: () => void;
  hasShakeMap: boolean;
  onCardPress: () => void;
  onShare: () => void;
}) => (
  <TouchableOpacity
    style={styles.mapCard}
    activeOpacity={0.95}
    onPress={onCardPress}
  >
    <View style={styles.mapImageContainer}>
      <Image
        source={require("../../../../assets/images/navigation-map.png")}
        style={styles.mapImage}
      />
      <View style={styles.mapButtons}>
        <TouchableOpacity
          style={[styles.mapButton, !hasShakeMap && styles.mapButtonDisabled]}
          onPress={(e) => {
            e.stopPropagation();
            onShakeMap();
          }}
          disabled={!hasShakeMap}
        >
          <Feather name="map" size={12} color="white" />
          <Text style={styles.mapButtonText}>PETA GUNCANGAN</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.mapButton}
          onPress={(e) => {
            e.stopPropagation();
            onShare();
          }}
        >
          <Feather name="share" size={12} color="white" />
          <Text style={styles.mapButtonText}>BAGIKAN</Text>
        </TouchableOpacity>
      </View>
    </View>

    <View style={styles.statsTopRow}>
      <StatItem
        icon="triangle-wave"
        value={data?.magnitude ?? "-"}
        label="Magnitudo"
      />
      <View style={styles.statTopDivider} />
      <StatItem icon="rss" value={data?.kedalaman ?? "-"} label="Kedalaman" />
      <View style={styles.statTopDivider} />
      <StatItem
        icon="compass-outline"
        value={data?.latText ?? "-"}
        label="LS"
      />
      <View style={styles.statTopDivider} />
      <StatItem
        icon="compass-outline"
        value={data?.lonText ?? "-"}
        label="BT"
      />
    </View>

    <View style={styles.separator} />

    <View style={styles.infoContent}>
      <DetailItem
        icon="location"
        label="Lokasi Gempa :"
        value={data?.wilayah ?? "-"}
      />
      <DetailItem
        icon="time-outline"
        label="Waktu :"
        value={data ? `${data.tanggal}, ${data.jam}` : "-"}
      />
      <DetailItem
        icon="walk-outline"
        label="Jarak :"
        value={data ? `${data.distanceKm} km dari lokasi Anda` : "-"}
      />
      {!!data?.felt && (
        <DetailItem
          icon="alert-circle-outline"
          label="Wilayah Dirasakan :"
          value={data.felt}
        />
      )}
    </View>
  </TouchableOpacity>
);
