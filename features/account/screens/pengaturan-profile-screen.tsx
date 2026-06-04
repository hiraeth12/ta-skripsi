import CustomAlert from "@/components/ui/custom-alert";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { getDatabase, ref, update } from "@react-native-firebase/database";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next"; // <-- Import i18n
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { handleLogout } from "../components/handle-logout";
import ProfilePageLayout from "../components/profile-page-layout";
import { useProfileContext } from "../profile-context";
import { styles } from "./styles/pengaturan-profil.styles";

const sanitizeLettersOnly = (value: string) => value.replace(/[^\p{L}]/gu, "");
const sanitizeNameParts = (value: string) =>
  value
    .replace(/[^\p{L}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trimStart();

export default function PengaturanProfil() {
  const { t } = useTranslation(); // <-- Hook i18n dipanggil di sini
  const router = useRouter();
  const { profile, setProfile } = useProfileContext();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "error" as "error" | "success",
  });
  const [tempForm, setTempForm] = useState({
    namaDepan: "",
    namaBelakang: "",
  });

  // Sync form when profile data becomes available
  useEffect(() => {
    if (!profile.name) return;
    const [first = "", ...rest] = profile.name.split(" ");
    setTempForm({
      namaDepan: first,
      namaBelakang: rest.join(" "),
    });
  }, [profile.name]);

  const handleSimpan = async () => {
    if (isSaving) return;

    const first = sanitizeLettersOnly(tempForm.namaDepan).trim();
    const last = sanitizeNameParts(tempForm.namaBelakang).trim();

    if (!first) {
      setModalConfig({
        visible: true,
        title: t("pengaturanProfilScreen.alert.errorTitle"), // <-- Menggunakan t()
        message: t("pengaturanProfilScreen.alert.missingFirstName"), // <-- Menggunakan t()
        type: "error",
      });
      return;
    }

    try {
      setIsSaving(true);

      const app = getApp();
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) {
        setModalConfig({
          visible: true,
          title: t("pengaturanProfilScreen.alert.errorTitle"),
          message: t("pengaturanProfilScreen.alert.userNotLoggedIn"),
          type: "error",
        });
        return;
      }

      const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
      const db = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);

      await update(ref(db, `users/${user.uid}`), {
        firstName: first,
        lastName: last,
        profileUpdatedAt: new Date().toISOString(),
      });

      const fullName = `${first} ${last}`.trim();
      const initials = fullName
        .split(" ")
        .slice(0, 3)
        .map((w) => w.charAt(0).toUpperCase())
        .join("");

      // ── Optimistic update: context reflects changes immediately across all
      //    screens — no re-fetch needed. ───────────────────────────────────────
      setProfile((prev: typeof profile) => ({
        ...prev,
        name: fullName,
        initials,
      }));

      router.replace("/main-menu/account");
    } catch {
      setModalConfig({
        visible: true,
        title: t("pengaturanProfilScreen.alert.errorTitle"),
        message: t("pengaturanProfilScreen.alert.updateFailed"),
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setLogoutModalVisible(false);

    const didLogout = await handleLogout(router);
    if (!didLogout) {
      setModalConfig({
        visible: true,
        title: t("pengaturanProfilScreen.alert.logoutFailedTitle"), // <-- Menggunakan t()
        message: t("pengaturanProfilScreen.alert.logoutFailedMsg"), // <-- Menggunakan t()
        type: "error",
      });
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <ProfilePageLayout
        title={t("pengaturanProfilScreen.title")} // <-- Menggunakan t()
        headerName={profile.name}
        headerEmail={profile.email}
        headerLocation={profile.location}
        headerInitials={profile.initials}
      >
        <KeyboardAwareScrollView
          style={styles.keyboardScroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
          extraScrollHeight={24}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inputCard}>
            <View style={styles.inputArea}>
              <Text style={styles.label}>
                {t("pengaturanProfilScreen.firstNameLabel")}
              </Text>
              <TextInput
                style={styles.input}
                value={tempForm.namaDepan}
                onChangeText={(txt) =>
                  setTempForm({
                    ...tempForm,
                    namaDepan: sanitizeLettersOnly(txt),
                  })
                }
                selectionColor="#1E6F9F"
              />
            </View>

            <View style={styles.inputArea}>
              <Text style={styles.label}>
                {t("pengaturanProfilScreen.lastNameLabel")}
              </Text>
              <TextInput
                style={styles.input}
                value={tempForm.namaBelakang}
                onChangeText={(txt) =>
                  setTempForm({
                    ...tempForm,
                    namaBelakang: sanitizeNameParts(txt),
                  })
                }
                selectionColor="#1E6F9F"
              />
            </View>

            <View style={styles.buttonWrapper}>
              <TouchableOpacity
                style={styles.btnBatal}
                onPress={() => router.back()}
              >
                <Text style={styles.btnTextBatal}>
                  {t("pengaturanProfilScreen.btnCancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSimpan}
                onPress={handleSimpan}
                disabled={isSaving}
              >
                <Text style={styles.btnTextSimpan}>
                  {isSaving
                    ? t("pengaturanProfilScreen.btnSaving")
                    : t("pengaturanProfilScreen.btnSave")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => setLogoutModalVisible(true)}
            disabled={isLoggingOut}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="logout" size={22} color="#E11D48" />
            <Text style={styles.logoutText}>
              {isLoggingOut
                ? t("pengaturanProfilScreen.btnLogouting")
                : t("pengaturanProfilScreen.btnLogout")}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </KeyboardAwareScrollView>
      </ProfilePageLayout>

      <Modal visible={logoutModalVisible} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setLogoutModalVisible(false)}
        >
          <Pressable style={styles.confirmCard}>
            <MaterialCommunityIcons
              name="logout"
              size={44}
              color="#E11D48"
              style={styles.confirmIcon}
            />
            <Text style={styles.confirmTitle}>
              {t("pengaturanProfilScreen.modalLogoutTitle")}
            </Text>
            <Text style={styles.confirmDesc}>
              {t("pengaturanProfilScreen.modalLogoutDesc")}
            </Text>
            <View style={styles.confirmButtonWrapper}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.confirmCancelText}>
                  {t("pengaturanProfilScreen.btnCancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmLogoutButton}
                onPress={handleConfirmLogout}
                disabled={isLoggingOut}
              >
                <Text style={styles.confirmLogoutText}>
                  {isLoggingOut
                    ? t("pengaturanProfilScreen.btnLogouting")
                    : t("pengaturanProfilScreen.btnLogout")}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <CustomAlert
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={() => setModalConfig({ ...modalConfig, visible: false })}
      />
    </>
  );
}
