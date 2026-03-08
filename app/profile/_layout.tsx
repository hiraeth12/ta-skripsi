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

  const activeTab =
    Object.entries(routeMap).find(([, path]) => pathname === path)?.[0] ??
    "HOME";

  const handleTabChange = (tab: string) => {
    router.push(routeMap[tab] as any);
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.logoRow}>
        <Image
          source={require("../../assets/images/SeismoTrack_2-removebg-preview.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />

        <TouchableOpacity style={styles.notification}>
          <Ionicons name="notifications-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* SCREEN CONTENT */}
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "fade",
          }}
        />
      </View>

      {/* BOTTOM NAV */}
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
