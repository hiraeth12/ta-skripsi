// account.styles.ts
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  loadingMenuList: {
    gap: 12,
    marginTop: 10,
    padding: 20,
  },
  menuScroll: {
    flex: 1,
  },
  menuScrollContent: {
    flexGrow: 1,
    gap: 12,
    paddingBottom: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    borderRadius: 12,
    gap: 10,
    height: 58,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrapper: {
    width: 40,
    flexShrink: 0,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  menuText: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  menuRightControl: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
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
    marginBottom: 12 
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
    fontSize: 16 
  },
});
