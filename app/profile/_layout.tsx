import BottomNav from "@/components/ui/navigation";
import { useQuakeNotifications } from "@/hooks/use-quake-notifications";
import { Ionicons } from "@expo/vector-icons";
import { Stack, usePathname, useRouter } from "expo-router";
import { useCallback } from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { ProfileProvider } from "@/features/account/profile-context";

export default function MainLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useQuakeNotifications();

  const routeMap: Record<string, string> = {
    HOME: "/main-menu/home",
    GEMPA: "/main-menu/earthquake",
    RIWAYAT: "/main-menu/history",
    AKUN: "/main-menu/account",
  };

  const activeTab =
    Object.entries(routeMap).find(([, path]) => pathname === path)?.[0] ??
    "AKUN";

  const handleTabChange = (tab: string) => {
    router.push(routeMap[tab] as any);
  };

  const handleOpenNotifications = useCallback(() => {
    if (pathname === "/main-menu/notifikasi") return;
    router.push("/main-menu/notifikasi");
  }, [pathname, router]);

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.logoRow}>
        <Image
          source={require("../../assets/images/SeismoTrack_2-removebg-preview.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />

        <TouchableOpacity
          style={styles.notification}
          onPress={handleOpenNotifications}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color="#fff" />
          {unreadCount > 0 && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      </View>

      {/* SCREEN CONTENT */}
      <View style={{ flex: 1 }}>
        <ProfileProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "fade",
            }}
          />
        </ProfileProvider>
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
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: "#EF4444",
    borderWidth: 1,
    borderColor: "#ffffff",
  },
});
