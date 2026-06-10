import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useQuakeNotifications, type QuakeNotification } from "@/hooks/use-quake-notifications";

function sortByNewest(a: QuakeNotification, b: QuakeNotification): number {
  if (a.timestamp !== b.timestamp) return b.timestamp - a.timestamp;
  return b.id.localeCompare(a.id);
}

/**
 * Mengelola daftar notifikasi yang ditampilkan di layar:
 * - Saat layar difokus: tampilkan semua unread, lalu mark as read
 * - Saat ada notifikasi baru masuk: tambahkan ke daftar secara live
 */
export function useVisibleNotifications() {
  const { notifications, unreadCount, error, markAllAsRead } =
    useQuakeNotifications();

  const [visibleNotifications, setVisibleNotifications] = useState<
    QuakeNotification[]
  >(() => notifications.filter((item) => !item.isRead));

  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  // Tambahkan notifikasi unread baru yang masuk saat layar terbuka
  useEffect(() => {
    setVisibleNotifications((current) => {
      const currentIds = new Set(current.map((item) => item.id));
      const unreadNew = notifications.filter(
        (item) => !item.isRead && !currentIds.has(item.id),
      );

      if (unreadNew.length === 0) return current;

      return [...unreadNew, ...current].sort(sortByNewest);
    });
  }, [notifications]);

  // Saat layar difokus: sync ulang unread dan langsung mark as read
  useFocusEffect(
    useCallback(() => {
      const unread = notificationsRef.current.filter((item) => !item.isRead);
      setVisibleNotifications(unread);
      markAllAsRead();
    }, [markAllAsRead]),
  );

  return {
    visibleNotifications,
    unreadCount,
    error,
  };
}