import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ProfilePageLayout from "../components/profile-page-layout";
import { goBackToAccount } from "../navigation";
import { useProfileContext } from "../profile-context";
import { styles } from "./styles/ubah-bahasa-styles";

export default function UbahBahasa() {
  const router = useRouter();
  const { profile } = useProfileContext(); // ← no local fetch
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [selectedLang, setSelectedLang] = useState("ID");

  const handleLanguageChange = (lang: string) => {
    if (selectedLang === lang) {
      setShowWarningModal(true);
      return;
    }
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
        <ScrollView
          style={styles.languageScroll}
          contentContainerStyle={styles.languageScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {[
            {
              lang: "ID",
              uri: "https://flagcdn.com/w80/id.png",
              label: "Indonesia",
            },
            {
              lang: "EN",
              uri: "https://flagcdn.com/w80/gb.png",
              label: "English",
            },
          ].map(({ lang, uri, label }) => (
            <View key={lang} style={styles.languageItem}>
              <View style={styles.menuLeft}>
                <View style={styles.flagWrapper}>
                  <Image source={{ uri }} style={styles.flagIcon} />
                </View>
                <Text style={styles.menuText} numberOfLines={1}>
                  {label}
                </Text>
              </View>
              <View style={styles.menuRightControl}>
                <Switch
                  trackColor={{ false: "#D1D1D1", true: "#B2D8EC" }}
                  thumbColor={selectedLang === lang ? "#1E6F9F" : "#f4f3f4"}
                  onValueChange={() => handleLanguageChange(lang)}
                  value={selectedLang === lang}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              </View>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.backItem}
          onPress={() => goBackToAccount(router)}
        >
          <Text style={styles.backText}>Kembali</Text>
        </TouchableOpacity>
      </ProfilePageLayout>

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
              Aplikasi memerlukan setidaknya satu bahasa yang aktif. Anda tidak dapat mematikan semua bahasa.
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
