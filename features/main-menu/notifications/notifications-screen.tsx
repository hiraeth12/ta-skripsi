import { useQuakeNotifications } from "@/hooks/use-quake-notifications";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { styles } from "./notifications-screen.styles";

const NotifCard = ({ item, onPress }: any) => {
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
            {isDirasakan ? "Gempa Dirasakan" : "Gempa Terdeteksi"}
          </Text>
          {/* Mapping properti: magnitude, location, date, time */}
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
            {isDirasakan ? "Dirasakan" : "Tidak dirasakan"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function Notifikasi() {
  const router = useRouter();
  const { notifications, markAllAsRead } = useQuakeNotifications();

  useEffect(() => {
    markAllAsRead();
  }, [markAllAsRead]);

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
                      tab:
                        item.type === "Dirasakan"
                          ? "GEMPA DIRASAKAN"
                          : "GEMPA TERDETEKSI",
                    },
                  })
                }
              />
            )}
            ListEmptyComponent={() => (
              <Text style={styles.emptyText}>Belum ada notifikasi.</Text>
            )}
          />
        </View>
      </View>
    </View>
  );
}
