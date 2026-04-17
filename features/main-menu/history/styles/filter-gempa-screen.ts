import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "rgba(226, 232, 240, 0.9)",
  },
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#0C4A6E",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  closeIcon: {
    backgroundColor: "#FFFFFF",
    padding: 4,
    borderRadius: 4,
  },
  sectionContainer: {
    marginBottom: 12,
  },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 8,
  },
  accordionHeaderActive: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: "#FFFFFF",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  accordionContent: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  listItemText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  listItemSelectedText: {
    color: "#0891B2",
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12,
  },
  btnBatal: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A5B4FC",
    alignItems: "center",
  },
  btnBatalText: {
    color: "#E0E7FF",
    fontSize: 15,
    fontWeight: "600",
  },
  btnSimpan: {
    flex: 1,
    backgroundColor: "#0891B2",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnSimpanText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },
});

export default styles;
