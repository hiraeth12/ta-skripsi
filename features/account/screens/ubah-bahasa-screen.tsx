import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
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
import ProfilePageLayout from "../components/profile-page-layout";
import { ACCOUNT_PROFILE, fetchProfileFromFirebase, ProfileData } from "../data/profile";
import { styles } from "./styles/ubah-bahasa-styles";

export default function UbahBahasa() {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [profile, setProfile] = useState<ProfileData>(ACCOUNT_PROFILE);
  const [loading, setLoading] = useState(true);

  // State Baru untuk Modal Warning
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Default: Indonesia Aktif (ID)
  const [selectedLang, setSelectedLang] = useState("ID");

  // Fetch profile from Firebase on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const firebaseProfile = await fetchProfileFromFirebase();
        setProfile(firebaseProfile);
      } catch {
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

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
    <>
      <ProfilePageLayout
        title="Ubah Bahasa"
        headerName={profile.name}
        headerEmail={profile.email}
        headerLocation={profile.location}
        headerInitials={profile.initials}
      >
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
      </ProfilePageLayout>

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
    </>
  );
}
