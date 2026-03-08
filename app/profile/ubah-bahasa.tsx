import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function UbahBahasa() {
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // State Baru untuk Modal Warning
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Default: Indonesia Aktif (ID)
  const [selectedLang, setSelectedLang] = useState("ID");

  const profile = {
    name: "Fasya Burhanis syauqi",
    email: "fasyaburhaniss@gmail.com",
    location: "Bandung",
    phone: "081-3983-8389",
    initials: "FBS",
  };

  const handleLanguageChange = (lang: string) => {
    // 1. Mencegah user mematikan kedua bahasa
    if (selectedLang === lang) {
      setShowWarningModal(true);
      return;
    }

    // 2. Jika valid, update bahasa & munculkan modal sukses
    setSelectedLang(lang);
    setShowSuccessModal(true);
  };

  return (
    <View style={styles.container}>
      {/* HEADER PROFIL - Konsisten */}
      <View style={styles.headerSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{profile.initials}</Text>
          <TouchableOpacity style={styles.editBadge}>
            <MaterialCommunityIcons name="camera" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{profile.name}</Text>
        <Text style={styles.userDetails}>{profile.email}</Text>
        <Text style={styles.userDetails}>{profile.location}</Text>
        <Text style={styles.userDetails}>{profile.phone}</Text>
      </View>

      {/* MENU SECTION - Area Biru Gelap Selaras */}
      <View style={styles.menuContainer}>
        <View style={styles.menuContent}>
          <View style={styles.titleRow}>
            <Text style={styles.sectionTitle}>Ubah Bahasa</Text>
          </View>

          {/* Kartu Bahasa Indonesia */}
          <View style={styles.languageItem}>
            <View style={styles.menuLeft}>
              <View style={styles.flagWrapper}>
                <Image
                  source={{ uri: "https://flagcdn.com/w80/id.png" }}
                  style={styles.flagIcon}
                />
              </View>
              <Text style={styles.menuText}>Indonesia</Text>
            </View>
            <Switch
              trackColor={{ false: "#D1D1D1", true: "#B2D8EC" }}
              thumbColor={selectedLang === "ID" ? "#1E6F9F" : "#f4f3f4"}
              onValueChange={() => handleLanguageChange("ID")}
              value={selectedLang === "ID"}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>

          {/* Kartu Bahasa Inggris */}
          <View style={styles.languageItem}>
            <View style={styles.menuLeft}>
              <View style={styles.flagWrapper}>
                <Image
                  source={{ uri: "https://flagcdn.com/w80/gb.png" }}
                  style={styles.flagIcon}
                />
              </View>
              <Text style={styles.menuText}>English</Text>
            </View>
            <Switch
              trackColor={{ false: "#D1D1D1", true: "#B2D8EC" }}
              thumbColor={selectedLang === "EN" ? "#1E6F9F" : "#f4f3f4"}
              onValueChange={() => handleLanguageChange("EN")}
              value={selectedLang === "EN"}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
        </View>
      </View>

      {/* MODAL BERHASIL - Mengikuti styling sebelumnya */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowSuccessModal(false)}
        >
          <View style={styles.infoCard}>
            <Ionicons
              name="checkmark-circle"
              size={50}
              color="#1E6F9F"
              style={styles.modalIcon}
            />
            <Text style={styles.infoTitle}>Berhasil</Text>
            <Text style={styles.infoDesc}>
              Bahasa aplikasi telah berhasil diubah ke{" "}
              {selectedLang === "ID" ? "Indonesia" : "English"}.
            </Text>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.infoButtonText}>Mengerti</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* MODAL WARNING (Sertakan Ikon Alert) */}
      <Modal visible={showWarningModal} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowWarningModal(false)}
        >
          <View style={styles.infoCard}>
            <Ionicons
              name="alert-circle"
              size={50}
              color="#E11D48"
              style={styles.modalIcon}
            />
            <Text style={styles.infoTitleError}>Peringatan</Text>
            <Text style={styles.infoDesc}>
              Aplikasi memerlukan setidaknya satu bahasa yang aktif. Anda tidak
              dapat mematikan semua bahasa.
            </Text>
            <TouchableOpacity
              style={styles.infoButtonError}
              onPress={() => setShowWarningModal(false)}
            >
              <Text style={styles.infoButtonText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
  titleRow: { marginBottom: 15 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },

  languageItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 12,
    height: 60,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuLeft: { flexDirection: "row", alignItems: "center" },
  flagWrapper: {
    width: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  flagIcon: {
    width: 30,
    height: 20,
    borderRadius: 3,
    // TAMBAHKAN OUTLINE DI SINI
    borderWidth: 0.5,
    borderColor: "#D1D1D1", // Abu-abu tipis
  },
  menuText: { fontSize: 15, fontWeight: "600", color: "#333" },

  // MODAL STYLES (MATCH HOME/PREVIOUS)
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
  infoTitleError: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    color: "#E11D48",
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
  infoButtonError: {
    backgroundColor: "#E11D48",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  infoButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
