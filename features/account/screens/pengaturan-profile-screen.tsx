import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { getDatabase, ref, update } from "@react-native-firebase/database";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ProfilePageLayout from "../components/profile-page-layout";
import {
  ACCOUNT_PROFILE,
  fetchProfileFromFirebase,
  ProfileData,
} from "../data/profile";
import { styles } from "./styles/pengaturan-profil.styles";

export default function PengaturanProfil() {
  const router = useRouter();
  const [headerProfile, setHeaderProfile] =
    useState<ProfileData>(ACCOUNT_PROFILE);
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

        const [firstName = "", ...rest] = (firebaseProfile.name || "").split(
          " ",
        );
        const lastName = rest.join(" ");
        const nextProfile = {
          namaDepan: firstName,
          namaBelakang: lastName,
          email: firebaseProfile.email || "",
        };
        setProfile(nextProfile);
        setTempForm(nextProfile);
      } catch {
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
    } catch {
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
