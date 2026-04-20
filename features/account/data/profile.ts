import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { get, getDatabase, ref } from "@react-native-firebase/database";

export interface ProfileData {
  name: string;
  email: string;
  location: string;
  initials: string;
}

/**
 * Extract initials from name
 * @param name - Full name
 * @returns Initials (max 3 characters)
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 3)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/**
 * Fetch profile data from Firebase Realtime Database
 * @returns Promise<ProfileData> - User profile with name, email, location from database
 */
export async function fetchProfileFromFirebase(): Promise<ProfileData> {
  try {
    const app = getApp();
    const auth = getAuth(app);
    const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
    const database = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);

    const user = auth.currentUser;
    console.log("[Profile] Current user:", user?.uid);
    if (!user) {
      throw new Error("No authenticated user found");
    }

    const userPath = `users/${user.uid}`;
    const userRef = ref(database, userPath);
    console.log("[Profile] Fetching from:", userPath);
    if (dbUrl) {
      console.log("[Profile] Using DB URL from env");
    }

    const snapshot = (await Promise.race([
      get(userRef),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Profile fetch timeout")), 8000)
      ),
    ])) as Awaited<ReturnType<typeof get>>;
    console.log("[Profile] Snapshot exists:", snapshot.exists());
    console.log("[Profile] Snapshot data:", snapshot.val());

    if (!snapshot.exists()) {
      throw new Error("User profile not found in database");
    }

    const userData = snapshot.val();
    
    // Combine firstName and lastName for full name
    const firstName = userData.firstName || "";
    const lastName = userData.lastName || "";
    const name = `${firstName} ${lastName}`.trim() || "User";
    
    const email = userData.email || user.email || "";
    const location = userData.locationName || "Unknown";

    console.log("[Profile] Loaded data:", { name, email, location });

    const initials = getInitials(name);

    return {
      name,
      email,
      location,
      initials,
      // phone field is intentionally NOT included
    };
  } catch (error) {
    console.error("[Profile] Error fetching profile from Firebase:", error);
    // Fallback to empty profile on error
    return {
      name: "User",
      email: "",
      location: "Unknown",
      initials: "U",
    };
  }
}

/**
 * Cached profile data for initial renders
 * Should be replaced with actual Firebase data on mount
 */
export const ACCOUNT_PROFILE: ProfileData = {
  name: "",
  email: "",
  location: "",
  initials: "",
};
