import { Stack } from "expo-router";

export default function StarterLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTitleAlign: "center",
        animation: "fade",
      }}
    />
  );
}
