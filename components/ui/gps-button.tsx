import { Ionicons } from "@expo/vector-icons";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type GpsButtonProps = {
  text?: string;
  loadingText?: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  loadingStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export default function GpsButton({
  text = "Gunakan GPS",
  loadingText,
  loading = false,
  disabled = false,
  onPress,
  style,
  loadingStyle,
  textStyle,
}: GpsButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        style,
        loading && styles.loading,
        loading && loadingStyle,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <Ionicons name="navigate" size={18} color="#ffffff" />
        <Text style={[styles.text, textStyle]}>
          {loading ? loadingText || text : text}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#1E6F9F",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  loading: {
    opacity: 0.85,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
