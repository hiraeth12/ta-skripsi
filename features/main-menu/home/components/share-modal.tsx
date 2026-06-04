import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import {
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { styles } from "../styles/homeStyles";

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
};

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

export const ShareModal = ({
  visible,
  onClose,
  data,
  type = "dirasakan",
}: {
  visible: boolean;
  onClose: () => void;
  data: DirasakanQuake | TerdeteksiQuake | null;
  type?: "dirasakan" | "terdeteksi";
}) => {
  const { t } = useTranslation();

  const generateShareText = () => {
    if (!data) return "";

    const earthquakeType =
      type === "dirasakan"
        ? t("share.feltEarthquake")
        : t("share.detectedEarthquake");

    const baseText =
      `📍 *${t("share.earthquakeInfo", { type: earthquakeType })}*\n\n` +
      `🌍 ${t("share.location")}: ${data.wilayah}\n` +
      `📊 ${t("earthquake.magnitude")}: ${data.magnitude}\n` +
      `📏 ${t("earthquake.depth")}: ${data.kedalaman}\n` +
      `📍 ${t("share.coordinate")}: ${t("earthquake.latitude")} ${data.latText}, ${t("earthquake.longitude")} ${data.lonText}\n` +
      `🕐 ${t("earthquake.eventTime")}: ${data.tanggal}, ${data.jam}\n` +
      `📐 ${t("earthquake.distance")}: ${t("share.distanceFromMyLocation", {
        distance: data.distanceKm,
      })}`;

    if (type === "dirasakan" && (data as DirasakanQuake).felt) {
      return (
        baseText +
        `\n🏘️ ${t("earthquake.feltArea")}: ${(data as DirasakanQuake).felt}`
      );
    }

    if (type === "terdeteksi" && (data as TerdeteksiQuake).fase) {
      return (
        baseText +
        `\n🔊 ${t("earthquake.phase")}: ${(data as TerdeteksiQuake).fase}`
      );
    }

    return baseText;
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: generateShareText(),
        title: t("share.title"),
      });
    } catch {}

    onClose();
  };

  const shareOptions = [
    {
      id: "share",
      icon: "share-variant",
      label: t("share.viaApp"),
      color: "#0891B2",
      onPress: handleShare,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlayBottom} onPress={onClose}>
        <View style={styles.modalCardBottom}>
          <View style={styles.handleBar} />

          <View style={styles.modalHeaderBottom}>
            <Text style={styles.modalTitleBottom}>{t("share.title")}</Text>
          </View>

          <ScrollView
            style={{ maxHeight: 300 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ paddingHorizontal: 20, paddingVertical: 15 }}>
              <Text style={styles.modalSubtitle}>{t("share.subtitle")}</Text>

              <View style={{ marginTop: 20, gap: 12 }}>
                {shareOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      backgroundColor: "#f8f9fa",
                      borderRadius: 12,
                      borderLeftWidth: 4,
                      borderLeftColor: option.color,
                    }}
                    onPress={option.onPress}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name={option.icon as any}
                      size={24}
                      color={option.color}
                      style={{ marginRight: 12 }}
                    />

                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#0C4A6E",
                        flex: 1,
                      }}
                    >
                      {option.label}
                    </Text>

                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={24}
                      color="#999"
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <View
                style={{
                  marginTop: 20,
                  padding: 12,
                  backgroundColor: "#f0f7ff",
                  borderRadius: 10,
                  borderLeftWidth: 3,
                  borderLeftColor: "#1E6F9F",
                }}
              >
                <Text
                  style={{ fontSize: 12, color: "#0C4A6E", lineHeight: 18 }}
                >
                  <Text style={{ fontWeight: "bold" }}>
                    {t("share.preview")}:
                  </Text>{" "}
                  {"\n"}
                  {generateShareText()}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={{
                backgroundColor: "#e0e0e0",
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: "center",
              }}
              onPress={onClose}
            >
              <Text style={{ color: "#333", fontWeight: "600", fontSize: 16 }}>
                {t("common.close")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};
