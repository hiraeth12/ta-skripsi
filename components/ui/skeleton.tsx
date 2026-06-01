import { DimensionValue, View, ViewStyle } from "react-native";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function Skeleton({
  width,
  height,
  borderRadius = 4,
  style,
}: SkeletonProps) {
  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: "#CBD5E1",
          borderRadius,
        },
        style,
      ]}
    />
  );
}
