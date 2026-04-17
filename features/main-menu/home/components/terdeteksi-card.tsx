import { Image, TouchableOpacity, View } from "react-native";
import { styles } from "../styles/homeStyles";
import { DetailItem } from "./detail-item";
import { ShareButton } from "./share-button";
import { StatItem } from "./stat-item";

type TerdeteksiQuake = {
  distanceKm: string;
  magnitude: string;
  kedalaman: string;
  latText: string;
  lonText: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  fase: string;
};

export const TerdeteksiCard = ({
  data,
  onCardPress,
}: {
  data: TerdeteksiQuake | null;
  onCardPress: () => void;
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
        <ShareButton data={data} type="terdeteksi" />
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
        label="Tanggal :"
        value={data?.tanggal ?? "-"}
      />
      <DetailItem icon="time-outline" label="Jam :" value={data?.jam ?? "-"} />
      {!!data?.fase && (
        <DetailItem
          icon="alert-circle-outline"
          label="Fase :"
          value={data.fase}
        />
      )}
    </View>
  </TouchableOpacity>
);
