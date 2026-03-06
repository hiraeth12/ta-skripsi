import { StyleSheet, Text, View } from "react-native";

export default function History() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Riwayat</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EDEDED",
  },
  text: { fontSize: 24, fontWeight: "bold", color: "#0C4A6E" },
});
