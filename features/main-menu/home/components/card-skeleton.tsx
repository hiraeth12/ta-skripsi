import Skeleton from "@/components/ui/skeleton";
import { View } from "react-native";
import { styles } from "../styles/homeStyles";

export function CardSkeleton() {
  return (
    <View style={styles.mapCard}>
      <View style={styles.mapImageContainer}>
        <Skeleton width="100%" height="100%" borderRadius={0} />
      </View>
      <View style={[styles.statsTopRow, { justifyContent: "space-around" }]}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width={60} height={45} borderRadius={8} />
        ))}
      </View>
      <View style={styles.separator} />
      <View style={[styles.infoContent, { gap: 15 }]}>
        {(["100%", "80%", "90%", "60%"] as const).map((w, i) => (
          <Skeleton key={i} width={w} height={24} borderRadius={6} />
        ))}
      </View>
    </View>
  );
}