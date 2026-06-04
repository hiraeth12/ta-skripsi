import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { useTranslation } from "react-i18next"; // <-- Import i18n
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  active: string;
  onChange: (tab: string) => void;
}

export default function BottomNav({ active, onChange }: Props) {
  const { t } = useTranslation(); // <-- Hook i18n dipanggil di sini

  // Kita pisahkan 'id' (untuk logika) dan 'label' (untuk tampilan)
  const menus = [
    { id: "HOME", label: t("bottomNav.home"), icon: "home" },
    { id: "GEMPA", label: t("bottomNav.gempa"), icon: "target" },
    { id: "RIWAYAT", label: t("bottomNav.riwayat"), icon: "clock" },
    { id: "AKUN", label: t("bottomNav.akun"), icon: "user" },
  ];

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {menus.map((menu) => {
          // Pengecekan aktif tetap menggunakan 'id' agar logika tidak rusak
          const isActive = active === menu.id;

          return (
            <TouchableOpacity
              key={menu.id}
              style={styles.item}
              onPress={() => onChange(menu.id)}
            >
              <Feather name={menu.icon as any} size={24} color="#1B5E80" />

              {/* Teks yang tampil menggunakan 'label' yang sudah diterjemahkan */}
              <Text style={styles.label}>{menu.label}</Text>

              <View
                style={[
                  styles.activeLine,
                  !isActive && styles.activeLineHidden,
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },

  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  item: {
    alignItems: "center",
    flex: 1,
  },

  label: {
    fontSize: 12,
    marginTop: 1,
    color: "#1B5E80",
  },

  activeLine: {
    marginTop: 4,
    height: 2,
    width: 24,
    backgroundColor: "#1B5E80",
    borderRadius: 2,
  },

  activeLineHidden: {
    backgroundColor: "transparent",
  },
});
