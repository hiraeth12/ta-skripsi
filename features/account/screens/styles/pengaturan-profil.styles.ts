// pengaturan-profil.styles.ts
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },
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
  avatarText: { 
    color: "#fff", 
    fontSize: 32, 
    fontWeight: "bold" 
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 5,
  },
  userDetails: { 
    fontSize: 14, 
    color: "#555", 
    marginBottom: 2 
  },

  menuContainer: {
    flex: 1,
    backgroundColor: "#0C4A6E",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  menuContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    flex: 1,
  },
  titleRow: { 
    marginBottom: 15 
  },
  sectionTitle: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "bold" 
  },
  keyboardScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // INPUT CARD
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
  inputArea: { 
    marginBottom: 15 
  },
  label: { 
    fontSize: 14, 
    fontWeight: "bold", 
    color: "#000", 
    marginBottom: 5 
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    paddingVertical: 8,
    fontSize: 14,
    color: "#333",
  },

  // BUTTONS
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
  btnTextBatal: { 
    color: "#999", 
    fontWeight: "bold" 
  },
  btnTextSimpan: { 
    color: "#fff", 
    fontWeight: "bold" 
  },
  logoutButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    color: "#E11D48",
    fontWeight: "bold",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 24,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  confirmIcon: {
    marginBottom: 10,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  confirmDesc: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },
  confirmButtonWrapper: {
    flexDirection: "row",
    width: "100%",
  },
  confirmCancelButton: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  confirmLogoutButton: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#E11D48",
    alignItems: "center",
  },
  confirmCancelText: {
    color: "#6B7280",
    fontWeight: "bold",
  },
  confirmLogoutText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
