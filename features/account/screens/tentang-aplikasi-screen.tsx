import { ACCOUNT_PROFILE, fetchProfileFromFirebase, ProfileData } from "../data/profile";
import ProfilePageLayout from "../components/profile-page-layout";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
      } catch (error) {
        console.error("Failed to load Firebase profile:", error);
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
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "bold" },
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
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 5,
  },
  userDetails: { fontSize: 14, color: "#555", marginBottom: 2 },

  menuContainer: {
    flex: 1,
    backgroundColor: "#0C4A6E", // Warna biru gelap konsisten
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  menuContent: { paddingHorizontal: 20, paddingTop: 20, flex: 1 },
  titleRow: { marginBottom: 15 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },

  // STYLING KARTU INFORMASI
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  appLogo: {
    width: 180,
    height: 50,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 5,
    fontWeight: "500",
  },
  versionContainer: {
    marginTop: 10,
  },
  versionLabel: {
    fontSize: 14,
    color: "#999",
    fontWeight: "bold",
  },

  // BACK BUTTON
  btnBack: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fff",
    alignItems: "center",
  },
  btnTextBack: { color: "#fff", fontWeight: "bold" },
});


