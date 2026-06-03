import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type InAppNotificationData = {
  title: string;
  body: string;
};

export function InAppNotificationModal({
  visible,
  data,
  onClose,
}: {
  visible: boolean;
  data: InAppNotificationData | null;
  onClose: () => void;
}) {
  const router = useRouter();

  if (!data) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.infoCard}>
          <Ionicons
            name="warning"
            size={50}
            color="#D9534F"
            style={styles.modalIcon}
          />
          <Text style={styles.infoTitle}>{data.title}</Text>
          <Text style={styles.infoDesc}>{data.body}</Text>
          
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.closeButton]} 
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>Tutup</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.viewButton]} 
              onPress={() => {
                onClose();
                router.push("/main-menu/notifikasi");
              }}
            >
              <Text style={styles.viewButtonText}>Lihat Info</Text>
            </TouchableOpacity>
          </View>
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
  actionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeButton: {
    backgroundColor: "#F2F2F2",
  },
  closeButtonText: {
    color: "#555",
    fontWeight: "bold",
    fontSize: 16,
  },
  viewButton: {
    backgroundColor: "#1E6F9F",
  },
  viewButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
