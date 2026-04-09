import BottomNav from "@/components/ui/navigation";
import { Ionicons } from "@expo/vector-icons";
import { Stack, usePathname, useRouter } from "expo-router";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";

export default function MainLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const routeMap: Record<string, string> = {
    HOME: "/main-menu/home",
    GEMPA: "/main-menu/earthquake",
    RIWAYAT: "/main-menu/history",
    AKUN: "/main-menu/account",
  };

  // 1. Cek apakah saat ini sedang berada di halaman notifikasi
  const isNotifPage = pathname === "/main-menu/notifikasi";

  // 2. Logic Active Tab: Jika di halaman notifikasi, set ke "NONE" agar garis indikator mati
  const activeTab = isNotifPage
    ? "NONE"
    : (Object.entries(routeMap).find(([, path]) => pathname === path)?.[0] ??
      "HOME");

  const handleTabChange = (tab: string) => {
    router.push(routeMap[tab] as any);
  };

  return (
    <View style={styles.container}>
      
      <View style={styles.logoRow}>
        <Image
          source={require("../../assets/images/SeismoTrack_2-removebg-preview.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />

        <TouchableOpacity
          style={styles.notification}
          onPress={() => router.push("/main-menu/notifikasi")}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* SCREEN CONTENT */}
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "none",
          }}
        />
      </View>

      {/* BOTTOM NAV - Akan menerima active="NONE" jika di halaman notifikasi */}
      <BottomNav active={activeTab} onChange={handleTabChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingTop: 50,
    paddingBottom: 7,
  },
  logoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  logoImage: {
    width: 125,
    height: 41,
  },
  notification: {
    backgroundColor: "#1E6F9F",
    padding: 10,
    borderRadius: 10,
  },
});
