import { XMLParser } from "fast-xml-parser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { get, getDatabase, ref } from "@react-native-firebase/database";
import { useEffect, useState } from "react";
import {
  isUserInsideShakeRadius,
  parseCoordinate,
  parseDepthKm,
} from "@/utils/earthquake-impact";
import {
  EMPTY_WARNING,
  fetchTsunamiGroups,
} from "@/features/main-menu/earthquake/utils/tsunami-content-utils";
import {
  getLatestTerdeteksiGempa,
  parseTerdeteksiPayload,
} from "@/features/main-menu/home/utils/parse-terdeteksi";
import { notificationEmitter } from "@/services/fcm-event-emitter";

export type QuakeNotifType = "Dirasakan" | "Terdeteksi" | "Tsunami";
export type QuakeNotification = {
  id: string;
  type: QuakeNotifType;
  magnitude: string;
  location: string;
  date: string;
  time: string;
  level: "Rendah" | "Sedang" | "Kuat";
  timestamp: number;
  isRead: boolean;
  title?: string;
  headline?: string;
  message?: string;
};

type NotificationState = {
  notifications: QuakeNotification[];
  unreadCount: number;
  error: string | null;
};

type PersistedLatestSeen = {
  dirasakan: string;
  terdeteksi: string;
  tsunami: string;
};

type PushNotificationOptions = {
  silent?: boolean;
};

const DIRASAKAN_API_URL = process.env.EXPO_PUBLIC_GEMPA_DIRASAKAN_API_URL;
const TERDETEKSI_API_URL_FAST =
  process.env.EXPO_PUBLIC_GEMPA_TERDETEKSI_API_URL_FAST;
const TSUNAMI_API_URL = process.env.EXPO_PUBLIC_PERINGATAN_TSUNAMI_API_URL;
const FIREBASE_DATABASE_URL =
  process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL?.trim() || "";
const POLL_INTERVAL_MS = 15_000;
const MAX_NOTIFICATIONS = 100;

const STORAGE_KEY_NOTIFICATIONS = "quake_notifications_v1";
const STORAGE_KEY_LATEST_SEEN = "quake_latest_seen_v1";
const STORAGE_KEY_DIRASAKAN_PREFIX = "quake_notification_delivered:dirasakan:";

let state: NotificationState = {
  notifications: [],
  unreadCount: 0,
  error: null,
};

let pollTimer: ReturnType<typeof setInterval> | null = null;
let dailyResetTimer: ReturnType<typeof setTimeout> | null = null;
let storageInitialized = false;
let storageInitPromise: Promise<void> | null = null;

const listeners = new Set<() => void>();
let currentDayKey = getLocalDayKey();
let latestEmittedTsunamiNotificationId = "";
let tsunamiPollingStartedAt = 0;
let hasTsunamiBaselineSnapshot = false;

const latestSeen: PersistedLatestSeen = {
  dirasakan: "",
  terdeteksi: "",
  tsunami: "",
};

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function setState(next: Partial<NotificationState>) {
  state = { ...state, ...next };
  notifyListeners();
}


function getLocalDayKey() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function recomputeUnreadCount(notifications: QuakeNotification[]) {
  return notifications.reduce((total, item) => total + (item.isRead ? 0 : 1), 0);
}

function getTsunamiEventId(notificationId: string) {
  return notificationId.replace(/^tsunami:/, "");
}

function getLatestTsunamiNotification(notifications: QuakeNotification[]) {
  return notifications
    .filter((item) => item.type === "Tsunami")
    .sort((a, b) => b.timestamp - a.timestamp)[0];
}

function resetTsunamiPollingBaseline() {
  tsunamiPollingStartedAt = Date.now();
  hasTsunamiBaselineSnapshot = false;
}

function shouldSilenceTsunamiBaseline(timestamp: number) {
  if (hasTsunamiBaselineSnapshot) return false;

  hasTsunamiBaselineSnapshot = true;
  return tsunamiPollingStartedAt > 0 && timestamp <= tsunamiPollingStartedAt;
}

function getLevel(magnitude: number): "Rendah" | "Sedang" | "Kuat" {
  if (magnitude >= 5) return "Kuat";
  if (magnitude >= 3) return "Sedang";
  return "Rendah";
}

function withCacheBuster(url: string): string {
  const base = url.trim();
  if (!base) return "";
  if (base.endsWith("=") || base.endsWith("?") || base.endsWith("&")) {
    return `${base}${Date.now()}`;
  }
  return `${base}${base.includes("?") ? "&" : "?"}t=${Date.now()}`;
}

function parseTimestamp(date: string, time: string) {
  const cleanTime = (time ?? "").replace(/ WIB| WITA| WIT/gi, "").trim();
  const rawDate = (date ?? "").trim();
  if (!rawDate || !cleanTime) return Date.now();

  const slashDateMatch = rawDate.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (slashDateMatch) {
    const [, year, month, day] = slashDateMatch;
    const normalizedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const parsed = new Date(`${normalizedDate}T${cleanTime}+07:00`).getTime();
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }

  const monthMap: Record<string, string> = {
    Jan: "Jan", Feb: "Feb", Mar: "Mar", Apr: "Apr",
    Mei: "May", Jun: "Jun", Jul: "Jul", Agt: "Aug",
    Sep: "Sep", Okt: "Oct", Nov: "Nov", Des: "Dec",
  };

  let normalizedDate = rawDate;
  for (const [id, en] of Object.entries(monthMap)) {
    if (normalizedDate.includes(id)) {
      normalizedDate = normalizedDate.replace(id, en);
      break;
    }
  }

  const parsed = new Date(`${normalizedDate} ${cleanTime} GMT+0700`).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function getTsunamiTimestamp(timesentMs: number, date: string, time: string) {
  if (Number.isFinite(timesentMs)) return timesentMs;
  return parseTimestamp(date, time);
}

function parsePointCoordinates(pointCoordinates: unknown) {
  const [lonRaw, latRaw] = String(pointCoordinates ?? "").split(",");
  const longitude = parseCoordinate(lonRaw);
  const latitude = parseCoordinate(latRaw);

  if (latitude === null || longitude === null) return null;
  return { latitude, longitude };
}

async function loadPersistedData(): Promise<void> {
  try {
    const [rawNotifications, rawLatestSeen] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_NOTIFICATIONS),
      AsyncStorage.getItem(STORAGE_KEY_LATEST_SEEN),
    ]);
    let latestTsunamiInStorage: QuakeNotification | undefined;

    if (rawNotifications) {
      const saved: QuakeNotification[] = JSON.parse(rawNotifications);
      const today = getLocalDayKey();

      const todayNotifications = saved.filter((item) => {
        return item.date ? item.date.includes(today.split("-")[2]) : true;
      });

      if (todayNotifications.length > 0) {
        state = {
          ...state,
          notifications: todayNotifications,
          unreadCount: recomputeUnreadCount(todayNotifications),
        };

        latestTsunamiInStorage = getLatestTsunamiNotification(todayNotifications);
        if (latestTsunamiInStorage) {
          latestEmittedTsunamiNotificationId = latestTsunamiInStorage.id;
        }
      }
    }

    if (rawLatestSeen) {
      const saved: PersistedLatestSeen = JSON.parse(rawLatestSeen);
      latestSeen.dirasakan = saved.dirasakan ?? "";
      latestSeen.terdeteksi = saved.terdeteksi ?? "";
      latestSeen.tsunami = saved.tsunami ?? "";
    }

    if (!latestSeen.tsunami && latestTsunamiInStorage) {
      latestSeen.tsunami = getTsunamiEventId(latestTsunamiInStorage.id);
      await persistLatestSeen();
    }
  } catch {
  }
}

async function persistNotifications(notifications: QuakeNotification[]) {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY_NOTIFICATIONS,
      JSON.stringify(notifications),
    );
  } catch {
  }
}

async function persistLatestSeen() {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY_LATEST_SEEN,
      JSON.stringify(latestSeen),
    );
  } catch {
  }
}


function getDirasakanDeliveryKey(userId: string, eventId: string) {
  return `${STORAGE_KEY_DIRASAKAN_PREFIX}${userId}:${eventId}`;
}

async function hasLocalDelivery(userId: string, eventId: string) {
  const value = await AsyncStorage.getItem(
    getDirasakanDeliveryKey(userId, eventId),
  );
  return value === "true";
}

async function markLocalDelivery(userId: string, eventId: string) {
  await AsyncStorage.setItem(
    getDirasakanDeliveryKey(userId, eventId),
    "true",
  );
}

async function getCurrentUserLocation() {
  const app = getApp();
  const auth = getAuth(app);
  const user = auth.currentUser;
  if (!user) return null;

  const database = FIREBASE_DATABASE_URL
    ? getDatabase(app, FIREBASE_DATABASE_URL)
    : getDatabase(app);
  const snapshot = await get(ref(database, `users/${user.uid}`));
  const data = snapshot.val();
  const latitude = parseCoordinate(data?.latitude);
  const longitude = parseCoordinate(data?.longitude);

  if (latitude === null || longitude === null) return null;
  return { userId: user.uid, latitude, longitude };
}


function emitTsunamiNotification(notification: QuakeNotification) {
  if (notification.type !== "Tsunami") return;
  if (notification.id === latestEmittedTsunamiNotificationId) return;

  latestEmittedTsunamiNotificationId = notification.id;

  const title = notification.title || "Peringatan Tsunami";
  const message =
    notification.message || notification.headline || notification.location || "";
  const eventId = notification.id.replace(/^tsunami:/, "");

  notificationEmitter.emit({
    kind: "tsunami_alert",
    title,
    body: message || title,
    level: title,
    message,
    subject: notification.title,
    headline: notification.headline,
    description: notification.message,
    data: {
      type: "tsunami_alert",
      event_id: eventId,
      title,
      body: message || title,
      level: title,
      message,
      subject: notification.title,
      headline: notification.headline,
      description: notification.message,
      magnitude: notification.magnitude,
      location: notification.location,
      timestamp: `${notification.date} ${notification.time}`.trim(),
    },
  });
}

function pushNotification(
  notification: QuakeNotification,
  { silent = false }: PushNotificationOptions = {},
) {
  if (state.notifications.some((item) => item.id === notification.id)) return;

  const notifications = [notification, ...state.notifications]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_NOTIFICATIONS);

  setState({ notifications, unreadCount: recomputeUnreadCount(notifications) });
  if (silent && notification.type === "Tsunami") {
    latestEmittedTsunamiNotificationId = notification.id;
  } else if (!silent) {
    emitTsunamiNotification(notification);
  }

  void persistNotifications(notifications);
}

function clearAllNotifications() {
  setState({ notifications: [], unreadCount: 0, error: null });
  void AsyncStorage.removeItem(STORAGE_KEY_NOTIFICATIONS);
}

function scheduleDailyReset() {
  if (dailyResetTimer) clearTimeout(dailyResetTimer);
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
  const delay = Math.max(1, nextMidnight.getTime() - now.getTime());
  dailyResetTimer = setTimeout(() => {
    currentDayKey = getLocalDayKey();
    clearAllNotifications();

    latestSeen.dirasakan = "";
    latestSeen.terdeteksi = "";
    void persistLatestSeen();

    scheduleDailyReset();
  }, delay);
}

function resetIfDayChanged() {
  const dayKey = getLocalDayKey();
  if (dayKey === currentDayKey) return;
  currentDayKey = dayKey;
  clearAllNotifications();

  latestSeen.dirasakan = "";
  latestSeen.terdeteksi = "";
  void persistLatestSeen();
}

async function fetchDirasakanNotification() {
  if (!DIRASAKAN_API_URL) return;

  const response = await fetch(`${DIRASAKAN_API_URL.trim()}${Date.now()}`);
  const raw = await response.text();

  let latest: any = null;
  let globalIdentifier = "";

  try {
    const parsedJson = JSON.parse(raw);
    const infoRaw = parsedJson?.info;
    latest = Array.isArray(infoRaw) ? infoRaw[0] : infoRaw;
    globalIdentifier = String(parsedJson?.identifier ?? "");
  } catch {
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsedXml = parser.parse(raw);
    const infoRaw = parsedXml?.alert?.info;
    latest = Array.isArray(infoRaw) ? infoRaw[0] : infoRaw;
    globalIdentifier = String(parsedXml?.alert?.identifier ?? "");
  }

  if (!latest) return;

  const eventId = String(
    latest.eventid ?? latest.identifier ?? globalIdentifier ??
    `${latest.date}-${latest.time}-${latest.magnitude}-${latest.area}`,
  );

  if (!eventId || eventId === latestSeen.dirasakan) return;

  const magnitude = Number.parseFloat(String(latest.magnitude ?? "0")) || 0;
  const date = String(latest.date ?? "");
  const time = String(latest.time ?? "");

  pushNotification({
    id: `dirasakan:${eventId}`,
    type: "Dirasakan",
    magnitude: magnitude.toFixed(1),
    location: String(latest.area ?? "Lokasi tidak tersedia"),
    date,
    time,
    level: getLevel(magnitude),
    timestamp: parseTimestamp(date, time),
    isRead: false,
  });

  const depthKm = parseDepthKm(latest.depth) ?? 0;
  const coordinates =
    parsePointCoordinates(latest?.point?.coordinates) ??
    (() => {
      const latitude = parseCoordinate(latest?.latitude);
      const longitude = parseCoordinate(latest?.longitude);
      return latitude === null || longitude === null
        ? null
        : { latitude, longitude };
    })();

  if (!coordinates || magnitude <= 0) {
    latestSeen.dirasakan = eventId;
    void persistLatestSeen();
    return;
  }

  const userLocation = await getCurrentUserLocation();
  if (!userLocation) return;

  if (await hasLocalDelivery(userLocation.userId, eventId)) {
    latestSeen.dirasakan = eventId;
    void persistLatestSeen();
    return;
  }

  const impact = isUserInsideShakeRadius({
    quakeLat: coordinates.latitude,
    quakeLon: coordinates.longitude,
    userLat: userLocation.latitude,
    userLon: userLocation.longitude,
    magnitude,
    depthKm,
  });

  if (!impact.inside) {
    latestSeen.dirasakan = eventId;
    void persistLatestSeen();
    return;
  }

  await markLocalDelivery(userLocation.userId, eventId);
  latestSeen.dirasakan = eventId;
  void persistLatestSeen();
}

async function fetchTerdeteksiNotification() {
  if (!TERDETEKSI_API_URL_FAST) return;

  const response = await fetch(withCacheBuster(TERDETEKSI_API_URL_FAST));
  const raw = await response.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsedXml = parser.parse(raw);
  const latest = getLatestTerdeteksiGempa(parsedXml);
  const parsed = parseTerdeteksiPayload(latest);

  if (!parsed) return;

  const eventId = parsed.eventId.trim();

  if (!eventId || eventId === latestSeen.terdeteksi) return;

  const alreadyExists = state.notifications.some(
    (item) => item.id === `terdeteksi:${eventId}`,
  );

  latestSeen.terdeteksi = eventId;
  void persistLatestSeen();

  if (alreadyExists) return;

  const magnitude = Number.parseFloat(parsed.magnitude) || 0;
  const date = parsed.tanggal;
  const time = parsed.jam;

  pushNotification({
    id: `terdeteksi:${eventId}`,
    type: "Terdeteksi",
    magnitude: parsed.magnitude,
    location: parsed.wilayah || "Lokasi tidak tersedia",
    date,
    time,
    level: getLevel(magnitude),
    timestamp: parseTimestamp(date, time),
    isRead: false,
  });
}

async function fetchTsunamiNotification() {
  if (!TSUNAMI_API_URL) return;

  const abortController = new AbortController();
  const groups = await fetchTsunamiGroups(
    TSUNAMI_API_URL.trim(),
    abortController.signal,
  );
  const latestGroup = groups[0];
  if (!latestGroup) return;

  const latestWarning =
    latestGroup.warnings[latestGroup.latestWarningIndex] ?? EMPTY_WARNING;
  const warningId = latestWarning.id === EMPTY_WARNING.id ? "" : latestWarning.id;
  const eventId = String(
    warningId || latestGroup.id || `${latestGroup.tanggal}-${latestGroup.jam}`,
  );

  if (!eventId) return;

  const notificationId = `tsunami:${eventId}`;

  if (eventId === latestSeen.tsunami) {
    hasTsunamiBaselineSnapshot = true;
    return;
  }

  // Cek apakah notifikasi ini sudah ada (dari persistent storage)
  const existingNotification = state.notifications.find(
    (item) => item.id === notificationId,
  );

  latestSeen.tsunami = eventId;
  void persistLatestSeen();

  if (existingNotification) {
    latestEmittedTsunamiNotificationId = existingNotification.id;
    hasTsunamiBaselineSnapshot = true;
    return;
  }

  const date = String(latestGroup.tanggal ?? "");
  const time = String(latestGroup.jam ?? "");
  const headline = String(latestWarning.headline ?? "").trim();
  const description = String(latestWarning.description ?? "").trim();
  const subject = String(latestWarning.subject ?? "").trim();
  const location = String(latestGroup.wilayah ?? "").trim();
  const magnitude = String(latestGroup.magnitude ?? "").trim();
  const magnitudeValue = Number.parseFloat(magnitude) || 0;
  const timestamp = getTsunamiTimestamp(latestWarning.timesentMs, date, time);
  const shouldSilentBaseline = shouldSilenceTsunamiBaseline(timestamp);

  pushNotification(
    {
      id: notificationId,
      type: "Tsunami",
      magnitude,
      location: location || "Lokasi tidak tersedia",
      date,
      time,
      level: getLevel(magnitudeValue),
      timestamp,
      isRead: false,
      title: subject || "Peringatan Tsunami",
      headline,
      message: description || headline || location,
    },
    { silent: shouldSilentBaseline },
  );
}

async function pollLatestQuakes() {
  resetIfDayChanged();

  const results = await Promise.allSettled([
    fetchDirasakanNotification(),
    fetchTerdeteksiNotification(),
    fetchTsunamiNotification(),
  ]);

  const anyFailed = results.some((r) => r.status === "rejected");

  if (anyFailed && state.notifications.length === 0) {
    setState({ error: "Gagal memuat notifikasi. Periksa koneksi Anda." });
  } else if (!anyFailed && state.error) {
    setState({ error: null });
  }
}

async function initAndStartPolling() {
  if (!storageInitialized) {
    storageInitPromise = loadPersistedData();
    await storageInitPromise;
    storageInitialized = true;
    notifyListeners(); 
  }

  void pollLatestQuakes();
  pollTimer = setInterval(() => void pollLatestQuakes(), POLL_INTERVAL_MS);
}

function startPolling() {
  if (pollTimer) return;
  scheduleDailyReset();
  resetTsunamiPollingBaseline();
  void initAndStartPolling();
}

function stopPollingIfUnused() {
  if (listeners.size > 0 || !pollTimer) return;

  clearInterval(pollTimer);
  pollTimer = null;

  if (dailyResetTimer) {
    clearTimeout(dailyResetTimer);
    dailyResetTimer = null;
  }

  storageInitialized = false;
  storageInitPromise = null;
  tsunamiPollingStartedAt = 0;
  hasTsunamiBaselineSnapshot = false;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  startPolling();
  return () => {
    listeners.delete(listener);
    stopPollingIfUnused();
  };
}

export function markAllNotificationsAsRead() {
  if (state.unreadCount === 0) return;

  const notifications = state.notifications.map((item) => ({
    ...item,
    isRead: true,
  }));

  setState({ notifications, unreadCount: 0 });
  void persistNotifications(notifications);
}

export function useQuakeNotifications() {
  const [snapshot, setSnapshot] = useState<NotificationState>(state);

  useEffect(() => {
    setSnapshot(state);
    return subscribe(() => setSnapshot(state));
  }, []);

  return {
    notifications: snapshot.notifications,
    unreadCount: snapshot.unreadCount,
    error: snapshot.error,
    markAllAsRead: markAllNotificationsAsRead,
  };
}
