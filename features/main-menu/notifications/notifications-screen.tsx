import { useQuakeNotifications } from "@/hooks/use-quake-notifications";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const NotifCard = ({ item, onPress }: any) => {
  // Sesuai data dari hook: pakai 'item.type'
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0C4A6E" },
  menuContainer: { flex: 1, backgroundColor: "#0C4A6E" },
  menuContent: { paddingHorizontal: 20, paddingTop: 20, flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  notifCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    elevation: 3,
  },
  notifContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textWrapper: { flex: 1, marginRight: 10 },
  notifTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  notifSubTitle: { fontSize: 13, color: "#333", marginBottom: 2 },
  notifTime: { fontSize: 12, color: "#888" },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 90,
    alignItems: "center",
  },
  badgeRed: { backgroundColor: "#EF4444" },
  badgeGreen: { backgroundColor: "#22C55E" },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  emptyText: {
    color: "#fff",
    textAlign: "center",
    marginTop: 50,
    opacity: 0.6,
  },
});
