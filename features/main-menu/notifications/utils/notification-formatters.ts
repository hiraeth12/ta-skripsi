import type { QuakeNotification } from "@/hooks/use-quake-notifications";

export function getFirstAvailableText(
  ...values: Array<string | null | undefined>
) {
  return values.map((value) => value?.trim()).find(Boolean) ?? "";
}

export function getNotificationSubtitle(item: QuakeNotification) {
  if (item.type === "Tsunami") {
    return (
      getFirstAvailableText(item.headline, item.title, item.location) ||
      "Informasi tsunami tidak tersedia"
    );
  }

  const magnitude = getFirstAvailableText(item.magnitude);
  const location = getFirstAvailableText(item.location);

  if (magnitude && location) return `M ${magnitude} - ${location}`;
  if (magnitude) return `M ${magnitude}`;
  if (location) return location;
  return "Informasi gempa tidak tersedia";
}

export function getNotificationTimeLabel(item: QuakeNotification) {
  const date = getFirstAvailableText(item.date);
  const time = getFirstAvailableText(item.time);
  return date && time ? `${date} \u2022 ${time}` : "";
}

export function getNotificationDisplayTitle(item: QuakeNotification): string {
  if (item.type === "Tsunami") {
    return getFirstAvailableText(item.title, "Peringatan Tsunami");
  }
  return "";
}