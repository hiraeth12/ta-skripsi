import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Text, View } from "react-native";
import { styles } from "../styles/homeStyles";

export const StatItem = ({ icon, value, label }: any) => (
  <View style={styles.statTopItem}>
    <MaterialCommunityIcons name={icon} size={20} color="#0369A1" />
    <Text style={styles.statTopValue}>{value}</Text>
    <Text style={styles.statTopLabel}>{label}</Text>
  </View>
);
