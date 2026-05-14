import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import { EmailAuthProvider, getAuth, reauthenticateWithCredential, updatePassword } from "@react-native-firebase/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import ProfilePageLayout from "../components/profile-page-layout";
import { useProfileContext } from "../profile-context";
import { styles } from "./styles/ubah-kata-sandi-styles";

const PASSWORD_FIELDS = [
  { label: "Kata Sandi Saat Ini", key: "passwordLama" },
  { label: "Kata Sandi Baru", key: "passwordBaru" },
  { label: "Konfirmasi Kata Sandi", key: "konfirmasiPassword" },
] as const;

export default function UbahKataSandi() {
  const router = useRouter();
  const { profile } = useProfileContext(); // ← no local fetch

  const [errorVisible, setErrorVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [secure, setSecure] = useState({ passwordLama: true, passwordBaru: true, konfirmasiPassword: true });
  const [form, setForm] = useState({ passwordLama: "", passwordBaru: "", konfirmasiPassword: "" });

  const toggleSecure = (key: keyof typeof secure) =>
    setSecure((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSimpan = async () => {
    if (isSaving) return;
    setErrorVisible(false);

    if (!form.passwordLama || !form.passwordBaru || !form.konfirmasiPassword) {
      Alert.alert("Error", "Semua field kata sandi wajib diisi");
      return;
    }
    if (form.passwordBaru !== form.konfirmasiPassword) { setErrorVisible(true); return; }
    if (form.passwordBaru.length < 6) { Alert.alert("Error", "Kata sandi baru minimal 6 karakter"); return; }

    try {
      setIsSaving(true);
      const app = getApp();
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user?.email) { Alert.alert("Error", "User tidak valid, silakan login ulang"); return; }

      const credential = EmailAuthProvider.credential(user.email, form.passwordLama);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, form.passwordBaru);

      setForm({ passwordLama: "", passwordBaru: "", konfirmasiPassword: "" });
      router.replace("/main-menu/account");
    } catch (error: any) {
      const code = error?.code || "";
      if (code.includes("wrong-password") || code.includes("invalid-credential"))
        Alert.alert("Error", "Kata sandi saat ini salah");
      else if (code.includes("weak-password"))
        Alert.alert("Error", "Kata sandi baru terlalu lemah");
      else if (code.includes("too-many-requests"))
        Alert.alert("Error", "Terlalu banyak percobaan, coba lagi nanti");
      else
        Alert.alert("Error", "Gagal memperbarui kata sandi");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProfilePageLayout
      title="Ubah Kata Sandi"
      headerName={profile.name}
      headerEmail={profile.email}
      headerLocation={profile.location}
      headerInitials={profile.initials}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.inputCard}>
          {PASSWORD_FIELDS.map(({ label, key }) => (
            <View key={key} style={styles.inputArea}>
              <Text style={styles.label}>{label}</Text>
              <View style={[
                styles.passwordContainer,
                key === "konfirmasiPassword" && errorVisible && styles.inputErrorBorder,
              ]}>
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
                  <Ionicons name={secure[key] ? "eye-off-outline" : "eye-outline"} size={20} color="#888" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {errorVisible && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle" size={18} color="#E11D48" />
              <Text style={styles.errorText}>Kata sandi baru dan konfirmasi tidak cocok</Text>
            </View>
          )}

          <View style={styles.buttonWrapper}>
            <TouchableOpacity style={styles.btnBatal} onPress={() => router.back()}>
              <Text style={styles.btnTextBatal}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSimpan} onPress={handleSimpan} disabled={isSaving}>
              <Text style={styles.btnTextSimpan}>{isSaving ? "Menyimpan..." : "Simpan"}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </ProfilePageLayout>
  );
}