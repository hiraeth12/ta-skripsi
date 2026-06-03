import { DEFAULT_LOCATION } from "@/constants/map";
import type { ProfileData } from "@/features/main-menu/account/data/profile";
import type { UserLocation } from "@/features/main-menu/account/session";
import { CACHE_KEYS, getCachedData, setCacheData } from "@/utils/cache";
import { findNearestLocation } from "@/utils/geo";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { getDatabase } from "@react-native-firebase/database";
import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
} from "@react-native-firebase/storage";
import { useCallback, useRef, useState } from "react";
import { DB_URL } from "../constants";
import type { ApplyHomeUserDataOptions } from "../types";
import { getLocationsData } from "../utils/firebase-location";

export function useUserLocation(
  sessionUserId: string | undefined,
  isMountedRef: React.RefObject<boolean>,
) {
  const [userLocation, setUserLocation] =
    useState<UserLocation>(DEFAULT_LOCATION);
  const [locationImageUrl, setLocationImageUrl] = useState<string | null>(null);
  const [locationImageLoading, setLocationImageLoading] = useState(true);
  const [userName, setUserName] = useState("Pengguna");

  const userLocationRef = useRef(userLocation);

  const applyHomeUserData = useCallback(
    async (
      profile: ProfileData | null,
      location: UserLocation | null,
      options: ApplyHomeUserDataOptions = {},
    ): Promise<UserLocation | null> => {
      const app = getApp();
      const authUser = getAuth(app).currentUser;
      if (!sessionUserId && !authUser) return null;

      const database = DB_URL ? getDatabase(app, DB_URL) : getDatabase(app);

      if (profile?.name && isMountedRef.current) {
        const firstName = profile.name.split(" ")[0] || profile.name;
        setUserName((prev) => (prev === firstName ? prev : firstName));
      }

      const userLat = location?.latitude ?? NaN;
      const userLon = location?.longitude ?? NaN;
      let locationName = location?.name || profile?.location || "Lokasi Saya";
      let nextLocation: UserLocation | null = null;

      if (
        locationName === "Lokasi GPS" &&
        Number.isFinite(userLat) &&
        Number.isFinite(userLon)
      ) {
        const locations = await getLocationsData(database);
        const nearest = locations
          ? findNearestLocation(userLat, userLon, locations)
          : null;
        if (nearest?.name) locationName = nearest.name;
      }

      if (Number.isFinite(userLat) && Number.isFinite(userLon)) {
        nextLocation = { latitude: userLat, longitude: userLon, name: locationName };
        userLocationRef.current = nextLocation;
        if (isMountedRef.current) {
          setUserLocation((prev) =>
            prev.latitude === nextLocation!.latitude &&
            prev.longitude === nextLocation!.longitude &&
            prev.name === nextLocation!.name
              ? prev
              : nextLocation!,
          );
        }
      }

      if (!locationName) return nextLocation;

      if (options.showImageLoading !== false && isMountedRef.current) {
        setLocationImageLoading(true);
      }

      try {
        const imageCacheKey = `location_image_${locationName}`;
        const cachedImageUrl = getCachedData<string>(imageCacheKey);
        if (cachedImageUrl) {
          if (isMountedRef.current) {
            setLocationImageUrl((prev) =>
              prev === cachedImageUrl ? prev : cachedImageUrl,
            );
          }
          return nextLocation;
        }

        const locations = await getLocationsData(database);
        const entry = locations?.find((l) => l?.name === locationName) ?? null;

        if (entry?.image) {
          const url = await getDownloadURL(
            storageRef(getStorage(app), entry.image),
          );
          setCacheData(imageCacheKey, url, 3_600_000);
          if (isMountedRef.current) {
            setLocationImageUrl((prev) => (prev === url ? prev : url));
          }
        } else if (isMountedRef.current) {
          setLocationImageUrl(null);
        }
      } catch {
        if (isMountedRef.current) setLocationImageUrl(null);
      } finally {
        if (isMountedRef.current) setLocationImageLoading(false);
      }

      return nextLocation;
    },
    [sessionUserId, isMountedRef],
  );

  return {
    userLocation,
    userLocationRef,
    locationImageUrl,
    locationImageLoading,
    setLocationImageLoading,
    userName,
    applyHomeUserData,
  };
}