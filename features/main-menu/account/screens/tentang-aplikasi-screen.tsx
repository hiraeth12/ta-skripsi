import { useRouter } from "expo-router";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { goBackToAccount } from "../navigation";
import ProfilePageLayout from "../components/profile-page-layout";
import { useProfileContext } from "../profile-context";
import { styles } from "./styles/tentang-aplikasi.styles";
import { useTranslation } from "react-i18next";

export default function TentangAplikasi() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile } = useProfileContext(); // ← no local fetch

  return (
    <ProfilePageLayout
      title={t("tentangAplikasiScreen.title")}
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
              <Text style={{ fontWeight: "bold" }}>SeismoTrack</Text>{t("tentangAplikasiScreen.desc1")}
            </Text>
            <Text style={styles.description}>{t("tentangAplikasiScreen.desc2")}</Text>
            <Text style={styles.description}>
              {t("tentangAplikasiScreen.desc3_1")}<Text style={{ fontWeight: "bold" }}>Jawa Barat</Text>{t("tentangAplikasiScreen.desc3_2")}
            </Text>
            <Text style={styles.description}>
              {t("tentangAplikasiScreen.desc4_1")}<Text style={{ fontWeight: "bold" }}>BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)</Text>{t("tentangAplikasiScreen.desc4_2")}
            </Text>

            <Image source={require("@/assets/images/logo-bmkg-2010.png")} style={[styles.appLogo, { marginTop: 10 }]} resizeMode="contain" />
            <View style={styles.versionContainer}>
              <Text style={styles.versionLabel}>{t("tentangAplikasiScreen.versionLabel")}</Text>
            </View>
          </ScrollView>
        </View>
      </View>

      <TouchableOpacity style={styles.btnBack} onPress={() => goBackToAccount(router)}>
        <Text style={styles.btnTextBack}>{t("tentangAplikasiScreen.btnBack")}</Text>
      </TouchableOpacity>
    </ProfilePageLayout>
  );
}
