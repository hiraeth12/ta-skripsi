import { XMLParser } from "fast-xml-parser";
import { useEffect, useState } from "react";

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
};

const DIRASAKAN_API_URL = process.env.EXPO_PUBLIC_GEMPA_DIRASAKAN_API_URL;
const TERDETEKSI_API_URL = process.env.EXPO_PUBLIC_GEMPA_TERDETEKSI_API_URL;

const POLL_INTERVAL_MS = 15_000;

let state: NotificationState = {
  notifications: [],
  unreadCount: 0,
};

let isStarted = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let dailyResetTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
let currentDayKey = getLocalDayKey();

const latestSeen = {
  dirasakan: "",
  terdeteksi: "",
};

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function getLocalDayKey() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function clearAllNotifications() {
  setState({ notifications: [], unreadCount: 0 });
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

function setState(next: NotificationState) {
  state = next;
  notifyListeners();
}

function recomputeUnreadCount(notifications: QuakeNotification[]) {
  return notifications.reduce(
    (total, item) => total + (item.isRead ? 0 : 1),
    0,
  );
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
    Jan: "Jan",
    Feb: "Feb",
    Mar: "Mar",
    Apr: "Apr",
    Mei: "May",
    Jun: "Jun",
    Jul: "Jul",
    Agt: "Aug",
    Sep: "Sep",
    Okt: "Oct",
    Nov: "Nov",
    Des: "Dec",
  };

  let normalizedDate = rawDate;
  Object.keys(monthMap).forEach((key) => {
    if (normalizedDate.includes(key)) {
      normalizedDate = normalizedDate.replace(key, monthMap[key]);
    }
  });

  const parsed = new Date(`${normalizedDate} ${cleanTime} GMT+0700`).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function pushNotification(notification: QuakeNotification) {
  if (state.notifications.some((item) => item.id === notification.id)) return;

  const notifications = [notification, ...state.notifications]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100);

  setState({
    notifications,
    unreadCount: recomputeUnreadCount(notifications),
  });
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
    latest.eventid ??
      latest.identifier ??
      globalIdentifier ??
      `${latest.date}-${latest.time}-${latest.magnitude}-${latest.area}`,
  );

  if (!eventId || eventId === latestSeen.dirasakan) return;
  latestSeen.dirasakan = eventId;

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
    props.ids ??
      props.id ??
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

async function pollLatestQuakes() {
  resetIfDayChanged();

  await Promise.allSettled([
    fetchDirasakanNotification(),
    fetchTerdeteksiNotification(),
  ]);
}

function startPolling() {
  if (isStarted) return;
  isStarted = true;
  scheduleDailyReset();

  void pollLatestQuakes();

  pollTimer = setInterval(() => {
    void pollLatestQuakes();
  }, POLL_INTERVAL_MS);
}

function stopPollingIfUnused() {
  if (listeners.size > 0) return;
  if (!pollTimer) return;

  clearInterval(pollTimer);
  pollTimer = null;
  if (dailyResetTimer) {
    clearTimeout(dailyResetTimer);
    dailyResetTimer = null;
  }
  isStarted = false;
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
  const notifications = state.notifications.map((item) => ({
    ...item,
    isRead: true,
  }));

  setState({ notifications, unreadCount: 0 });
}

export function useQuakeNotifications() {
  const [snapshot, setSnapshot] = useState<NotificationState>(state);

  useEffect(() => {
    setSnapshot(state);
    return subscribe(() => {
      setSnapshot(state);
    });
  }, []);

  return {
    notifications: snapshot.notifications,
    unreadCount: snapshot.unreadCount,
    markAllAsRead: markAllNotificationsAsRead,
  };
}
