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

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuakeNotifType = "Dirasakan" | "Terdeteksi";

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
};

type NotificationState = {
  notifications: QuakeNotification[];
  unreadCount: number;
  error: string | null; // FIX #3: expose fetch errors to UI
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DIRASAKAN_API_URL = process.env.EXPO_PUBLIC_GEMPA_DIRASAKAN_API_URL;
const TERDETEKSI_API_URL = process.env.EXPO_PUBLIC_GEMPA_TERDETEKSI_API_URL;
const FIREBASE_DATABASE_URL =
  process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL?.trim() || "";
const POLL_INTERVAL_MS = 15_000;
const MAX_NOTIFICATIONS = 100; // FIX #6: named constant instead of magic number

// ─── Module-level shared state ────────────────────────────────────────────────

let state: NotificationState = {
  notifications: [],
  unreadCount: 0,
  error: null,
};

// FIX #2: use pollTimer as the single source of truth for "is polling active"
//         instead of a separate isStarted boolean that can desync on hot reload
let pollTimer: ReturnType<typeof setInterval> | null = null;
let dailyResetTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
let currentDayKey = getLocalDayKey();

const latestSeen = {
  dirasakan: "",
  terdeteksi: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function getLocalDayKey() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function setState(next: Partial<NotificationState>) {
  state = { ...state, ...next };
  notifyListeners();
}

function recomputeUnreadCount(notifications: QuakeNotification[]) {
  return notifications.reduce((total, item) => total + (item.isRead ? 0 : 1), 0);
}

function getLevel(magnitude: number): "Rendah" | "Sedang" | "Kuat" {
  if (magnitude >= 5) return "Kuat";
  if (magnitude >= 3) return "Sedang";
  return "Rendah";
}

function parseTimestamp(date: string, time: string) {
  const cleanTime = (time ?? "").replace(/ WIB| WITA| WIT/gi, "").trim();
  const rawDate = (date ?? "").trim();
  if (!rawDate || !cleanTime) return Date.now();

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

function parsePointCoordinates(pointCoordinates: unknown) {
  const [lonRaw, latRaw] = String(pointCoordinates ?? "").split(",");
  const longitude = parseCoordinate(lonRaw);
  const latitude = parseCoordinate(latRaw);

  if (latitude === null || longitude === null) return null;
  return { latitude, longitude };
}

function getLocalDeliveryKey(userId: string, eventId: string) {
  return `quake_notification_delivered:dirasakan:${userId}:${eventId}`;
}

async function hasLocalDelivery(userId: string, eventId: string) {
  const value = await AsyncStorage.getItem(getLocalDeliveryKey(userId, eventId));
  return value === "true";
}

async function markLocalDelivery(userId: string, eventId: string) {
  await AsyncStorage.setItem(getLocalDeliveryKey(userId, eventId), "true");
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

function pushNotification(notification: QuakeNotification) {
  if (state.notifications.some((item) => item.id === notification.id)) return;

  const notifications = [notification, ...state.notifications]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_NOTIFICATIONS);

  setState({ notifications, unreadCount: recomputeUnreadCount(notifications) });
}

// ─── Daily reset ──────────────────────────────────────────────────────────────

function clearAllNotifications() {
  setState({ notifications: [], unreadCount: 0, error: null });
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
    scheduleDailyReset();
  }, delay);
}

function resetIfDayChanged() {
  const dayKey = getLocalDayKey();
  if (dayKey === currentDayKey) return;
  currentDayKey = dayKey;
  clearAllNotifications();
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

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
    return;
  }

  const userLocation = await getCurrentUserLocation();
  if (!userLocation) return;

  if (await hasLocalDelivery(userLocation.userId, eventId)) {
    latestSeen.dirasakan = eventId;
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
    return;
  }

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
  await markLocalDelivery(userLocation.userId, eventId);
  latestSeen.dirasakan = eventId;
}

async function fetchTerdeteksiNotification() {
  if (!TERDETEKSI_API_URL) return;

  const response = await fetch(`${TERDETEKSI_API_URL.trim()}${Date.now()}`);
  const data = await response.json();

  const features = data?.features;
  if (!Array.isArray(features) || features.length === 0) return;

  const sorted = [...features].sort((a, b) => {
    const tA = String(a?.properties?.time ?? "");
    const tB = String(b?.properties?.time ?? "");
    return tB.localeCompare(tA);
  });

  const latest = sorted[0];
  if (!latest) return;

  const props = latest?.properties ?? {};
  const eventId = String(
    props.ids ?? props.id ??
    `${props.time}-${props.mag}-${props.place}-${latest?.geometry?.coordinates?.[0]}`,
  );

  if (!eventId || eventId === latestSeen.terdeteksi) return;
  latestSeen.terdeteksi = eventId;

  const magnitude = Number.parseFloat(String(props.mag ?? "0")) || 0;
  const [date = "", timeRaw = ""] = String(props.time ?? "").split(" ");
  const time = timeRaw.split(".")[0] ?? "";

  pushNotification({
    id: `terdeteksi:${eventId}`,
    type: "Terdeteksi",
    magnitude: magnitude.toFixed(1),
    location: String(props.place ?? "Lokasi tidak tersedia"),
    date,
    time,
    level: getLevel(magnitude),
    timestamp: parseTimestamp(date, time),
    isRead: false,
  });
}

// ─── Poll ─────────────────────────────────────────────────────────────────────

async function pollLatestQuakes() {
  resetIfDayChanged();

  // FIX #3: collect settled results and surface any failures to the UI
  const results = await Promise.allSettled([
    fetchDirasakanNotification(),
    fetchTerdeteksiNotification(),
  ]);

  const anyFailed = results.some((r) => r.status === "rejected");

  // Only show error when ALL fetches failed and there are no notifications yet.
  // If we already have data, a transient network hiccup shouldn't wipe the UI.
  if (anyFailed && state.notifications.length === 0) {
    setState({ error: "Gagal memuat notifikasi. Periksa koneksi Anda." });
  } else if (!anyFailed && state.error) {
    setState({ error: null }); // clear stale error once fetch recovers
  }
}

// ─── Polling lifecycle ────────────────────────────────────────────────────────

function startPolling() {
  // FIX #2: guard on pollTimer, not a separate isStarted flag.
  // pollTimer is null both on first run AND after stopPolling, so this
  // correctly handles hot reload without risking double-interval.
  if (pollTimer) return;

  scheduleDailyReset();
  void pollLatestQuakes();
  pollTimer = setInterval(() => void pollLatestQuakes(), POLL_INTERVAL_MS);
}

function stopPollingIfUnused() {
  if (listeners.size > 0 || !pollTimer) return;

  clearInterval(pollTimer);
  pollTimer = null;

  if (dailyResetTimer) {
    clearTimeout(dailyResetTimer);
    dailyResetTimer = null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  startPolling();
  return () => {
    listeners.delete(listener);
    stopPollingIfUnused();
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function markAllNotificationsAsRead() {
  // FIX #4: bail early if nothing to mark — avoids a pointless setState +
  //         notifyListeners() call every time the notifications screen opens
  if (state.unreadCount === 0) return;

  const notifications = state.notifications.map((item) => ({ ...item, isRead: true }));
  setState({ notifications, unreadCount: 0 });
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
    error: snapshot.error, // FIX #3: exposed so the screen can render it
    markAllAsRead: markAllNotificationsAsRead,
  };
}
