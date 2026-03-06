import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  active: string;
  onChange: (tab: string) => void;
}

export default function BottomNav({ active, onChange }: Props) {
  const menus = [
    { name: "HOME", icon: "home" },
    { name: "GEMPA", icon: "target" },
    { name: "RIWAYAT", icon: "clock" },
    { name: "AKUN", icon: "user" },
  ];

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {menus.map((menu) => {
          const isActive = active === menu.name;

          return (
            <TouchableOpacity
              key={menu.name}
              style={styles.item}
              onPress={() => onChange(menu.name)}
            >
              <Feather name={menu.icon as any} size={24} color="#1B5E80" />

              <Text style={styles.label}>{menu.name}</Text>

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
