import { Ionicons } from "@expo/vector-icons";
import {
    Modal,
    Pressable,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { styles } from "../styles/homeStyles";

export const InfoModal = ({ visible, onClose, title, desc }: any) => (
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
          <Text style={styles.infoButtonText}>Mengerti</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  </Modal>
);
