import { TouchableOpacity, Text, StyleSheet, GestureResponderEvent } from "react-native";

type AuthButtonProps = {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  disabled?: boolean;
};

export default function AuthButton({ title, onPress, disabled }: AuthButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        disabled && { opacity: 0.5 }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 10,
    backgroundColor: "#1E6F9F",
    borderRadius: 10,
    width: "65%",
    height: 50,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});