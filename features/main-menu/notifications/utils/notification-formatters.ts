import type { QuakeNotification } from "@/hooks/use-quake-notifications";

export function getFirstAvailableText(
  ...values: Array<string | null | undefined>
) {
  return values.map((value) => value?.trim()).find(Boolean) ?? "";
}

export type NotificationFormatterLabels = {
  defaultTsunamiTitle: string;
  unavailableEarthquakeInfo: string;
  unavailableTsunamiInfo: string;
  unavailableLocation: string;
};

function normalizeUnavailableLocation(
  value: string,
  labels: NotificationFormatterLabels,
) {
  return /^(Lokasi tidak tersedia|Location unavailable)$/i.test(value)
    ? labels.unavailableLocation
    : value;
}

function normalizeTsunamiTitle(
  value: string,
  labels: NotificationFormatterLabels,
) {
  return value === "Peringatan Tsunami" || value === "Tsunami Warning"
    ? labels.defaultTsunamiTitle
    : value;
}

export function getNotificationSubtitle(
  item: QuakeNotification,
  labels: NotificationFormatterLabels,
) {
  if (item.type === "Tsunami") {
    const text = getFirstAvailableText(
      item.headline,
      normalizeTsunamiTitle(getFirstAvailableText(item.title), labels),
      normalizeUnavailableLocation(getFirstAvailableText(item.location), labels),
    );
    return text || labels.unavailableTsunamiInfo;
  }

  const magnitude = getFirstAvailableText(item.magnitude);
  const location = normalizeUnavailableLocation(
    getFirstAvailableText(item.location),
    labels,
  );

  if (magnitude && location) return `M ${magnitude} - ${location}`;
  if (magnitude) return `M ${magnitude}`;
  if (location) return location;
  return labels.unavailableEarthquakeInfo;
}

export function getNotificationTimeLabel(item: QuakeNotification) {
  const date = getFirstAvailableText(item.date);
  const time = getFirstAvailableText(item.time);
  return date && time ? `${date} \u2022 ${time}` : "";
}

export function getNotificationDisplayTitle(
  item: QuakeNotification,
  labels: NotificationFormatterLabels,
): string {
  if (item.type === "Tsunami") {
    const title = getFirstAvailableText(item.title);
    return normalizeTsunamiTitle(title, labels) || labels.defaultTsunamiTitle;
  }
  return "";
}
