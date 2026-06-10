import { get, getDatabase, ref } from "@react-native-firebase/database";
import type { FirebaseLocation } from "../types";

// Cache in-memory — sengaja module-level agar bertahan selama app hidup,
// sama seperti perilaku aslinya di home-screen.tsx.
let cachedLocationsData: FirebaseLocation[] | null = null;

export async function getLocationsData(
  database: ReturnType<typeof getDatabase>,
): Promise<FirebaseLocation[] | null> {
  if (cachedLocationsData) return cachedLocationsData;
  const snap = await get(ref(database, "locations"));
  const val = snap.val();
  cachedLocationsData = val ? (Object.values(val) as FirebaseLocation[]) : null;
  return cachedLocationsData;
}