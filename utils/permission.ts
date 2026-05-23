import { PermissionsAndroid, Platform } from "react-native";

/**
 * Android 13+ requires POST_NOTIFICATIONS runtime permission.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== "android" || Platform.Version < 33) {
    return true;
  }

  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  const hasPermission = await PermissionsAndroid.check(permission);

  if (hasPermission) {
    return true;
  }

  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}
