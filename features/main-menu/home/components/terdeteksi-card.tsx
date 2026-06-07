import EarthquakeMap from "@/components/ui/earthquake-map";
import type { MapViewType } from "@/constants/map";
import Feather from "@expo/vector-icons/Feather";
import React, { useRef } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../styles/homeStyles";
import { DetailItem } from "./detail-item";
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
  status: string;
  latitude?: number;
  longitude?: number;
  eventId?: string;
};

export const TerdeteksiCard = ({
  data,
  onCardPress,
  onShare,
  onHistory,
  hasHistory,
}: {
  data: TerdeteksiQuake | null;
  onCardPress: () => void;
  onShare: () => void;
  onHistory: () => void;
  hasHistory: boolean;
}) => {
  const mapRef = useRef<MapViewType | null>(null);

  return (
    <TouchableOpacity
      style={styles.mapCard}
      activeOpacity={0.95}
      onPress={onCardPress}
    >
      <View style={styles.mapImageContainer}>
        {data?.latitude && data?.longitude ? (
          <View style={styles.mapImage} pointerEvents="none">
            <EarthquakeMap
              mapRef={mapRef}
              initialRegion={{
                latitude: data.latitude,
                longitude: data.longitude,
                latitudeDelta: 3.5,
                longitudeDelta: 3.5,
              }}
              markerCoordinate={{
                latitude: data.latitude,
                longitude: data.longitude,
                magnitude: data.magnitude,
                depth: data.kedalaman,
              }}
              showFaultLines={false}
              showMapChrome={false}
              showUserMarker={false}
            />
          </View>
        ) : (
          <Image
            source={require("@/assets/images/navigation-map.png")}
            style={styles.mapImage}
          />
        )}
        <View style={styles.mapButtons}>
          {hasHistory && (
            <TouchableOpacity
              style={styles.mapButton}
              onPress={(e) => {
                e.stopPropagation();
                onHistory();
              }}
            >
              <Feather name="activity" size={12} color="white" />
              <Text style={styles.mapButtonText}>PROSES HISTORIS</Text>
            </TouchableOpacity>
          )}

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
          icon="calendar-outline"
          label="Tanggal :"
          value={data?.tanggal ?? "-"}
        />
        <DetailItem
          icon="time-outline"
          label="Jam :"
          value={data?.jam ?? "-"}
        />
        {!!data?.status && (
          <DetailItem
            icon="alert-circle-outline"
            label="Status :"
            value={data.status}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};
