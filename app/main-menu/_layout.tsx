import BottomNav from "@/components/ui/navigation";
import { ProfileProvider } from "@/features/main-menu/account/profile-context";
import {
  UserSessionProvider,
  useUserSession,
} from "@/features/main-menu/account/user-session-context";
import { useQuakeNotifications } from "@/hooks/use-quake-notifications";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, usePathname, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  InteractionManager,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  pengaturan: "AKUN",
  "ubah-kata-sandi": "AKUN",
  "ubah-lokasi": "AKUN",
  "ubah-bahasa": "AKUN",
  "tentang-aplikasi": "AKUN",
};

const MAIN_TAB_ROUTES = new Set(Object.values(ROUTE_MAP));
const NOTIFIKASI_PATH = "/main-menu/notifikasi";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUserSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/starter/login");
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  return <>{children}</>;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ProviderErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[ProviderErrorBoundary] Provider crash:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Ionicons name="warning-outline" size={48} color="#EF4444" />
          <View style={errorStyles.textContainer}>
            <View><Ionicons name="alert-circle-outline" size={16} color="#666" /></View>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    gap: 12,
  },
  textContainer: {
    alignItems: "center",
    gap: 4,
  },
});

function NotificationButton({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled: boolean;
}) {
  const { unreadCount } = useQuakeNotifications();

  return (
    <TouchableOpacity
      style={styles.notification}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Ionicons name="notifications-outline" size={22} color="#fff" />
      {unreadCount > 0 && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}


function MainLayoutInner() {
  const router = useRouter();
  const pathname = usePathname();

  const [isReady, setIsReady] = useState(false);
  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      if (isMounted.current) setIsReady(true);
    });
    return () => task.cancel();
  }, []);

  const insets = useSafeAreaInsets();
  const isOnNotifikasi = pathname === NOTIFIKASI_PATH;

  const handleOpenNotifications = () => {
    router.push(NOTIFIKASI_PATH);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top || 50 }]}>
      <View style={styles.logoRow}>
        <Image
          source={require("../../assets/images/SeismoTrack_2-removebg-preview.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />

        <NotificationButton
          onPress={handleOpenNotifications}
          disabled={isOnNotifikasi}
        />
      </View>

      <View style={styles.screenArea}>
        <Tabs
          backBehavior="fullHistory"
          screenOptions={({ route }) => ({
            headerShown: false,
            animation: "none",
            freezeOnBlur: true,
            lazy: !isReady || !MAIN_TAB_ROUTES.has(route.name),
          })}
          tabBar={({ state, navigation }) => {
            const currentRoute = state.routes[state.index]?.name ?? "";
            const active = TAB_MAP[currentRoute] ?? TAB_MAP["home"];

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
          <Tabs.Screen name="pengaturan" options={{ href: null }} />
          <Tabs.Screen name="ubah-kata-sandi" options={{ href: null }} />
          <Tabs.Screen name="ubah-lokasi" options={{ href: null }} />
          <Tabs.Screen name="ubah-bahasa" options={{ href: null }} />
          <Tabs.Screen name="tentang-aplikasi" options={{ href: null }} />
          <Tabs.Screen name="notifikasi" options={{ href: null }} />
          <Tabs.Screen
            name="filter-gempa-screen"
            options={{ href: null, animation: "shift" }}
          />
        </Tabs>
      </View>
    </View>
  );
}

export default function MainLayout() {
  return (
    <ProviderErrorBoundary>
      <UserSessionProvider>
        <ProfileProvider>
          <AuthGuard>
            <MainLayoutInner />
          </AuthGuard>
        </ProfileProvider>
      </UserSessionProvider>
    </ProviderErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
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
