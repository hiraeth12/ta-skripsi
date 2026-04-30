import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export function NetworkErrorModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.infoCard}>
          <Ionicons
            name="cloud-offline"
            size={50}
            color="#D9534F"
            style={styles.modalIcon}
          />
          <Text style={styles.infoTitle}>Koneksi Jaringan</Text>
          <Text style={styles.infoDesc}>
            Tidak dapat terhubung ke jaringan. Pastikan internet Anda aktif.
          </Text>
          <TouchableOpacity style={styles.infoButton} onPress={onClose}>
            <Text style={styles.infoButtonText}>Mengerti</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "85%",
    padding: 24,
  },
  modalIcon: {
    alignSelf: "center",
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    color: "#000",
  },
  infoDesc: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  infoButton: {
    backgroundColor: "#1E6F9F",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  infoButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});