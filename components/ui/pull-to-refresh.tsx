import { ReactNode } from "react";
import { RefreshControl, ScrollView } from "react-native";

type PullToRefreshProps = {
  refreshing: boolean;
  onRefresh: () => void;
  children: ReactNode;
};

export default function PullToRefresh({
  refreshing,
  onRefresh,
  children,
}: PullToRefreshProps) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#1E6F9F"]}
          tintColor="#1E6F9F"
        />
      }
    >
      {children}
    </ScrollView>
  );
}

