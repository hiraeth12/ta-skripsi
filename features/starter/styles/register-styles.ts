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
  image: {
    width: 180,
    height: 59,
    alignSelf: "center",
    marginBottom: 30,
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 18,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 8,
    color: "#111",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 8,
    color: "#111",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 4,
  },
  signInText: {
    textAlign: "right",
    fontSize: 13,
    marginTop: 20,
    color: "#555",
  },

  // --- Styles untuk Modal Custom ---
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
  },
  infoDesc: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  infoButton: {
    backgroundColor: "#1E6F9F",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  infoButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
