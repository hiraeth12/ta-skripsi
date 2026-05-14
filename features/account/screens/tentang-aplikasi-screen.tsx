import { useRouter } from "expo-router";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import ProfilePageLayout from "../components/profile-page-layout";
import { useProfileContext } from "../profile-context";
import { styles } from "./styles/tentang-aplikasi.styles";

export default function TentangAplikasi() {
  const router = useRouter();
  const { profile } = useProfileContext(); // ← no local fetch

  return (
    <ProfilePageLayout
      title="Tentang Aplikasi"
      headerName={profile.name}
      headerEmail={profile.email}
      headerLocation={profile.location}
      headerInitials={profile.initials}
    >
      <View style={styles.mainContentContainer}>
        <View style={styles.infoCard}>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Image source={require("@/assets/images/SeismoTrack_2-removebg-preview.png")} style={styles.appLogo} resizeMode="contain" />

            <Text style={styles.description}>
              <Text style={{ fontWeight: "bold" }}>SeismoTrack</Text> adalah platform pemantauan aktivitas seismik mutakhir yang dirancang khusus untuk memetakan data gempa bumi secara real-time di seluruh wilayah Indonesia.
            </Text>
            <Text style={styles.description}>
              Aplikasi ini hadir sebagai solusi mitigasi bencana dini, memberikan kemudahan bagi masyarakat untuk mengakses informasi parameter gempa seperti magnitudo, kedalaman, dan koordinat secara instan.
            </Text>
            <Text style={styles.description}>
              Fitur unggulan kami mencakup sistem notifikasi alarm otomatis berbasis lokasi (GPS). Saat ini, fitur peringatan dini dioptimalkan khusus untuk wilayah <Text style={{ fontWeight: "bold" }}>Jawa Barat</Text> guna memastikan akurasi data yang lebih presisi.
            </Text>
            <Text style={styles.description}>
              Seluruh data yang disajikan bersumber langsung dari <Text style={{ fontWeight: "bold" }}>BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)</Text> sebagai otoritas resmi, sehingga informasi yang Anda terima terjamin keakuratannya.
            </Text>

            <Image source={require("@/assets/images/logo-bmkg-2010.png")} style={[styles.appLogo, { marginTop: 10 }]} resizeMode="contain" />
            <View style={styles.versionContainer}>
              <Text style={styles.versionLabel}>Versi: 1.0.0</Text>
            </View>
          </ScrollView>
        </View>
      </View>

      <TouchableOpacity style={styles.btnBack} onPress={() => router.back()}>
        <Text style={styles.btnTextBack}>Kembali</Text>
      </TouchableOpacity>
    </ProfilePageLayout>
  );
}