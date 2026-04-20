import { ACCOUNT_PROFILE, fetchProfileFromFirebase, ProfileData } from "../data/profile";
import ProfilePageLayout from "../components/profile-page-layout";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { getDatabase, ref, update } from "@react-native-firebase/database";
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

export default function PengaturanProfil() {
  const router = useRouter();
  const [headerProfile, setHeaderProfile] = useState<ProfileData>(ACCOUNT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // State Utama (Data yang tampil di Header)
  const [profile, setProfile] = useState({
    namaDepan: "",
    namaBelakang: "",
    email: "",
  });

  // State Sementara (Untuk Input Field agar data di header tidak langsung berubah)
  const [tempForm, setTempForm] = useState({
    namaDepan: "",
    namaBelakang: "",
    email: "",
  });

  // Fetch profile from Firebase on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const firebaseProfile = await fetchProfileFromFirebase();
        setHeaderProfile(firebaseProfile);

        const [firstName = "", ...rest] = (firebaseProfile.name || "").split(" ");
        const lastName = rest.join(" ");
        const nextProfile = {
          namaDepan: firstName,
          namaBelakang: lastName,
          email: firebaseProfile.email || "",
        };
        setProfile(nextProfile);
        setTempForm(nextProfile);
      } catch (error) {
        console.error("Failed to load Firebase profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSimpan = async () => {
    if (isSaving) return;

    const firstName = tempForm.namaDepan.trim();
    const lastName = tempForm.namaBelakang.trim();

    if (!firstName) {
      Alert.alert("Error", "Nama depan wajib diisi");
      return;
    }

    try {
      setIsSaving(true);

      const app = getApp();
      const authInstance = getAuth(app);
      const currentUser = authInstance.currentUser;

      if (!currentUser) {
        Alert.alert("Error", "User belum login");
        return;
      }

      const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
      const database = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);

      await update(ref(database, `users/${currentUser.uid}`), {
        firstName,
        lastName,
        profileUpdatedAt: new Date().toISOString(),
      });

      const fullName = `${firstName} ${lastName}`.trim();
      const initials = fullName
        .split(" ")
        .slice(0, 3)
        .map((word) => word.charAt(0).toUpperCase())
        .join("");

      setProfile({ ...tempForm, namaDepan: firstName, namaBelakang: lastName });
      setHeaderProfile((prev) => ({ ...prev, name: fullName, initials }));

      router.replace("/main-menu/account");
    } catch (error) {
      console.error("Failed to update profile:", error);
      Alert.alert("Error", "Gagal memperbarui profil");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <ProfilePageLayout
        title="Pengaturan Profil"
        headerName={headerProfile.name}
        headerEmail={headerProfile.email}
        headerLocation={headerProfile.location}
        headerInitials={headerProfile.initials}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.inputCard}>
              {/* Input Area Selaras dengan style Starter */}
              <View style={styles.inputArea}>
                <Text style={styles.label}>Nama Depan</Text>
                <TextInput
                  style={styles.input}
                  value={tempForm.namaDepan}
                  onChangeText={(txt) =>
                    setTempForm({ ...tempForm, namaDepan: txt })
                  }
                  selectionColor="#1E6F9F"
                />
              </View>

              <View style={styles.inputArea}>
                <Text style={styles.label}>Nama Belakang</Text>
                <TextInput
                  style={styles.input}
                  value={tempForm.namaBelakang}
                  onChangeText={(txt) =>
                    setTempForm({ ...tempForm, namaBelakang: txt })
                  }
                  selectionColor="#1E6F9F"
                />
              </View>

            {/* Action Buttons Selaras */}
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
  menuContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    flex: 1,
  },
  titleRow: { marginBottom: 15 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  scrollContent: { paddingBottom: 20 },

  // INPUT CARD - Diselaraskan dengan MenuItem di Account.tsx
  inputCard: {
    backgroundColor: "#fff",
    borderRadius: 12, // Selaras dengan MenuItem
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inputArea: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: "bold", color: "#000", marginBottom: 5 },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    paddingVertical: 8,
    fontSize: 14,
    color: "#333",
  },

  // BUTTONS
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


