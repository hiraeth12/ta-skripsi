import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../styles/homeStyles";

export const InfoModal = ({ visible, onClose, title, desc }: any) => {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop: layer terpisah di belakang card, bukan membungkusnya */}
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        {/* Card: View biasa, bukan Pressable -> ScrollView di dalamnya
            tidak bersaing responder dengan siapa pun */}
        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle"
            size={40}
            color="#1E6F9F"
            style={{ alignSelf: "center", marginBottom: 12 }}
          />

          <Text style={styles.infoTitle}>{title}</Text>

          <ScrollView
            style={styles.infoDescScroll}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            <Text style={styles.infoDesc}>{desc}</Text>
          </ScrollView>

          <TouchableOpacity style={styles.infoButton} onPress={onClose}>
            <Text style={styles.infoButtonText}>{t("common.understand")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};