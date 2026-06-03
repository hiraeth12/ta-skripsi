import type { QuakeNotification } from "@/hooks/use-quake-notifications";

export type KnownNotifType = QuakeNotification["type"];

export type NotifCardProps = {
  item: QuakeNotification;
  onPress: () => void;
};