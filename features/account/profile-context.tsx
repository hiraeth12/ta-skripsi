import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import NetInfo from "@react-native-community/netinfo";
import {
  ACCOUNT_PROFILE,
  fetchProfileFromFirebase,
  ProfileData,
} from "./data/profile";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileContextValue = {
  /** Current profile data (optimistically updated on save) */
  profile: ProfileData;
  /** Call this after saving changes so all screens reflect updates instantly */
  setProfile: React.Dispatch<React.SetStateAction<ProfileData>>;
  /** True only on the very first load */
  loading: boolean;
  /** Force a fresh fetch (e.g. after a pull-to-refresh) */
  refetch: () => Promise<void>;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const ProfileContext = createContext<ProfileContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileData>(ACCOUNT_PROFILE);
  const [loading, setLoading] = useState(true);
  const profileLoaded = useRef(false);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await fetchProfileFromFirebase();
      setProfile(data);
      profileLoaded.current = true;
    } catch {
      // Keep previous / default data on error; NetInfo will retry on reconnect
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch once on mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Retry when internet comes back and profile wasn't loaded yet
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      if (online && !profileLoaded.current) {
        fetchProfile();
      }
    });
    return unsub;
  }, [fetchProfile]);

  return (
    <ProfileContext.Provider
      value={{ profile, setProfile, loading, refetch: fetchProfile }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProfileContext(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfileContext must be used inside <ProfileProvider>");
  }
  return ctx;
}