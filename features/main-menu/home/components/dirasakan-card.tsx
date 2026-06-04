import EarthquakeMap from "@/components/earthquake-map";
import type { MapViewType } from "@/constants/map";
import Feather from "@expo/vector-icons/Feather";
import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
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
}) => {
  const mapRef = useRef<MapViewType | null>(null);
  const { t } = useTranslation();

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
            source={require("../../../../assets/images/navigation-map.png")}
            style={styles.mapImage}
          />
        )}

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
            <Text style={styles.mapButtonText}>{t("shakeMap")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mapButton}
            onPress={(e) => {
              e.stopPropagation();
              onShare();
            }}
          >
            <Feather name="share" size={12} color="white" />
            <Text style={styles.mapButtonText}>{t("common.share")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsTopRow}>
        <StatItem
          icon="triangle-wave"
          value={data?.magnitude ?? "-"}
          label={t("earthquake.magnitude")}
        />

        <View style={styles.statTopDivider} />

        <StatItem
          icon="rss"
          value={data?.kedalaman ?? "-"}
          label={t("earthquake.depth")}
        />

        <View style={styles.statTopDivider} />

        <StatItem
          icon="compass-outline"
          value={data?.latText ?? "-"}
          label={t("earthquake.latitude")}
        />

        <View style={styles.statTopDivider} />

        <StatItem
          icon="compass-outline"
          value={data?.lonText ?? "-"}
          label={t("earthquake.longitude")}
        />
      </View>

      <View style={styles.separator} />

      <View style={styles.infoContent}>
        <DetailItem
          icon="location"
          label={t("earthquake.location")}
          value={data?.wilayah ?? "-"}
        />

        <DetailItem
          icon="time-outline"
          label={t("earthquake.eventTime")}
          value={data ? `${data.tanggal}, ${data.jam}` : "-"}
        />

        <DetailItem
          icon="walk-outline"
          label={t("earthquake.distance")}
          value={
            data
              ? t("earthquake.distanceFromYourLocation", {
                  distance: data.distanceKm,
                })
              : "-"
          }
        />

        {!!data?.felt && (
          <DetailItem
            icon="alert-circle-outline"
            label={t("earthquake.feltArea")}
            value={data.felt}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};
