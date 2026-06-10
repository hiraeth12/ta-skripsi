import EarthquakeMap from "@/components/ui/earthquake-map";
import type { MapViewType } from "@/constants/map";
import Feather from "@expo/vector-icons/Feather";
import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../styles/homeStyles";
import { DetailItem } from "./detail-item";
import { StatItem } from "./stat-item";

export type TsunamiQuake = {
  magnitude: string;
  kedalaman: string;
  latText: string;
  lonText: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  subject: string;
  headline: string;
  shakemap?: string;
  latitude?: number;
  longitude?: number;
};

const safeValue = (value?: string | null) => {
  const text = String(value ?? "").trim();
  return text || "-";
};

export const TsunamiCard = ({
  data,
  onShakeMap,
  hasShakeMap,
  onNarasi,
  hasNarasi,
  onCardPress,
  onShare,
}: {
  data: TsunamiQuake | null;
  onShakeMap: () => void;
  hasShakeMap: boolean;
  /** Callback untuk membuka modal narasi resmi BMKG */
  onNarasi: () => void;
  /** true = narasi tersedia dan button ditampilkan */
  hasNarasi: boolean;
  onCardPress: () => void;
  onShare: () => void;
}) => {
  const mapRef = useRef<MapViewType | null>(null);
  const { t } = useTranslation();
  const hasCoordinate =
    typeof data?.latitude === "number" && typeof data?.longitude === "number";

  return (
    <TouchableOpacity
      style={styles.mapCard}
      activeOpacity={0.95}
      onPress={onCardPress}
    >
      <View style={styles.mapImageContainer}>
        {hasCoordinate ? (
          <View style={styles.mapImage} pointerEvents="none">
            <EarthquakeMap
              mapRef={mapRef}
              initialRegion={{
                latitude: data.latitude!,
                longitude: data.longitude!,
                latitudeDelta: 3.5,
                longitudeDelta: 3.5,
              }}
              markerCoordinate={{
                latitude: data.latitude!,
                longitude: data.longitude!,
                magnitude: safeValue(data.magnitude),
                depth: safeValue(data.kedalaman),
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
          {/* Button NARASI RESMI: hanya tampil jika hasNarasi = true */}
          {hasNarasi && (
            <TouchableOpacity
              style={styles.mapButton}
              onPress={(e) => {
                e.stopPropagation();
                onNarasi();
              }}
            >
              <Feather name="file-text" size={12} color="white" />
              <Text style={styles.mapButtonText}>{t("earthquake.officialNarrative")}</Text>
            </TouchableOpacity>
          )}

          {/* Button PETA GUNCANGAN: hanya tampil jika hasShakeMap = true */}
          {hasShakeMap && (
            <TouchableOpacity
              style={styles.mapButton}
              onPress={(e) => {
                e.stopPropagation();
                onShakeMap();
              }}
            >
              <Feather name="map" size={12} color="white" />
              <Text style={styles.mapButtonText}>{t("earthquake.shakeMap")}</Text>
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
            <Text style={styles.mapButtonText}>{t("common.share")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsTopRow}>
        <StatItem
          icon="triangle-wave"
          value={safeValue(data?.magnitude)}
          label={t("earthquake.magnitude")}
        />
        <View style={styles.statTopDivider} />
        <StatItem
          icon="rss"
          value={safeValue(data?.kedalaman)}
          label={t("earthquake.depth")}
        />
        <View style={styles.statTopDivider} />
        <StatItem
          icon="compass-outline"
          value={safeValue(data?.latText)}
          label={t("earthquake.latitude")}
        />
        <View style={styles.statTopDivider} />
        <StatItem
          icon="compass-outline"
          value={safeValue(data?.lonText)}
          label={t("earthquake.longitude")}
        />
      </View>

      <View style={styles.separator} />

      <View style={styles.infoContent}>
        <DetailItem
          icon="location"
          label={t("gempaDirasakanScreen.labelLocation")}
          value={safeValue(data?.wilayah)}
        />
        <DetailItem
          icon="alert-circle-outline"
          label="Subject :"
          value={safeValue(data?.subject)}
        />
        <DetailItem
          icon="time-outline"
          label={t("gempaDirasakanScreen.labelTime")}
          value={
            data ? `${safeValue(data.tanggal)}, ${safeValue(data.jam)}` : "-"
          }
        />
        <DetailItem
          icon="megaphone-outline"
          label="Informasi Tsunami :"
          value={safeValue(data?.headline)}
        />
      </View>
    </TouchableOpacity>
  );
};