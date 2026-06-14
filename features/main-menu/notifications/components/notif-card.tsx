import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { getNotificationMeta } from "@/features/main-menu/notifications/utils/notification-meta";
import {
  getNotificationDisplayTitle,
  getNotificationSubtitle,
  getNotificationTimeLabel,
} from "@/features/main-menu/notifications/utils/notification-formatters";
import { styles } from "../styles/notifications-screen.styles";
import type { NotifCardProps } from "../types";

export function NotifCard({ item, onPress }: NotifCardProps) {
  const { t } = useTranslation();
  const meta = getNotificationMeta(item.type, {
    feltTitle: t("notificationsScreen.cardTitleDirasakan"),
    detectedTitle: t("notificationsScreen.cardTitleTerdeteksi"),
    fallbackTitle: t("notificationsScreen.fallbackTitle"),
    feltBadge: t("notificationsScreen.badgeDirasakan"),
    notFeltBadge: t("notificationsScreen.badgeTidakDirasakan"),
    tsunamiBadge: t("notificationsScreen.badgeTsunami"),
    infoBadge: t("notificationsScreen.badgeInfo"),
  });
  const formatterLabels = {
    defaultTsunamiTitle: t("notificationsScreen.defaultTsunamiTitle"),
    unavailableEarthquakeInfo: t(
      "notificationsScreen.unavailableEarthquakeInfo",
    ),
    unavailableTsunamiInfo: t("notificationsScreen.unavailableTsunamiInfo"),
    unavailableLocation: t("notificationsScreen.unavailableLocation"),
  };
  const displayTitle =
    item.type === "Tsunami"
      ? getNotificationDisplayTitle(item, formatterLabels)
      : (meta.title ?? t("notificationsScreen.fallbackTitle"));
  const timeLabel = getNotificationTimeLabel(item);

  return (
    <TouchableOpacity
      style={styles.notifCard}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.notifContent}>
        <View style={[styles.iconContainer, meta.iconContainerStyle]}>
          <Ionicons name={meta.iconName} size={20} color={meta.iconColor} />
        </View>
        <View style={styles.textWrapper}>
          <Text style={styles.notifTitle}>{displayTitle}</Text>
          <Text style={styles.notifSubTitle}>
            {getNotificationSubtitle(item, formatterLabels)}
          </Text>
          {timeLabel ? (
            <Text style={styles.notifTime}>{timeLabel}</Text>
          ) : null}
        </View>
        <View style={[styles.badge, meta.badgeStyle]}>
          <Text style={styles.badgeText}>{meta.badgeLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
