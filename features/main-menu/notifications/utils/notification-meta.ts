import type { QuakeNotification } from "@/hooks/use-quake-notifications";
import { styles } from "../styles/notifications-screen.styles";

type NotificationMeta = {
  title: string | null;
  badgeLabel: string;
  badgeStyle: object;
  iconName:
    | "alert-circle-outline"
    | "radio-outline"
    | "warning-outline";
  iconColor: string;
  iconContainerStyle: object;
};

export function getNotificationMeta(
  type: QuakeNotification["type"] | string | null | undefined,
): NotificationMeta {
  switch (type) {
    case "Dirasakan":
      return {
        title: "Gempa Dirasakan",
        badgeLabel: "Dirasakan",
        badgeStyle: styles.badgeRed,
        iconName: "alert-circle-outline",
        iconColor: "#EF4444",
        iconContainerStyle: styles.iconRed,
      };
    case "Terdeteksi":
      return {
        title: "Gempa Terdeteksi",
        badgeLabel: "Tidak dirasakan",
        badgeStyle: styles.badgeGreen,
        iconName: "radio-outline",
        iconColor: "#22C55E",
        iconContainerStyle: styles.iconGreen,
      };
    case "Tsunami":
      return {
        title: null,
        badgeLabel: "Tsunami",
        badgeStyle: styles.badgeAmber,
        iconName: "warning-outline",
        iconColor: "#D97706",
        iconContainerStyle: styles.iconAmber,
      };
    default:
      return {
        title: "Notifikasi",
        badgeLabel: "Info",
        badgeStyle: styles.badgeNeutral,
        iconName: "alert-circle-outline",
        iconColor: "#64748B",
        iconContainerStyle: styles.iconNeutral,
      };
  }
}