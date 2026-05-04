import { StyleSheet } from "react-native";


export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EDEDED",
  },
  scrollContainer: {
    padding: 24,
    justifyContent: "center",
    minHeight: "100%",
  },
  logo: {
    width: 160,
    height: 50,
    alignSelf: "center",
    marginBottom: 40,
    marginTop: 20,
  },
  description: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "left",
    marginBottom: 30,
    color: "#555",
    lineHeight: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 18,
    color: "#333",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  passwordContainer2: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    marginBottom: 40, // Jarak ke tombol bawah
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 8,
    color: "#000",
  },
});
