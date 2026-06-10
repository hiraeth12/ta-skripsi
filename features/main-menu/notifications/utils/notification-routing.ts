import type { QuakeNotification } from "@/hooks/use-quake-notifications";
import type { KnownNotifType } from "@/features/main-menu/notifications/types";

export function isKnownNotifType(
  type: QuakeNotification["type"] | string,
): type is KnownNotifType {
  return type === "Dirasakan" || type === "Terdeteksi" || type === "Tsunami";
}

export function getEarthquakeTab(type: KnownNotifType): string {
  if (type === "Dirasakan") return "GEMPA DIRASAKAN";
  if (type === "Tsunami") return "TSUNAMI";
  return "GEMPA TERDETEKSI";
}

export function getHistoryTab(type: KnownNotifType): string {
  if (type === "Dirasakan") return "dirasakan";
  if (type === "Tsunami") return "tsunami";
  return "terdeteksi";
}

function isNewerNotification(
  a: QuakeNotification,
  b: QuakeNotification,
): boolean {
  if (a.timestamp !== b.timestamp) return a.timestamp > b.timestamp;
  return a.id.localeCompare(b.id) > 0;
}

export function getLatestNotificationForType(
  notifications: QuakeNotification[],
  type: QuakeNotification["type"],
): QuakeNotification | null {
  return notifications
    .filter((item) => item.type === type)
    .reduce<QuakeNotification | null>(
      (latest, item) =>
        !latest || isNewerNotification(item, latest) ? item : latest,
      null,
    );
}