import { useQuakeNotifications, type QuakeNotification } from "@/hooks/use-quake-notifications";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { styles } from "./styles/notifications-screen.styles";

// ─── NotifCard ────────────────────────────────────────────────────────────────

// FIX #5: typed with QuakeNotification instead of any
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
            M {item.magnitude} – {item.location}
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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function Notifikasi() {
  const router = useRouter();
  const { notifications, unreadCount, error, markAllAsRead } = useQuakeNotifications();

  // FIX #4: guard against calling markAllAsRead when nothing is unread,
  //         preventing a needless setState + re-render on every screen open
  useEffect(() => {
    if (unreadCount > 0) markAllAsRead();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally run once on mount

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
            data={notifications}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <NotifCard
                item={item}
                onPress={() =>
                  router.push({
                    pathname: "/main-menu/earthquake",
                    params: {
                      tab: item.type === "Dirasakan" ? "GEMPA DIRASAKAN" : "GEMPA TERDETEKSI",
                    },
                  })
                }
              />
            )}
            // FIX #3: show the actual error message instead of the generic empty text
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