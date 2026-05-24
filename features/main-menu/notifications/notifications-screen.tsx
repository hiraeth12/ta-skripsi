import { useQuakeNotifications, type QuakeNotification } from "@/hooks/use-quake-notifications";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { styles } from "./styles/notifications-screen.styles";

type NotifCardProps = {
  item: QuakeNotification;
  onPress: () => void;
};

const NotifCard = ({ item, onPress }: NotifCardProps) => {
  const isDirasakan = item.type === "Dirasakan";

  return (
    <TouchableOpacity style={styles.notifCard} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.notifContent}>
        <View style={styles.textWrapper}>
          <Text style={styles.notifTitle}>
            {isDirasakan ? "Gempa Dirasakan" : "Gempa Terdeteksi"}
          </Text>
          <Text style={styles.notifSubTitle}>
            M {item.magnitude} - {item.location}
          </Text>
          <Text style={styles.notifTime}>
            {item.date} • {item.time}
          </Text>
        </View>
        <View style={[styles.badge, isDirasakan ? styles.badgeRed : styles.badgeGreen]}>
          <Text style={styles.badgeText}>
            {isDirasakan ? "Dirasakan" : "Tidak dirasakan"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEarthquakeTab(type: QuakeNotification["type"]) {
  return type === "Dirasakan" ? "GEMPA DIRASAKAN" : "GEMPA TERDETEKSI";
}

function getHistoryTab(type: QuakeNotification["type"]) {
  return type === "Dirasakan" ? "dirasakan" : "terdeteksi";
}

function isNewerNotification(a: QuakeNotification, b: QuakeNotification) {
  if (a.timestamp !== b.timestamp) return a.timestamp > b.timestamp;
  return a.id.localeCompare(b.id) > 0;
}

function getLatestNotificationForType(
  notifications: QuakeNotification[],
  type: QuakeNotification["type"],
) {
  return notifications
    .filter((item) => item.type === type)
    .reduce<QuakeNotification | null>(
      (latest, item) => (!latest || isNewerNotification(item, latest) ? item : latest),
      null,
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Notifikasi() {
  const router = useRouter();
  const { notifications, error, markAllAsRead } = useQuakeNotifications();

  const [visibleNotifications, setVisibleNotifications] = useState<QuakeNotification[]>(
    () => notifications.filter((item) => !item.isRead),
  );

  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  useFocusEffect(
    useCallback(() => {
      // Snapshot unread saat screen dibuka
      const unread = notificationsRef.current.filter((item) => !item.isRead);
      setVisibleNotifications(unread);

      // Tandai semua sebagai dibaca — satu kali, satu tempat
      markAllAsRead();
    }, [markAllAsRead]),
  );

  const handleNotificationPress = useCallback(
    (item: QuakeNotification) => {
      const latestForType = getLatestNotificationForType(
        visibleNotifications,
        item.type,
      );

      if (latestForType?.id === item.id) {
        router.push({
          pathname: "/main-menu/earthquake",
          params: { tab: getEarthquakeTab(item.type) },
        });
        return;
      }

      router.push({
        pathname: "/main-menu/history",
        params: { tab: getHistoryTab(item.type) },
      });
    },
    [router, visibleNotifications],
  );

  return (
    <View style={styles.container}>
      <View style={styles.menuContainer}>
        <View style={styles.menuContent}>
          <View style={styles.titleRow}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>Notifikasi Terbaru</Text>
          </View>

          <FlatList
            data={visibleNotifications}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <NotifCard
                item={item}
                onPress={() => handleNotificationPress(item)}
              />
            )}
            ListEmptyComponent={() => (
              <Text style={styles.emptyText}>
                {error ?? "Belum ada notifikasi."}
              </Text>
            )}
          />
        </View>
      </View>
    </View>
  );
}