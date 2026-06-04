import i18n, { STORE_LANGUAGE_KEY } from "@/constants/translations/i18n";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next"; // <-- Import i18n
import {
  Image,
  Modal,
  Pressable,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ProfilePageLayout from "../components/profile-page-layout";
import { useProfileContext } from "../profile-context";
import { styles } from "./styles/ubah-bahasa-styles";

export default function UbahBahasa() {
  const { t } = useTranslation(); // <-- Hook i18n dipanggil di sini
  const router = useRouter();
  const { profile } = useProfileContext(); // ← no local fetch
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [selectedLang, setSelectedLang] = useState("ID");

  useEffect(() => {
    const syncLang = (langCode?: string) => {
      const next = langCode === "en" ? "EN" : "ID";
      setSelectedLang(next);
    };

    syncLang(i18n.language);

    const handler = (lang: string) => syncLang(lang);
    i18n.on("languageChanged", handler);
    return () => {
      i18n.off("languageChanged", handler);
    };
  }, []);

  const handleLanguageChange = async (lang: string) => {
    if (selectedLang === lang) {
      setShowWarningModal(true);
      return;
    }

    const nextLang = lang === "EN" ? "en" : "id";
    setSelectedLang(lang);
    await i18n.changeLanguage(nextLang);
    await AsyncStorage.setItem(STORE_LANGUAGE_KEY, nextLang);
    setShowSuccessModal(true);
  };

  return (
    <>
      <ProfilePageLayout
        title={t("ubahBahasaScreen.title")} // <-- Menggunakan t()
        headerName={profile.name}
        headerEmail={profile.email}
        headerLocation={profile.location}
        headerInitials={profile.initials}
      >
        <View style={{ flex: 1 }}>
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
                <Text style={styles.menuText}>{label}</Text>
              </View>
              <Switch
                trackColor={{ false: "#D1D1D1", true: "#B2D8EC" }}
                thumbColor={selectedLang === lang ? "#1E6F9F" : "#f4f3f4"}
                onValueChange={() => handleLanguageChange(lang)}
                value={selectedLang === lang}
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.backItem} onPress={() => router.back()}>
          <Text style={styles.backText}>{t("ubahBahasaScreen.btnBack")}</Text>
        </TouchableOpacity>
      </ProfilePageLayout>

      {/* Modal Sukses */}
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
            <Text style={styles.infoTitle}>
              {t("ubahBahasaScreen.modalSuccessTitle")}
            </Text>
            <Text style={styles.infoDesc}>
              {t("ubahBahasaScreen.modalSuccessDesc")}{" "}
              {selectedLang === "ID" ? "Indonesia" : "English"}.
            </Text>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.infoButtonText}>
                {t("ubahBahasaScreen.modalSuccessBtn")}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Modal Peringatan */}
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
            <Text style={styles.infoTitleError}>
              {t("ubahBahasaScreen.modalWarningTitle")}
            </Text>
            <Text style={styles.infoDesc}>
              {t("ubahBahasaScreen.modalWarningDesc")}
            </Text>
            <TouchableOpacity
              style={styles.infoButtonError}
              onPress={() => setShowWarningModal(false)}
            >
              <Text style={styles.infoButtonText}>
                {t("ubahBahasaScreen.modalWarningBtn")}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
