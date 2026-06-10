import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getApp } from "@react-native-firebase/app";
import { getAuth, type FirebaseAuthTypes } from "@react-native-firebase/auth";
import type { ProfileData } from "./data/profile";
import {
  fetchUserSessionData,
  loadStartupSession,
  type UserLocation,
} from "./session";

type UserSessionContextValue = {
  user: FirebaseAuthTypes.User | null;
  profile: ProfileData | null;
  location: UserLocation | null;
  loading: boolean;
  setProfile: React.Dispatch<React.SetStateAction<ProfileData | null>>;
  setLocation: React.Dispatch<React.SetStateAction<UserLocation | null>>;
  refreshProfile: () => Promise<void>;
};

const UserSessionContext = createContext<UserSessionContextValue | null>(null);

export function UserSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const app = getApp();
    const auth = getAuth(app);
    const currentUser = auth.currentUser;
    setUser(currentUser);

    if (!currentUser) {
      setProfile(null);
      setLocation(null);
      setLoading(false);
      return;
    }

    try {
      const next = await fetchUserSessionData(currentUser);
      setProfile(next.profile);
      setLocation(next.location);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    loadStartupSession()
      .then((session) => {
        if (!isMounted) return;
        setUser(session.user);
        setProfile(session.profile);
        setLocation(session.location);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      location,
      loading,
      setProfile,
      setLocation,
      refreshProfile,
    }),
    [location, loading, profile, refreshProfile, user],
  );

  return (
    <UserSessionContext.Provider value={value}>
      {children}
    </UserSessionContext.Provider>
  );
}

export function useUserSession() {
  const ctx = useContext(UserSessionContext);
  if (!ctx) {
    throw new Error("useUserSession must be used inside <UserSessionProvider>");
  }
  return ctx;
}
