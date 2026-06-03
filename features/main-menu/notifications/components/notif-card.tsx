import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { getNotificationMeta } from "@/features/main-menu/notifications/utils/notification-meta";
import {
  getNotificationDisplayTitle,
  getNotificationSubtitle,
  getNotificationTimeLabel,
} from "@/features/main-menu/notifications/utils/notification-formatters";
import { styles } from "../styles/notifications-screen.styles";
import type { NotifCardProps } from "../types";

export function NotifCard({ item, onPress }: NotifCardProps) {
  const meta = getNotificationMeta(item.type);
  const displayTitle =
    item.type === "Tsunami"
      ? getNotificationDisplayTitle(item)
      : (meta.title ?? "Notifikasi");
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
            {getNotificationSubtitle(item)}
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