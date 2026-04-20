import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ProfilePageLayoutProps = {
  title?: string;
  children: ReactNode;
  headerName: string;
  headerEmail: string;
  headerLocation: string;
  headerInitials?: string;
  headerPhone?: string;
};

export default function ProfilePageLayout({
  title,
  children,
  headerName,
  headerEmail,
  headerLocation,
  headerInitials = "FBS",
  headerPhone,
}: ProfilePageLayoutProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{headerInitials}</Text>
          <TouchableOpacity style={styles.editBadge}>
            <MaterialCommunityIcons name="camera" size={14} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.userName}>{headerName}</Text>
        <Text style={styles.userDetails}>{headerEmail}</Text>
        <Text style={styles.userDetails}>{headerLocation}</Text>
        {headerPhone ? <Text style={styles.userDetails}>{headerPhone}</Text> : null}
      </View>

      <View style={styles.menuContainer}>
        <View style={styles.menuContent}>
          {title ? (
            <View style={styles.titleRow}>
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          ) : null}
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  menuContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    flex: 1,
  },
  titleRow: { marginBottom: 15 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
