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

export type NotificationMetaLabels = {
  feltTitle: string;
  detectedTitle: string;
  fallbackTitle: string;
  feltBadge: string;
  notFeltBadge: string;
  tsunamiBadge: string;
  infoBadge: string;
};

export function getNotificationMeta(
  type: QuakeNotification["type"] | string | null | undefined,
  labels: NotificationMetaLabels,
): NotificationMeta {
  switch (type) {
    case "Dirasakan":
      return {
        title: labels.feltTitle,
        badgeLabel: labels.feltBadge,
        badgeStyle: styles.badgeRed,
        iconName: "alert-circle-outline",
        iconColor: "#EF4444",
        iconContainerStyle: styles.iconRed,
      };
    case "Terdeteksi":
      return {
        title: labels.detectedTitle,
        badgeLabel: labels.notFeltBadge,
        badgeStyle: styles.badgeGreen,
        iconName: "radio-outline",
        iconColor: "#22C55E",
        iconContainerStyle: styles.iconGreen,
      };
    case "Tsunami":
      return {
        title: null,
        badgeLabel: labels.tsunamiBadge,
        badgeStyle: styles.badgeAmber,
        iconName: "warning-outline",
        iconColor: "#D97706",
        iconContainerStyle: styles.iconAmber,
      };
    default:
      return {
        title: labels.fallbackTitle,
        badgeLabel: labels.infoBadge,
        badgeStyle: styles.badgeNeutral,
        iconName: "alert-circle-outline",
        iconColor: "#64748B",
        iconContainerStyle: styles.iconNeutral,
      };
  }
}
