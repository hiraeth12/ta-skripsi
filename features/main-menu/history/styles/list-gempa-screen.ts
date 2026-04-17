import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0C4A6E",
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerTitle: {
    flex: 1,
    marginRight: 12,
    color: "#E6F4FF",
    fontSize: 18,
    fontWeight: "700",
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
    backgroundColor: "#E6F4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    gap: 8,
    paddingBottom: 24,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 16,
  },
  loadingText: {
    color: "#E6F4FF",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyText: {
    color: "#E6F4FF",
    fontSize: 14,
    textAlign: "center",
    marginTop: 16,
  },
  itemCard: {
    backgroundColor: "#EDEDED",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  magnitudeBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#D97706",
    alignItems: "center",
    justifyContent: "center",
  },
  magnitudeText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  magnitudeLabel: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "500",
    marginTop: -2,
  },
  infoColumn: {
    flex: 1,
    gap: 2,
  },
  locationText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  timeText: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "500",
  },
  distanceText: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "500",
  },
  itemAction: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: "#0891B2",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default styles;
