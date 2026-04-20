import { ACCOUNT_PROFILE, fetchProfileFromFirebase, ProfileData } from "../data/profile";
import ProfilePageLayout from "../components/profile-page-layout";
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
      } catch (error) {
        console.error("Failed to load Firebase profile:", error);
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
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "bold" },
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
  scrollContent: { paddingBottom: 20 },

  inputCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inputArea: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: "bold", color: "#000", marginBottom: 5 },

  // STYLE CONTAINER PASSWORD (SEPERTI YANG KAMU MAU)
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    color: "#333",
  },
  inputErrorBorder: { borderBottomColor: "#E11D48" },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: { color: "#E11D48", fontSize: 11, marginLeft: 8, flex: 1 },

  buttonWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  btnBatal: {
    flex: 1,
    marginRight: 10,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D1D1",
    alignItems: "center",
  },
  btnSimpan: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#1E6F9F",
    alignItems: "center",
  },
  btnTextBatal: { color: "#999", fontWeight: "bold" },
  btnTextSimpan: { color: "#fff", fontWeight: "bold" },
});


