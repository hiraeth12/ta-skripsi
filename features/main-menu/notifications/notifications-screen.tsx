import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Text, TouchableOpacity, View } from "react-native";

import type { QuakeNotification } from "@/hooks/use-quake-notifications";
import { NotifCard } from "@/features/main-menu/notifications/components/notif-card";
import { useVisibleNotifications } from "../notifications/hooks/use-visible-notifications";
import {
  getEarthquakeTab,
  getHistoryTab,
  getLatestNotificationForType,
  isKnownNotifType,
} from "../notifications/utils/notification-routing";
import { styles } from "./styles/notifications-screen.styles";

export default function Notifikasi() {
  const { t } = useTranslation();
  const router = useRouter();
  const { visibleNotifications, error } = useVisibleNotifications();

  const handleNotificationPress = useCallback(
    (item: QuakeNotification) => {
      if (!isKnownNotifType(item.type)) {
        router.push({ pathname: "/main-menu/history" });
        return;
      }

      const latestForType = getLatestNotificationForType(
        visibleNotifications,
        item.type,
      );

      if (latestForType?.id === item.id) {
        router.push({
          pathname: "/main-menu/earthquake",
          params: { tab: getEarthquakeTab(item.type) },
        });
        return;
      }

      router.push({
        pathname: "/main-menu/history",
        params: { tab: getHistoryTab(item.type) },
      });
    },
    [router, visibleNotifications],
  );

  return (
    <View style={styles.container}>
      <View style={styles.menuContainer}>
        <View style={styles.menuContent}>
          <View style={styles.titleRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginRight: 15 }}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>
              {t("notificationsScreen.headerTitle")}
            </Text>
          </View>

          <FlatList
            data={visibleNotifications}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <NotifCard
                item={item}
                onPress={() => handleNotificationPress(item)}
              />
            )}
            ListEmptyComponent={() => (
              <Text style={styles.emptyText}>
                {error
                  ? t("notificationsScreen.loadError")
                  : t("notificationsScreen.emptyFallback")}
              </Text>
            )}
          />
        </View>
      </View>
    </View>
  );
}
