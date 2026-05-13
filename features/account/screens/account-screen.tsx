import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { get, getDatabase, ref, remove } from "@react-native-firebase/database";
import { deleteToken, getMessaging } from "@react-native-firebase/messaging";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  InteractionManager,
  Modal,
  Pressable,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { saveFcmTokenToDatabase } from "../../../hooks/use-fcm-token-save";
import ProfilePageLayout from "../components/profile-page-layout";
import {
  ACCOUNT_PROFILE,
  fetchProfileFromFirebase,
  ProfileData,
} from "../data/profile";

import Skeleton from "../../../components/skeleton";
import { styles } from "./styles/account-styles";

const PUSH_NOTIFICATION_PREF_KEY = "push_notifications_enabled";

export default function Account() {
  const router = useRouter();
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [isToggleProcessing, setIsToggleProcessing] = useState(false);
  const [profile, setProfile] = useState<ProfileData>(ACCOUNT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [isRenderReady, setIsRenderReady] = useState(false);

  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifStatus, setNotifStatus] = useState(true);

  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      setIsRenderReady(true);
    });
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const firebaseProfile = await fetchProfileFromFirebase();
        setProfile(firebaseProfile);

        const app = getApp();
        const auth = getAuth(app);
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
        const database = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);
        const tokenRef = ref(database, `user_fcm_tokens/${currentUser.uid}`);
        const tokenSnapshot = await get(tokenRef);

        const savedPreference = await AsyncStorage.getItem(
          PUSH_NOTIFICATION_PREF_KEY,
        );
        if (savedPreference !== null) {
          setIsNotificationsEnabled(savedPreference === "true");
        } else {
          setIsNotificationsEnabled(tokenSnapshot.exists());
        }
      } catch {
        // Keep default profile on error
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleToggleNotification = async (value: boolean) => {
    const app = getApp();
    const auth = getAuth(app);
    const currentUser = auth.currentUser;

    if (!currentUser) return;

    const previousValue = isNotificationsEnabled;
    setIsToggleProcessing(true);
    setIsNotificationsEnabled(value);

    try {
      if (value) {
        const token = await saveFcmTokenToDatabase(currentUser.uid);
        if (token) {
          setNotifStatus(true);
          await AsyncStorage.setItem(PUSH_NOTIFICATION_PREF_KEY, "true");
          setShowNotifModal(true);
        } else {
          setIsNotificationsEnabled(previousValue);
          setNotifStatus(previousValue);
        }
      } else {
        const messaging = getMessaging(app);
        await deleteToken(messaging);

        const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
        const database = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);
        await remove(ref(database, `user_fcm_tokens/${currentUser.uid}`));

        setNotifStatus(false);
        await AsyncStorage.setItem(PUSH_NOTIFICATION_PREF_KEY, "false");
        setShowNotifModal(true);
      }
    } catch {
      setIsNotificationsEnabled(previousValue);
      setNotifStatus(previousValue);
    } finally {
      setIsToggleProcessing(false);
    }
  };

  if (loading || !isRenderReady) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
        {/* Header Profil */}
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

        {/* Daftar Menu */}
        <View style={{ padding: 20, marginTop: 10 }}>
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
        <MenuLink
          icon="account-circle-outline"
          title="Pengaturan Profil"
          onPress={() => router.push("/profile/pengaturan")}
        />
        <MenuLink
          icon="lock-outline"
          title="Ubah Kata Sandi"
          onPress={() => router.push("/profile/ubah-kata-sandi")}
        />
        <MenuLink
          icon="map-marker-outline"
          title="Ubah Lokasi"
          onPress={() => router.push("/profile/ubah-lokasi")}
        />
        <MenuLink
          icon="earth"
          title="Ubah Bahasa"
          onPress={() => router.push("/profile/ubah-bahasa")}
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
            <Text style={styles.menuText}>Notifikasi Push</Text>
          </View>
          <Switch
            trackColor={{ false: "#D1D1D1", true: "#B2D8EC" }}
            thumbColor={isNotificationsEnabled ? "#1E6F9F" : "#f4f3f4"}
            onValueChange={handleToggleNotification}
            value={isNotificationsEnabled}
            disabled={isToggleProcessing}
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        </View>

        <MenuLink
          icon="cellphone-information"
          title="Tentang Aplikasi"
          onPress={() => router.push("/profile/tentang-aplikasi")}
        />
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
      <Text style={styles.menuText}>{title}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#999" />
  </TouchableOpacity>
);
