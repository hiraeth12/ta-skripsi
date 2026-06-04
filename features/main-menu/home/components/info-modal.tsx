import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
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
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle"
            size={40}
            color="#1E6F9F"
            style={{ alignSelf: "center", marginBottom: 12 }}
          />

          <Text style={styles.infoTitle}>{title}</Text>
          <Text style={styles.infoDesc}>{desc}</Text>

          <TouchableOpacity style={styles.infoButton} onPress={onClose}>
            <Text style={styles.infoButtonText}>{t("common.understand")}</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
};
