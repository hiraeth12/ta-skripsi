import {
  CACHE_KEYS,
  getPersistentCache,
  setPersistentCache,
} from "@/utils/cache";
import { getApp } from "@react-native-firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  type FirebaseAuthTypes,
} from "@react-native-firebase/auth";
import { get, getDatabase, ref } from "@react-native-firebase/database";
import type { ProfileData } from "./data/profile";

export type UserLocation = {
  latitude: number;
  longitude: number;
  name: string;
};

export type StartupRoute =
  | "/starter/sign-in"
  | "/starter/ask-location"
  | "/main-menu/home";

export type StartupSession = {
  user: FirebaseAuthTypes.User | null;
  profile: ProfileData | null;
  location: UserLocation | null;
  route: StartupRoute;
};

const SESSION_CACHE_TTL = 60 * 60 * 1000;

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function hasValidLocation(location: UserLocation | null) {
  return (
    !!location &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude)
  );
}

async function waitForAuthUser(
  auth: ReturnType<typeof getAuth>,
  timeoutMs = 650,
): Promise<FirebaseAuthTypes.User | null> {
  if (auth.currentUser) return auth.currentUser;

  return new Promise((resolve) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      unsubscribe();
      resolve(auth.currentUser ?? null);
    }, timeoutMs);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      unsubscribe();
      resolve(user);
    });
  });
}

export async function fetchUserSessionData(
  user: FirebaseAuthTypes.User,
): Promise<{ profile: ProfileData | null; location: UserLocation | null }> {
  const app = getApp();
  const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
  const database = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);
  const snapshot = await get(ref(database, `users/${user.uid}`));
  const userData = snapshot.val();

  if (!userData) {
    return {
      profile: {
        name: user.displayName || "User",
        email: user.email || "",
        location: "Unknown",
        initials: getInitials(user.displayName || "User") || "U",
      },
      location: null,
    };
  }

  const firstName = String(userData.firstName ?? "");
  const lastName = String(userData.lastName ?? "");
  const name = `${firstName} ${lastName}`.trim() || user.displayName || "User";
  const locationName = String(userData.locationName || "Lokasi Saya");
  const latitude = Number.parseFloat(String(userData.latitude ?? ""));
  const longitude = Number.parseFloat(String(userData.longitude ?? ""));

  const profile: ProfileData = {
    name,
    email: String(userData.email || user.email || ""),
    location: locationName,
    initials: getInitials(name) || "U",
  };

  const location =
    Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { latitude, longitude, name: locationName }
      : null;

  setPersistentCache(CACHE_KEYS.USER_PROFILE, profile, SESSION_CACHE_TTL);
  if (location) {
    setPersistentCache(CACHE_KEYS.USER_LOCATION, location, SESSION_CACHE_TTL);
  }

  return { profile, location };
}

export async function loadStartupSession(): Promise<StartupSession> {
  const [cachedProfile, cachedLocation] = await Promise.all([
    getPersistentCache<ProfileData>(CACHE_KEYS.USER_PROFILE),
    getPersistentCache<UserLocation>(CACHE_KEYS.USER_LOCATION),
  ]);

  try {
    const app = getApp();
    const auth = getAuth(app);
    const user = await waitForAuthUser(auth);

    if (!user) {
      return {
        user: null,
        profile: null,
        location: null,
        route: "/starter/sign-in",
      };
    }

    try {
      const fresh = await fetchUserSessionData(user);
      return {
        user,
        profile: fresh.profile ?? cachedProfile,
        location: fresh.location ?? cachedLocation,
        route: hasValidLocation(fresh.location ?? cachedLocation)
          ? "/main-menu/home"
          : "/starter/ask-location",
      };
    } catch {
      return {
        user,
        profile: cachedProfile,
        location: cachedLocation,
        route: hasValidLocation(cachedLocation)
          ? "/main-menu/home"
          : "/starter/ask-location",
      };
    }
  } catch {
    return {
      user: null,
      profile: null,
      location: null,
      route: "/starter/sign-in",
    };
  }
}
