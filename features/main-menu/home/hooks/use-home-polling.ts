import type { UserLocation } from "@/features/main-menu/account/session";
import { fetchUserSessionData } from "@/features/main-menu/account/session";
import { useUserSession } from "@/features/main-menu/account/user-session-context";
import type { ProfileData } from "@/features/main-menu/account/data/profile";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

const INTERVAL_FOREGROUND = 30_000;

type UseHomePollingOptions = {
  isMountedRef: React.RefObject<boolean>;
  userLocationRef: React.RefObject<UserLocation>;
  fetchLatestHomeCards: (location: UserLocation, signal?: AbortSignal) => Promise<void>;
  applyHomeUserData: (
    profile: ProfileData | null,
    location: UserLocation | null,
    options?: { showImageLoading?: boolean },
  ) => Promise<UserLocation | null>;
  setRefreshing: (v: boolean) => void;
  showNetworkError: () => void;
};

export function useHomePolling({
  isMountedRef,
  userLocationRef,
  fetchLatestHomeCards,
  applyHomeUserData,
  setRefreshing,
  showNetworkError,
}: UseHomePollingOptions) {
  const session = useUserSession();
  const appStatePrevRef = useRef<AppStateStatus>(AppState.currentState);
  const refreshInFlightRef = useRef(false);

  // ── Polling interval + AppState ────────────────────────────────────────────

  useEffect(() => {
    const abort = new AbortController();

    async function fetchAll() {
      try {
        await fetchLatestHomeCards(userLocationRef.current, abort.signal);
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") {
          showNetworkError();
        }
      }
    }

    fetchAll();
    const interval = setInterval(fetchAll, INTERVAL_FOREGROUND);

    const appStateSub = AppState.addEventListener("change", (next) => {
      if (
        appStatePrevRef.current.match(/inactive|background/) &&
        next === "active"
      ) {
        fetchAll();
      }
      appStatePrevRef.current = next;
    });

    return () => {
      clearInterval(interval);
      appStateSub.remove();
      abort.abort();
    };
  }, [fetchLatestHomeCards, showNetworkError, userLocationRef]);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    if (refreshInFlightRef.current) return;

    refreshInFlightRef.current = true;
    setRefreshing(true);

    try {
      const app = getApp();
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      let locationForCards = userLocationRef.current;

      if (currentUser) {
        const next = await fetchUserSessionData(currentUser);
        session.setProfile(next.profile);
        session.setLocation(next.location);

        const appliedLocation = await applyHomeUserData(
          next.profile,
          next.location,
          { showImageLoading: false },
        );
        if (appliedLocation) locationForCards = appliedLocation;
      } else {
        const appliedLocation = await applyHomeUserData(
          session.profile,
          session.location,
          { showImageLoading: false },
        );
        if (appliedLocation) locationForCards = appliedLocation;
      }

      await fetchLatestHomeCards(locationForCards);
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        showNetworkError();
      }
    } finally {
      refreshInFlightRef.current = false;
      if (isMountedRef.current) setRefreshing(false);
    }
  }, [applyHomeUserData, fetchLatestHomeCards, isMountedRef, session, setRefreshing, showNetworkError, userLocationRef]);

  return { handleRefresh };
}