import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import {
    EmailAuthProvider,
    getAuth,
    reauthenticateWithCredential,
    updatePassword,
} from "@react-native-firebase/auth";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import ProfilePageLayout from "../components/profile-page-layout";
import { ACCOUNT_PROFILE, fetchProfileFromFirebase, ProfileData } from "../data/profile";
import { styles } from "./styles/ubah-kata-sandi-styles";

export default function UbahKataSandi() {
  const router = useRouter();
  const [errorVisible, setErrorVisible] = useState(false);
  const [profile, setProfile] = useState<ProfileData>(ACCOUNT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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

  // State untuk kontrol mata (Show/Hide)
  const [secureLama, setSecureLama] = useState(true);
  const [secureBaru, setSecureBaru] = useState(true);
  const [secureKonf, setSecureKonf] = useState(true);

  const [form, setForm] = useState({
    passwordLama: "",
    passwordBaru: "",
    konfirmasiPassword: "",
  });

  const handleSimpan = async () => {
    if (isSaving) return;

    setErrorVisible(false);

    if (!form.passwordLama || !form.passwordBaru || !form.konfirmasiPassword) {
      Alert.alert("Error", "Semua field kata sandi wajib diisi");
      return;
    }

    if (form.passwordBaru !== form.konfirmasiPassword) {
      setErrorVisible(true);
      return;
    }

    if (form.passwordBaru.length < 6) {
      Alert.alert("Error", "Kata sandi baru minimal 6 karakter");
      return;
    }

    try {
      setIsSaving(true);

      const app = getApp();
      const auth = getAuth(app);
      const currentUser = auth.currentUser;

      if (!currentUser || !currentUser.email) {
        Alert.alert("Error", "User tidak valid, silakan login ulang");
        return;
      }

      const credential = EmailAuthProvider.credential(
        currentUser.email,
        form.passwordLama,
      );

      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, form.passwordBaru);

      setForm({
        passwordLama: "",
        passwordBaru: "",
        konfirmasiPassword: "",
      });

      router.replace("/main-menu/account");
    } catch (error: any) {
      const code = error?.code || "";
      if (code.includes("wrong-password") || code.includes("invalid-credential")) {
        Alert.alert("Error", "Kata sandi saat ini salah");
      } else if (code.includes("weak-password")) {
        Alert.alert("Error", "Kata sandi baru terlalu lemah");
      } else if (code.includes("too-many-requests")) {
        Alert.alert("Error", "Terlalu banyak percobaan, coba lagi nanti");
      } else {
        Alert.alert("Error", "Gagal memperbarui kata sandi");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <ProfilePageLayout
        title="Ubah Kata Sandi"
        headerName={profile.name}
        headerEmail={profile.email}
        headerLocation={profile.location}
        headerInitials={profile.initials}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.inputCard}>
              {/* Input Kata Sandi Lama */}
              <View style={styles.inputArea}>
                <Text style={styles.label}>Kata Sandi Saat Ini</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="********"
                    placeholderTextColor="#999"
                    secureTextEntry={secureLama}
                    value={form.passwordLama}
                    onChangeText={(txt) =>
                      setForm({ ...form, passwordLama: txt })
                    }
                    selectionColor="#1E6F9F"
                  />
                  <TouchableOpacity onPress={() => setSecureLama(!secureLama)}>
                    <Ionicons
                      name={secureLama ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#888"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Input Kata Sandi Baru */}
              <View style={styles.inputArea}>
                <Text style={styles.label}>Kata Sandi Baru</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="********"
                    placeholderTextColor="#999"
                    secureTextEntry={secureBaru}
                    value={form.passwordBaru}
                    onChangeText={(txt) =>
                      setForm({ ...form, passwordBaru: txt })
                    }
                    selectionColor="#1E6F9F"
                  />
                  <TouchableOpacity onPress={() => setSecureBaru(!secureBaru)}>
                    <Ionicons
                      name={secureBaru ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#888"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Input Konfirmasi Kata Sandi */}
              <View style={styles.inputArea}>
                <Text style={styles.label}>Konfirmasi Kata Sandi</Text>
                <View
                  style={[
                    styles.passwordContainer,
                    errorVisible && styles.inputErrorBorder,
                  ]}
                >
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="********"
                    placeholderTextColor="#999"
                    secureTextEntry={secureKonf}
                    value={form.konfirmasiPassword}
                    onChangeText={(txt) =>
                      setForm({ ...form, konfirmasiPassword: txt })
                    }
                    selectionColor="#1E6F9F"
                  />
                  <TouchableOpacity onPress={() => setSecureKonf(!secureKonf)}>
                    <Ionicons
                      name={secureKonf ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#888"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {errorVisible && (
                <View style={styles.errorBox}>
                  <MaterialCommunityIcons
                    name="alert-circle"
                    size={18}
                    color="#E11D48"
                  />
                  <Text style={styles.errorText}>
                    Kata sandi baru dan konfirmasi tidak cocok
                  </Text>
                </View>
              )}

            <View style={styles.buttonWrapper}>
              <TouchableOpacity
                style={styles.btnBatal}
                onPress={() => router.back()}
              >
                <Text style={styles.btnTextBatal}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSimpan}
                onPress={handleSimpan}
                disabled={isSaving}
              >
                <Text style={styles.btnTextSimpan}>
                  {isSaving ? "Menyimpan..." : "Simpan"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </ProfilePageLayout>
    </>
  );
}
