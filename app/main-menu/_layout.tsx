import BottomNav from "@/components/ui/navigation";
import { useQuakeNotifications } from "@/hooks/use-quake-notifications";
import { Ionicons } from "@expo/vector-icons";
import { Stack, usePathname, useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";

const ROUTE_MAP: Record<string, string> = {
  HOME: "/main-menu/home",
  GEMPA: "/main-menu/earthquake",
  RIWAYAT: "/main-menu/history",
  AKUN: "/main-menu/account",
};

export default function MainLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useQuakeNotifications();

  // 1. Cek apakah saat ini sedang berada di halaman notifikasi
  const isNotifPage = pathname === "/main-menu/notifikasi";

  // 2. Logic Active Tab: Jika di halaman notifikasi, set ke "NONE" agar garis indikator mati
  const activeTab = useMemo(
    () =>
      isNotifPage
        ? "NONE"
        : (Object.entries(ROUTE_MAP).find(([, path]) => pathname === path)?.[0] ??
          "HOME"),
    [isNotifPage, pathname],
  );

  const handleTabChange = useCallback(
    (tab: string) => {
      const targetRoute = ROUTE_MAP[tab];
      if (!targetRoute || targetRoute === pathname) return;
      // Replace avoids stacking tab routes and keeps transitions lighter.
      router.replace(targetRoute as any);
    },
    [pathname, router],
  );

  const handleOpenNotifications = useCallback(() => {
    if (pathname === "/main-menu/notifikasi") return;
    router.push("/main-menu/notifikasi");
  }, [pathname, router]);

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
          onPress={handleOpenNotifications}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color="#fff" />
          {unreadCount > 0 && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      </View>

      {/* SCREEN CONTENT */}
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "none",
            freezeOnBlur: true,
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
