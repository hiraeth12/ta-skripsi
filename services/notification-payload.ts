export type NotificationKind = "gempa_dirasakan" | "tsunami_alert";

export type NotificationDataPayload = Record<string, unknown>;

type NotificationPayloadInput = {
  kind?: unknown;
  type?: unknown;
  title?: unknown;
  body?: unknown;
  data?: NotificationDataPayload | null;
  subject?: unknown;
  headline?: unknown;
  description?: unknown;
  level?: unknown;
  message?: unknown;
  location?: unknown;
};

export type NormalizedGempaNotification = {
  kind: "gempa_dirasakan";
  title: string;
  body: string;
  data?: NotificationDataPayload;
};

export type NormalizedTsunamiNotification = {
  kind: "tsunami_alert";
  title: string;
  body: string;
  level: string;
  message: string;
  subject?: string;
  headline?: string;
  description?: string;
  data?: NotificationDataPayload;
};

export type NormalizedNotificationPayload =
  | NormalizedGempaNotification
  | NormalizedTsunamiNotification;

function text(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (value === null || value === undefined) return undefined;

  const trimmed = String(value).trim();
  return trimmed || undefined;
}

function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    const parsed = text(value);
    if (parsed) return parsed;
  }
  return undefined;
}

function isTsunamiType(value: unknown): boolean {
  const normalized = text(value)?.toLowerCase();
  return normalized === "tsunami_alert" || normalized === "tsunami";
}

export function normalizeNotificationPayload(
  input: NotificationPayloadInput,
): NormalizedNotificationPayload {
  const data = input.data ?? undefined;
  const type = firstText(input.kind, input.type, data?.kind, data?.type);

  if (isTsunamiType(type)) {
    const subject = firstText(input.subject, data?.subject);
    const headline = firstText(input.headline, data?.headline);
    const description = firstText(input.description, data?.description);
    const title =
      firstText(input.title, data?.title, subject, "Peringatan Tsunami") ??
      "Peringatan Tsunami";
    const message =
      firstText(
        input.message,
        data?.message,
        input.body,
        data?.body,
        description,
        headline,
        input.location,
        data?.location,
      ) ?? "";
    const level =
      firstText(input.level, data?.level, subject, headline, title) ?? "-";

    return {
      kind: "tsunami_alert",
      title,
      body: message || title,
      level,
      message,
      subject,
      headline,
      description,
      data,
    };
  }

  return {
    kind: "gempa_dirasakan",
    title:
      firstText(input.title, data?.title, "Notifikasi Gempa") ??
      "Notifikasi Gempa",
    body:
      firstText(input.body, data?.body, "Ada gempa baru terdeteksi") ??
      "Ada gempa baru terdeteksi",
    data,
  };
}
