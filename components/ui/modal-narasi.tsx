import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import RenderHtml from "react-native-render-html";

type ModalNarasiProps = {
  visible: boolean;
  htmlContent: string | null;
  loading: boolean;
  onClose: () => void;
  texts?: {
    title?: string;
    subtitle?: string;
    loading?: string;
    empty?: string;
    footerNote?: string;
  };
};

export function ModalNarasi({
  visible,
  htmlContent,
  loading,
  onClose,
  texts,
}: ModalNarasiProps) {
  const { height, width } = useWindowDimensions();
  const resolvedTexts = {
    title: texts?.title ?? "NARASI RESMI BMKG",
    subtitle: texts?.subtitle ?? "Sumber data: BMKG InfoGempa",
    loading: texts?.loading ?? "Memuat narasi...",
    empty: texts?.empty ?? "Narasi resmi belum tersedia.",
    footerNote:
      texts?.footerNote ??
      "* Narasi resmi diterbitkan oleh Direktur Gempabumi dan Tsunami BMKG",
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

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1E6F9F" />
                <Text style={styles.loadingText}>{resolvedTexts.loading}</Text>
              </View>
            ) : htmlContent ? (
              <RenderHtml
                contentWidth={width - 40}
                source={{ html: htmlContent }}
                tagsStyles={tagsStyles}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="document-text-outline"
                  size={48}
                  color="#CBD5E1"
                />
                <Text style={styles.emptyText}>
                  {resolvedTexts.empty}
                </Text>
              </View>
            )}
          </ScrollView>

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

const tagsStyles = {
  p: {
    fontSize: 14,
    lineHeight: 22,
    color: "#1E293B",
    marginBottom: 8,
  },
  strong: {
    fontWeight: "700" as const,
    color: "#0C4A6E",
  },
  em: {
    fontStyle: "italic" as const,
  },
};

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
  modalTitleBottom: {
    color: "#0C4A6E",
    fontWeight: "700",
    fontSize: 16,
  },
  modalSubtitle: {
    fontSize: 11,
    color: "#777",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748B",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
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
