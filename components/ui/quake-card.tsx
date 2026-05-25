import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { Text, View } from "react-native";

export type QuakeCardStyles = {
  statTopItem: StyleProp<ViewStyle>;
  statTopValue: StyleProp<TextStyle>;
  statTopLabel: StyleProp<TextStyle>;
  infoRow: StyleProp<ViewStyle>;
  infoIcon: StyleProp<ViewStyle>;
  infoLabel: StyleProp<TextStyle>;
  infoValue: StyleProp<TextStyle>;
};

type StatItemProps = {
  icon: string;
  value: string;
  label: string;
  styles: Pick<QuakeCardStyles, "statTopItem" | "statTopValue" | "statTopLabel">;
};

type DetailItemProps = {
  icon: string;
  label: string;
  value: string;
  styles: Pick<QuakeCardStyles, "infoRow" | "infoIcon" | "infoLabel" | "infoValue">;
  textContainerStyle?: StyleProp<ViewStyle>;
};

export const StatItem = ({ icon, value, label, styles }: StatItemProps) => (
  <View style={styles.statTopItem}>
    <MaterialCommunityIcons name={icon as never} size={20} color="#0369A1" />
    <Text style={styles.statTopValue}>{value}</Text>
    <Text style={styles.statTopLabel}>{label}</Text>
  </View>
);

export const DetailItem = ({
  icon,
  label,
  value,
  styles,
  textContainerStyle,
}: DetailItemProps) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon as never} size={18} color="#1E6F9F" style={styles.infoIcon as StyleProp<TextStyle>} />
    <View style={[{ flex: 1 }, textContainerStyle]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);