// account.styles.ts
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 12,
    height: 58,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuLeft: { 
    flexDirection: "row", 
    alignItems: "center" 
  },
  iconWrapper: {
    width: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  menuText: { 
    fontSize: 15, 
    fontWeight: "600", 
    color: "#333" 
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