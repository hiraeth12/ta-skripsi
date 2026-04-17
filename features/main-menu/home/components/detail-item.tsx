import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { styles } from "../styles/homeStyles";

export const DetailItem = ({ icon, label, value }: any) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={18} color="#1E6F9F" style={styles.infoIcon} />
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);
