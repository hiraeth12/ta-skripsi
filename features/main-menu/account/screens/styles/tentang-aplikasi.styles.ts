// tentang-aplikasi.styles.ts
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
  avatarText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold"
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
    backgroundColor: "#0C4A6E", // Warna biru gelap konsisten
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  menuContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    flex: 1
  },
  titleRow: {
    marginBottom: 15
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold"
  },
  

  mainContentContainer: {
    flex: 1,
    minHeight: 0,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    flex: 1,          // Fills available space between top and button
    flexShrink: 1,    // Allows card to shrink so button is never hidden
    minHeight: 0,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: "hidden", // Keeps ScrollView clipped inside card bounds
  },
  scrollContent: {
    alignItems: "center", // Konten di dalam scroll tetap rata tengah
    paddingBottom: 10,
  },
  appLogo: {
    width: 180,
    height: 60,
    marginBottom: 15,
  },
  description: {
    fontSize: 14,
    color: "#444",
    textAlign: "justify", // Diganti justify agar lebih rapi untuk teks panjang
    lineHeight: 22,
    marginBottom: 8,
  },
  versionContainer: {
    marginTop: 10,
    alignItems: "center",
  },
  versionLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
  },
  btnBack: {
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)", // Semi transparan agar elegan di atas background biru
    backgroundColor: "transparent",
    alignItems: "center",
  },
  btnTextBack: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
