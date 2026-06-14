import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

type ModalShakeMapProps = {
  visible: boolean;
  imageUrl?: string | null;
  onClose: () => void;
  texts?: {
    title?: string;
    subtitle?: string;
    footerNote?: string;
  };
};

export function ModalShakeMap({
  visible,
  imageUrl,
  onClose,
  texts,
}: ModalShakeMapProps) {
  const { height, width } = useWindowDimensions();
  const [imageHeight, setImageHeight] = useState(0);
  const resolvedTexts = {
    title: texts?.title ?? "PETA GUNCANGAN",
    subtitle: texts?.subtitle ?? "Sumber data: BMKG ShakeMap",
    footerNote:
      texts?.footerNote ?? "* Data diperbarui secara otomatis oleh BMKG",
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlayBottom}>
        <View style={[styles.modalCardBottom, { height: height * 0.9 }]}>
          <View style={styles.modalHeaderBottom}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitleBottom}>{resolvedTexts.title}</Text>
              <Text style={styles.modalSubtitle}>
                {resolvedTexts.subtitle}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseCircle}>
              <Ionicons name="close" size={20} color="#333" />
            </TouchableOpacity>
          </View>
          <View style={styles.imageContainer}>
            {imageUrl && (
              <Image
                source={{ uri: imageUrl }}
                style={{ width, height: imageHeight || undefined }}
                resizeMode="contain"
                onLoad={(e) => {
                  const { width: w, height: h } = e.nativeEvent.source;
                  setImageHeight((h / w) * width);
                }}
              />
            )}
          </View>
          <View style={styles.modalFooter}>
            <Text style={styles.scrollHint}>
              {resolvedTexts.footerNote}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalCardBottom: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    width: "100%",
  },
  modalHeaderBottom: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitleBottom: { color: "#0C4A6E", fontWeight: "700", fontSize: 16 },
  modalSubtitle: { fontSize: 11, color: "#777" },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  modalFooter: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fafafa",
  },
  scrollHint: {
    textAlign: "center",
    fontSize: 12,
    color: "#1E6F9F",
    fontWeight: "500",
  },
  modalCloseCircle: {
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    padding: 4,
  },
});