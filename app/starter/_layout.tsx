import { Stack } from "expo-router";
import "../../constants/translations/i18n";

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
