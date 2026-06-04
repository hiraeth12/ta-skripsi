import {
  useQuakeNotifications,
  type QuakeNotification,
} from "@/hooks/use-quake-notifications";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next"; // <-- Import i18n
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { styles } from "./styles/notifications-screen.styles";

// ─── NotifCard ────────────────────────────────────────────────────────────────

// FIX #5: typed with QuakeNotification instead of any
type NotifCardProps = {
  item: QuakeNotification;
  onPress: () => void;
  t: any; // <-- Tambahkan parameter t
};

const NotifCard = ({ item, onPress, t }: NotifCardProps) => {
  const isDirasakan = item.type === "Dirasakan";

  return (
    <TouchableOpacity
      style={styles.notifCard}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.notifContent}>
        <View style={styles.textWrapper}>
          <Text style={styles.notifTitle}>
            {/* <-- Menggunakan t() untuk judul card --> */}
            {isDirasakan
              ? t("notificationsScreen.cardTitleDirasakan")
              : t("notificationsScreen.cardTitleTerdeteksi")}
          </Text>
          <Text style={styles.notifSubTitle}>
            M {item.magnitude} – {item.location}
          </Text>
          <Text style={styles.notifTime}>
            {item.date} • {item.time}
          </Text>
        </View>
        <View
          style={[
            styles.badge,
            isDirasakan ? styles.badgeRed : styles.badgeGreen,
          ]}
        >
          <Text style={styles.badgeText}>
            {/* <-- Menggunakan t() untuk teks badge --> */}
            {isDirasakan
              ? t("notificationsScreen.badgeDirasakan")
              : t("notificationsScreen.badgeTidakDirasakan")}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function Notifikasi() {
  const { t } = useTranslation(); // <-- Hook i18n dipanggil di komponen utama
  const router = useRouter();
  const { notifications, unreadCount, error, markAllAsRead } =
    useQuakeNotifications();

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
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginRight: 15 }}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            {/* <-- Menggunakan t() untuk header --> */}
            <Text style={styles.sectionTitle}>
              {t("notificationsScreen.headerTitle")}
            </Text>
          </View>

          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <NotifCard
                item={item}
                t={t} // <-- Teruskan t() ke NotifCard
                onPress={() =>
                  router.push({
                    pathname: "/main-menu/earthquake",
                    params: {
                      tab:
                        item.type === "Dirasakan"
                          ? "GEMPA DIRASAKAN"
                          : "GEMPA TERDETEKSI",
                    },
                  })
                }
              />
            )}
            // FIX #3: show the actual error message instead of the generic empty text
            ListEmptyComponent={() => (
              <Text style={styles.emptyText}>
                {/* <-- Menggunakan t() untuk fallback jika tidak ada notifikasi --> */}
                {error ?? t("notificationsScreen.emptyFallback")}
              </Text>
            )}
          />
        </View>
      </View>
    </View>
  );
}
