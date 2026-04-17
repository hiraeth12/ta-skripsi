import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabPane: {
    flex: 1,
  },
  hiddenPane: {
    display: "none",
  },
  topControls: {
    position: "absolute",
    left: 10,
    right: 10,
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
  },
  designSection: {
    width: "100%",
    alignItems: "center",
    gap: 10,
  },
  periodChip: {
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 6,
    borderRadius: 999,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    alignSelf: "center",
  },
  periodChipText: {
    color: "#0369A1",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  actionRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 0,
  },
  sidePill: {
    minWidth: 108,
    height: 31,
    borderRadius: 999,
    backgroundColor: "#1195BD",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 3,
    marginTop: 6,
  },
  sidePillLeft: {
    marginLeft: -40,
  },
  sidePillLeftContent: {
    justifyContent: "flex-end",
  },
  sidePillRight: {
    marginRight: -40,
  },
  sidePillRightContent: {
    justifyContent: "flex-start",
  },
  sidePillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  sidePillTextRight: {
    textAlign: "right",
    marginRight: 6,
  },
  sidePillTextLeft: {
    textAlign: "left",
    marginLeft: 6,
  },
});

export default styles;
