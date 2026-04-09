import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Account() {
  const router = useRouter();
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);

  // State untuk Modal Notifikasi
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifStatus, setNotifStatus] = useState(true); 

  const user = {
    name: "Fasya Burhanis syauqi",
    email: "fasyaburhaniss@gmail.com",
    location: "Bandung",
    phone: "081-3983-8389",
    initials: "FBS",
    profileImage: null,
  };

  // Fungsi Handler Switch Notifikasi
  const handleToggleNotification = (value: boolean) => {
    setIsNotificationsEnabled(value);
    setNotifStatus(value);
    setShowNotifModal(true);
  };

  return (
    <View style={styles.container}>
      {/* HEADER PROFIL */}
      <View style={styles.headerSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{user.initials}</Text>
          <TouchableOpacity style={styles.editBadge}>
            <MaterialCommunityIcons name="camera" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userDetails}>{user.email}</Text>
        <Text style={styles.userDetails}>{user.location}</Text>
        <Text style={styles.userDetails}>{user.phone}</Text>
      </View>

      {/* MENU SECTION */}
      <View style={styles.menuContainer}>
        <View style={styles.menuContent}>
          <MenuLink
            icon="account-circle-outline"
            title="Pengaturan Profil"
            onPress={() => router.push("/profile/pengaturan")}
          />

          <MenuLink
            icon="lock-outline"
            title="Ubah Kata Sandi"
            onPress={() => router.push("/profile/ubah-kata-sandi")}
          />

          <MenuLink
            icon="map-marker-outline"
            title="Ubah Lokasi"
            onPress={() => router.push("/profile/ubah-lokasi")}
          />

          <MenuLink
            icon="earth"
            title="Ubah Bahasa"
            onPress={() => router.push("/profile/ubah-bahasa")}
          />

          {/* NOTIFIKASI PUSH DENGAN LOGIKA MODAL */}
          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={styles.iconWrapper}>
                <Ionicons
                  name="notifications-outline"
                  size={25}
                  color="#1E6F9F"
                />
              </View>
              <Text style={styles.menuText}>Notifikasi Push</Text>
            </View>
            <Switch
              trackColor={{ false: "#D1D1D1", true: "#B2D8EC" }}
              thumbColor={isNotificationsEnabled ? "#1E6F9F" : "#f4f3f4"}
              onValueChange={handleToggleNotification}
              value={isNotificationsEnabled}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>

          <MenuLink
            icon="cellphone-information"
            title="Tentang Aplikasi"
            onPress={() => router.push("/profile/tentang-aplikasi")}
          />
        </View>
      </View>

      {/* MODAL NOTIFIKASI (MENGIKUTI STYLING SEBELUMNYA) */}
      <Modal visible={showNotifModal} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowNotifModal(false)}
        >
          <View style={styles.infoCard}>
            <Ionicons
              name={notifStatus ? "notifications" : "notifications-off"}
              size={40}
              color="#1E6F9F"
              style={styles.modalIcon}
            />
            <Text style={styles.infoTitle}>
              Notifikasi {notifStatus ? "Aktif" : "Nonaktif"}
            </Text>
            <Text style={styles.infoDesc}>
              {notifStatus
                ? "Dengan ini, Anda akan menerima pemberitahuan langsung di perangkat Anda terkait aktivitas gempa terkini."
                : "Anda telah mematikan notifikasi. Anda tidak akan menerima pemberitahuan langsung mengenai pembaruan sistem atau gempa."}
            </Text>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => setShowNotifModal(false)}
            >
              <Text style={styles.infoButtonText}>Mengerti</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// MenuLink component stays the same as before...
const MenuLink = ({ icon, title, onPress }: any) => (
  <TouchableOpacity
    style={styles.menuItem}
    activeOpacity={0.7}
    onPress={onPress}
  >
    <View style={styles.menuLeft}>
      <View style={styles.iconWrapper}>
        <MaterialCommunityIcons name={icon} size={25} color="#1E6F9F" />
      </View>
      <Text style={styles.menuText}>{title}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#999" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  // Tetap menggunakan styles yang sudah ada sebelumnya untuk konsistensi
  container: { flex: 1, backgroundColor: "#fff" },
  headerSection: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#fff",
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#D81B60",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    position: "relative",
  },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "bold" },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#1E6F9F",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 5,
  },
  userDetails: { fontSize: 14, color: "#555", marginBottom: 2 },
  menuContainer: {
    flex: 1,
    backgroundColor: "#0C4A6E",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  menuContent: { paddingHorizontal: 20, paddingTop: 20, flex: 1 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 12,
    height: 58,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuLeft: { flexDirection: "row", alignItems: "center" },
  iconWrapper: {
    width: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  menuText: { fontSize: 15, fontWeight: "600", color: "#333" },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "85%",
    padding: 24,
  },
  modalIcon: { alignSelf: "center", marginBottom: 12 },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  infoDesc: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  infoButton: {
    backgroundColor: "#1E6F9F",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  infoButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
