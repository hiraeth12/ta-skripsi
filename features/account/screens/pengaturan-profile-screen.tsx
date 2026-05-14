import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { getDatabase, ref, update } from "@react-native-firebase/database";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import ProfilePageLayout from "../components/profile-page-layout";
import { useProfileContext } from "../profile-context";
import { styles } from "./styles/pengaturan-profil.styles";

export default function PengaturanProfil() {
  const router = useRouter();
  const { profile, setProfile } = useProfileContext();
  const [isSaving, setIsSaving] = useState(false);
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

    const first = tempForm.namaDepan.trim();
    const last = tempForm.namaBelakang.trim();

    if (!first) {
      Alert.alert("Error", "Nama depan wajib diisi");
      return;
    }

    try {
      setIsSaving(true);

      const app = getApp();
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) { Alert.alert("Error", "User belum login"); return; }

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
      setProfile((prev: typeof profile) => ({ ...prev, name: fullName, initials }));

      router.replace("/main-menu/account");
    } catch {
      Alert.alert("Error", "Gagal memperbarui profil");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProfilePageLayout
      title="Pengaturan Profil"
      headerName={profile.name}
      headerEmail={profile.email}
      headerLocation={profile.location}
      headerInitials={profile.initials}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.inputCard}>
          <View style={styles.inputArea}>
            <Text style={styles.label}>Nama Depan</Text>
            <TextInput
              style={styles.input}
              value={tempForm.namaDepan}
              onChangeText={(txt) => setTempForm({ ...tempForm, namaDepan: txt })}
              selectionColor="#1E6F9F"
            />
          </View>

          <View style={styles.inputArea}>
            <Text style={styles.label}>Nama Belakang</Text>
            <TextInput
              style={styles.input}
              value={tempForm.namaBelakang}
              onChangeText={(txt) => setTempForm({ ...tempForm, namaBelakang: txt })}
              selectionColor="#1E6F9F"
            />
          </View>

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