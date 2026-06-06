import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { get, getDatabase, ref, remove } from "@react-native-firebase/database";
import { deleteToken, getMessaging } from "@react-native-firebase/messaging";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Skeleton from "@/components/ui/skeleton";
import { saveFcmTokenToDatabase } from "@/utils/fcm";
import { PUSH_NOTIFICATION_PREF_KEY } from "../components/handle-logout";
import ProfilePageLayout from "../components/profile-page-layout";
import { useProfileContext } from "../profile-context";
import { styles } from "./styles/account-styles";

export default function Account() {
  const router = useRouter();
  const { profile, loading } = useProfileContext();
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [isToggleProcessing, setIsToggleProcessing] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifStatus, setNotifStatus] = useState(true);
  const isNavigating = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrateNotificationPreference() {
      try {
        const app = getApp();
        const auth = getAuth(app);
        const user = auth.currentUser;
        const saved = await AsyncStorage.getItem(PUSH_NOTIFICATION_PREF_KEY);

        if (!user) {
          if (isMounted && saved !== null) {
            setIsNotificationsEnabled(saved === "true");
          }
          return;
        }

        const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
        const db = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);
        const snap = await get(ref(db, `user_fcm_tokens/${user.uid}`));
        const hasSavedToken = snap.exists();

        if (hasSavedToken) {
          await AsyncStorage.setItem(PUSH_NOTIFICATION_PREF_KEY, "true");
        }

        if (!isMounted) return;
        setIsNotificationsEnabled(
          hasSavedToken || saved === null || saved === "true",
        );
      } catch {
        if (isMounted) {
          setIsNotificationsEnabled(true);
        }
      }
    }

    hydrateNotificationPreference();

    return () => {
      isMounted = false;
    };
  }, []);

  const navigate = (path: string) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    router.push(path as any);
    setTimeout(() => {
      isNavigating.current = false;
    }, 600);
  };

  const handleToggleNotification = async (value: boolean) => {
    const app = getApp();
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return;

    const previous = isNotificationsEnabled;
    setIsToggleProcessing(true);
    setIsNotificationsEnabled(value);

    try {
      if (value) {
        const token = await saveFcmTokenToDatabase(user.uid);
        if (token) {
          setNotifStatus(true);
          await AsyncStorage.setItem(PUSH_NOTIFICATION_PREF_KEY, "true");
          setShowNotifModal(true);
        } else {
          setIsNotificationsEnabled(previous);
          setNotifStatus(previous);
        }
      } else {
        const messaging = getMessaging(app);
        await deleteToken(messaging);
        const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
        const db = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);
        await remove(ref(db, `user_fcm_tokens/${user.uid}`));
        setNotifStatus(false);
        await AsyncStorage.setItem(PUSH_NOTIFICATION_PREF_KEY, "false");
        setShowNotifModal(true);
      }
    } catch {
      setIsNotificationsEnabled(previous);
      setNotifStatus(previous);
    } finally {
      setIsToggleProcessing(false);
    }
  };

  // ── Loading skeleton (only shown on the very first app open) ───────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
        <View
          style={{
            backgroundColor: "#0C4A6E",
            paddingVertical: 40,
            alignItems: "center",
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
          }}
        >
          <Skeleton
            width={90}
            height={90}
            borderRadius={45}
            style={{ marginBottom: 16 }}
          />
          <Skeleton
            width={160}
            height={20}
            borderRadius={6}
            style={{ marginBottom: 8 }}
          />
          <Skeleton width={200} height={14} borderRadius={4} />
        </View>
        <View style={styles.loadingMenuList}>
          {[...Array(6)].map((_, i) => (
            <View key={i} style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <View style={styles.iconWrapper}>
                  <Skeleton width={25} height={25} borderRadius={12.5} />
                </View>
                <Skeleton
                  width={140}
                  height={16}
                  borderRadius={6}
                  style={{ marginLeft: 12 }}
                />
              </View>
              <Skeleton width={16} height={16} borderRadius={4} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <>
      <ProfilePageLayout
        headerName={profile.name}
        headerEmail={profile.email}
        headerLocation={profile.location}
        headerInitials={profile.initials}
      >
        <ScrollView
          style={styles.menuScroll}
          contentContainerStyle={styles.menuScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <MenuLink
            icon="account-circle-outline"
            title="Pengaturan Profil"
            onPress={() => navigate("/main-menu/pengaturan")}
          />
          <MenuLink
            icon="lock-outline"
            title="Ubah Kata Sandi"
            onPress={() => navigate("/main-menu/ubah-kata-sandi")}
          />
          <MenuLink
            icon="map-marker-outline"
            title="Ubah Lokasi"
            onPress={() => navigate("/main-menu/ubah-lokasi")}
          />
          <MenuLink
            icon="earth"
            title="Ubah Bahasa"
            onPress={() => navigate("/main-menu/ubah-bahasa")}
          />

          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={styles.iconWrapper}>
                <Ionicons
                  name="notifications-outline"
                  size={25}
                  color="#1E6F9F"
                />
              </View>
              <Text style={styles.menuText} numberOfLines={1}>
                Notifikasi Push
              </Text>
            </View>
            <View style={styles.menuRightControl}>
              <Switch
                trackColor={{ false: "#D1D1D1", true: "#B2D8EC" }}
                thumbColor={isNotificationsEnabled ? "#1E6F9F" : "#f4f3f4"}
                onValueChange={handleToggleNotification}
                value={isNotificationsEnabled}
                disabled={isToggleProcessing}
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>
          </View>

          <MenuLink
            icon="cellphone-information"
            title="Tentang Aplikasi"
            onPress={() => navigate("/main-menu/tentang-aplikasi")}
          />
        </ScrollView>
      </ProfilePageLayout>

      <Modal visible={showNotifModal} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowNotifModal(false)}
        >
          <View style={styles.infoCard}>
            <Ionicons
              name={notifStatus ? "notifications" : "notifications-off"}
              size={40}
              color="#1E6F9F"
              style={styles.modalIcon}
            />
            <Text style={styles.infoTitle}>
              Notifikasi {notifStatus ? "Aktif" : "Nonaktif"}
            </Text>
            <Text style={styles.infoDesc}>
              {notifStatus
                ? "Dengan ini, Anda akan menerima pemberitahuan langsung di perangkat Anda terkait aktivitas gempa terkini."
                : "Anda telah mematikan notifikasi. Anda tidak akan menerima pemberitahuan langsung mengenai pembaruan sistem atau gempa."}
            </Text>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => setShowNotifModal(false)}
            >
              <Text style={styles.infoButtonText}>Mengerti</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const MenuLink = ({ icon, title, onPress }: any) => (
  <TouchableOpacity
    style={styles.menuItem}
    activeOpacity={0.7}
    onPress={onPress}
  >
    <View style={styles.menuLeft}>
      <View style={styles.iconWrapper}>
        <MaterialCommunityIcons name={icon} size={25} color="#1E6F9F" />
      </View>
      <Text style={styles.menuText} numberOfLines={1}>
        {title}
      </Text>
    </View>
    <View style={styles.menuRightControl}>
      <Ionicons name="chevron-forward" size={18} color="#999" />
    </View>
  </TouchableOpacity>
);
