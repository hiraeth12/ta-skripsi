import CustomAlert from "@/components/ui/custom-alert";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import {
  EmailAuthProvider,
  getAuth,
  reauthenticateWithCredential,
  updatePassword,
} from "@react-native-firebase/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next"; // <-- Import i18n
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import ProfilePageLayout from "../components/profile-page-layout";
import { useProfileContext } from "../profile-context";
import { styles } from "./styles/ubah-kata-sandi-styles";

export default function UbahKataSandi() {
  const { t } = useTranslation(); // <-- Hook i18n dipanggil di sini
  const router = useRouter();
  const { profile } = useProfileContext(); // ← no local fetch

  // <-- Pindahkan ke dalam komponen agar bisa menggunakan t() -->
  const PASSWORD_FIELDS = [
    { label: t("ubahKataSandiScreen.oldPasswordLabel"), key: "passwordLama" },
    { label: t("ubahKataSandiScreen.newPasswordLabel"), key: "passwordBaru" },
    {
      label: t("ubahKataSandiScreen.confirmPasswordLabel"),
      key: "konfirmasiPassword",
    },
  ] as const;

  const [errorVisible, setErrorVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "error" as "error" | "success",
  });
  const [secure, setSecure] = useState({
    passwordLama: true,
    passwordBaru: true,
    konfirmasiPassword: true,
  });
  const [form, setForm] = useState({
    passwordLama: "",
    passwordBaru: "",
    konfirmasiPassword: "",
  });

  const toggleSecure = (key: keyof typeof secure) =>
    setSecure((prev) => ({ ...prev, [key]: !prev[key] }));

  const showCustomAlert = (message: string) => {
    setModalConfig({
      visible: true,
      title: t("ubahKataSandiScreen.alert.errorTitle"), // <-- Menggunakan t()
      message,
      type: "error",
    });
  };

  const handleSimpan = async () => {
    if (isSaving) return;
    setErrorVisible(false);

    if (!form.passwordLama || !form.passwordBaru || !form.konfirmasiPassword) {
      showCustomAlert(t("ubahKataSandiScreen.alert.missingFields"));
      return;
    }
    if (form.passwordBaru !== form.konfirmasiPassword) {
      setErrorVisible(true);
      return;
    }
    if (form.passwordBaru.length < 6) {
      showCustomAlert(t("ubahKataSandiScreen.alert.minLen"));
      return;
    }

    try {
      setIsSaving(true);
      const app = getApp();
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user?.email) {
        showCustomAlert(t("ubahKataSandiScreen.alert.invalidUser"));
        return;
      }

      const credential = EmailAuthProvider.credential(
        user.email,
        form.passwordLama,
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, form.passwordBaru);

      setForm({ passwordLama: "", passwordBaru: "", konfirmasiPassword: "" });
      router.replace("/main-menu/account");
    } catch (error: any) {
      const code = error?.code || "";
      if (
        code.includes("wrong-password") ||
        code.includes("invalid-credential")
      )
        showCustomAlert(t("ubahKataSandiScreen.alert.wrongCurrentPass"));
      else if (code.includes("weak-password"))
        showCustomAlert(t("ubahKataSandiScreen.alert.weakPass"));
      else if (code.includes("too-many-requests"))
        showCustomAlert(t("ubahKataSandiScreen.alert.tooManyRequests"));
      else showCustomAlert(t("ubahKataSandiScreen.alert.updateFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProfilePageLayout
      title={t("ubahKataSandiScreen.title")} // <-- Menggunakan t()
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.inputCard}>
            {PASSWORD_FIELDS.map(({ label, key }) => (
              <View key={key} style={styles.inputArea}>
                <Text style={styles.label}>{label}</Text>
                <View
                  style={[
                    styles.passwordContainer,
                    key === "konfirmasiPassword" &&
                      errorVisible &&
                      styles.inputErrorBorder,
                  ]}
                >
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="********"
                    placeholderTextColor="#999"
                    secureTextEntry={secure[key]}
                    value={form[key]}
                    onChangeText={(txt) => setForm({ ...form, [key]: txt })}
                    selectionColor="#1E6F9F"
                  />
                  <TouchableOpacity onPress={() => toggleSecure(key)}>
                    <Ionicons
                      name={secure[key] ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#888"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {errorVisible && (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={18}
                  color="#E11D48"
                />
                <Text style={styles.errorText}>
                  {t("ubahKataSandiScreen.errorMismatch")}{" "}
                  {/* <-- Menggunakan t() */}
                </Text>
              </View>
            )}

            <View style={styles.buttonWrapper}>
              <TouchableOpacity
                style={styles.btnBatal}
                onPress={() => router.back()}
              >
                <Text style={styles.btnTextBatal}>
                  {t("ubahKataSandiScreen.btnCancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSimpan}
                onPress={handleSimpan}
                disabled={isSaving}
              >
                <Text style={styles.btnTextSimpan}>
                  {isSaving
                    ? t("ubahKataSandiScreen.btnSaving")
                    : t("ubahKataSandiScreen.btnSave")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAwareScrollView>
      <CustomAlert
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={() => setModalConfig({ ...modalConfig, visible: false })}
      />
    </ProfilePageLayout>
  );
}
