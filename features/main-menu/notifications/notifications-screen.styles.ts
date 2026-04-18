import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0C4A6E" },
  menuContainer: { flex: 1, backgroundColor: "#0C4A6E" },
  menuContent: { paddingHorizontal: 20, paddingTop: 20, flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  notifCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    elevation: 3,
  },
  notifContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textWrapper: { flex: 1, marginRight: 10 },
  notifTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  notifSubTitle: { fontSize: 13, color: "#333", marginBottom: 2 },
  notifTime: { fontSize: 12, color: "#888" },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 90,
    alignItems: "center",
  },
  badgeRed: { backgroundColor: "#EF4444" },
  badgeGreen: { backgroundColor: "#22C55E" },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  emptyText: {
    color: "#fff",
    textAlign: "center",
    marginTop: 50,
    opacity: 0.6,
  },
});
