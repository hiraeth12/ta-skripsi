import { useEffect, useRef } from "react";
import { Animated, DimensionValue, ViewStyle } from "react-native"; // <-- Tambahkan DimensionValue

interface SkeletonProps {
  width?: DimensionValue; // <-- Ubah tipe menjadi DimensionValue
  height?: DimensionValue; // <-- Ubah tipe menjadi DimensionValue
  borderRadius?: number;
  style?: ViewStyle;
}

export default function Skeleton({
  width,
  height,
  borderRadius = 4,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: "#CBD5E1",
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}
