import BottomNav from "@/components/ui/navigation";
import { ProfileProvider } from "@/features/account/profile-context";
import { UserSessionProvider } from "@/features/account/user-session-context";
import { useQuakeNotifications } from "@/hooks/use-quake-notifications";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  InteractionManager,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const ROUTE_MAP: Record<string, string> = {
  HOME: "home",
  GEMPA: "earthquake",
  RIWAYAT: "history",
  AKUN: "account",
};

const TAB_MAP: Record<string, string> = {
  home: "HOME",
  earthquake: "GEMPA",
  history: "RIWAYAT",
  account: "AKUN",
};
const MAIN_TAB_ROUTES = new Set(Object.values(ROUTE_MAP));

function NotificationButton({
  pathname,
  onPress,
}: {
  pathname: string;
  onPress: () => void;
}) {
  const { unreadCount } = useQuakeNotifications();

  return (
    <TouchableOpacity
      style={styles.notification}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={pathname === "/main-menu/notifikasi"}
    >
      <Ionicons name="notifications-outline" size={22} color="#fff" />
      {unreadCount > 0 && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function MainLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [notificationsReady, setNotificationsReady] = useState(false);
  const [preloadTabs, setPreloadTabs] = useState(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setNotificationsReady(true);
      setPreloadTabs(true);
    });
    return () => task.cancel();
  }, []);

  const handleOpenNotifications = () => {
    if (pathname === "/main-menu/notifikasi") return;
    router.push("/main-menu/notifikasi");
  };

  return (
    <UserSessionProvider>
      <ProfileProvider>
        <View style={styles.container}>
          <View style={styles.logoRow}>
            <Image
              source={require("../../assets/images/SeismoTrack_2-removebg-preview.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />

            {notificationsReady ? (
              <NotificationButton
                pathname={pathname}
                onPress={handleOpenNotifications}
              />
            ) : (
              <TouchableOpacity
                style={styles.notification}
                onPress={handleOpenNotifications}
                activeOpacity={0.7}
              >
                <Ionicons name="notifications-outline" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.screenArea}>
            <Tabs
              screenOptions={({ route }) => ({
                headerShown: false,
                animation: "none",
                freezeOnBlur: true,
                lazy: !preloadTabs || !MAIN_TAB_ROUTES.has(route.name),
              })}
              tabBar={({ state, navigation }) => {
                const currentRoute = state.routes[state.index]?.name ?? "";
                const active = TAB_MAP[currentRoute] ?? "NONE";

                return (
                  <BottomNav
                    active={active}
                    onChange={(tab) => {
                      const routeName = ROUTE_MAP[tab];
                      if (!routeName || routeName === currentRoute) return;
                      navigation.navigate(routeName as never);
                    }}
                  />
                );
              }}
            >
              <Tabs.Screen name="home" options={{ href: "/main-menu/home" }} />
              <Tabs.Screen
                name="earthquake"
                options={{ href: "/main-menu/earthquake" }}
              />
              <Tabs.Screen
                name="history"
                options={{ href: "/main-menu/history" }}
              />
              <Tabs.Screen
                name="account"
                options={{ href: "/main-menu/account" }}
              />
              <Tabs.Screen name="notifikasi" options={{ href: null }} />
              <Tabs.Screen
                name="filter-gempa-screen"
                options={{ href: null, animation: "shift" }}
              />
            </Tabs>
          </View>
        </View>
      </ProfileProvider>
    </UserSessionProvider>
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
  screenArea: {
    flex: 1,
  },
});
