import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  headerSection: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#fff",
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#D81B60",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    position: "relative",
  },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#1E6F9F",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "bold" },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 5,
  },
  userDetails: { fontSize: 14, color: "#555", marginBottom: 2 },

  menuContainer: {
    flex: 1,
    backgroundColor: "#0C4A6E",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  menuContent: { paddingHorizontal: 20, paddingTop: 20, flex: 1 },
  titleRow: { marginBottom: 15 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  scrollContent: { paddingBottom: 20 },

  inputCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inputArea: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: "bold", color: "#000", marginBottom: 5 },

  // STYLE CONTAINER PASSWORD (SEPERTI YANG KAMU MAU)
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    color: "#333",
  },
  inputErrorBorder: { borderBottomColor: "#E11D48" },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: { color: "#E11D48", fontSize: 11, marginLeft: 8, flex: 1 },

  buttonWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  btnBatal: {
    flex: 1,
    marginRight: 10,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D1D1",
    alignItems: "center",
  },
  btnSimpan: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#1E6F9F",
    alignItems: "center",
  },
  btnTextBatal: { color: "#999", fontWeight: "bold" },
  btnTextSimpan: { color: "#fff", fontWeight: "bold" },

  keyboardScroll: {
    flex: 1,
  },
});


