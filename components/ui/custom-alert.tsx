import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: "error" | "success";
  buttonText?: string;
  onClose: () => void;
  onConfirm?: (() => void) | null;
}

export default function CustomAlert({
  visible,
  title,
  message,
  type = "error",
  buttonText = "Mengerti",
  onClose,
  onConfirm,
}: CustomAlertProps) {
  
  const handlePress = () => {
    onClose(); // Tutup modal terlebih dahulu
    if (onConfirm) {
      onConfirm(); // Jalankan fungsi tambahan jika ada (misal: pindah halaman)
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.infoCard}>
          <Ionicons
            name={type === "error" ? "alert-circle" : "checkmark-circle"}
            size={50}
            color={type === "error" ? "#D9534F" : "#1E6F9F"}
            style={styles.modalIcon}
          />
          <Text style={styles.infoTitle}>{title}</Text>
          <Text style={styles.infoDesc}>{message}</Text>
          
          <TouchableOpacity style={styles.infoButton} onPress={handlePress}>
            <Text style={styles.infoButtonText}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Saya menambahkan styling dasar yang bisa kamu sesuaikan 
// atau kamu bisa mengimpornya dari file styles terpisah
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  infoCard: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    elevation: 5, // shadow for android
    shadowColor: "#000", // shadow for ios
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalIcon: {
    marginBottom: 10,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  infoDesc: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  infoButton: {
    backgroundColor: "#1E6F9F",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
  },
  infoButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});