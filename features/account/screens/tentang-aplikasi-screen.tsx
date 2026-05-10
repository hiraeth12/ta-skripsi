// TentangAplikasi.tsx
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import ProfilePageLayout from "../components/profile-page-layout";
import { ACCOUNT_PROFILE, fetchProfileFromFirebase, ProfileData } from "../data/profile";

// Import styles yang sudah dipisah
import { styles } from "./styles/tentang-aplikasi.styles";

export default function TentangAplikasi() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData>(ACCOUNT_PROFILE);
  const [loading, setLoading] = useState(true);

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

  return (
    <ProfilePageLayout
      title="Tentang Aplikasi"
      headerName={profile.name}
      headerEmail={profile.email}
      headerLocation={profile.location}
      headerInitials={profile.initials}
    >
      {/* Kartu Informasi Aplikasi */}
      <View style={styles.infoCard}>
        <Image
          source={require("@/assets/images/SeismoTrack_2-removebg-preview.png")}
          style={styles.appLogo}
          resizeMode="contain"
        />

        <Text style={styles.description}>
          SeismoTrack adalah aplikasi informasi gempa bumi real-time untuk
          wilayah Jawa Barat.
        </Text>

        <Text style={styles.description}>
          Data gempa bersumber dari BMKG dan dapat disesuaikan dengan lokasi
          pengguna melalui mode GPS.
        </Text>

        <View style={styles.versionContainer}>
          <Text style={styles.versionLabel}>Versi: 1.0</Text>
        </View>
      </View>

      {/* Tombol Kembali (Opsional, agar user mudah navigasi) */}
      <TouchableOpacity
        style={styles.btnBack}
        onPress={() => router.back()}
      >
        <Text style={styles.btnTextBack}>Kembali</Text>
      </TouchableOpacity>
    </ProfilePageLayout>
  );
}