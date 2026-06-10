import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import NetInfo from "@react-native-community/netinfo";
import {
  ACCOUNT_PROFILE,
  ProfileData,
} from "./data/profile";
import { useUserSession } from "./user-session-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileContextValue = {
  /** Current profile data (optimistically updated on save) */
  profile: ProfileData;
  /** Call this after saving changes so all screens reflect updates instantly */
  setProfile: Dispatch<SetStateAction<ProfileData>>;
  /** True only on the very first load */
  loading: boolean;
  /** Force a fresh fetch (e.g. after a pull-to-refresh) */
  refetch: () => Promise<void>;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const ProfileContext = createContext<ProfileContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ProfileProvider({ children }: { children: ReactNode }) {
  const session = useUserSession();
  const [profile, setLocalProfile] = useState<ProfileData>(
    session.profile ?? ACCOUNT_PROFILE,
  );
  const [loading, setLoading] = useState(session.loading && !session.profile);
  const profileLoaded = useRef(false);

  const fetchProfile = useCallback(async () => {
    try {
      await session.refreshProfile();
      profileLoaded.current = true;
    } catch {
      // Keep previous / default data on error; NetInfo will retry on reconnect
    } finally {
      setLoading(false);
    }
  }, [session]);

  const setProfile: Dispatch<SetStateAction<ProfileData>> =
    useCallback(
      (next) => {
        setLocalProfile((current) => {
          const resolved =
            typeof next === "function"
              ? (next as (value: ProfileData) => ProfileData)(current)
              : next;
          session.setProfile(resolved);
          return resolved;
        });
      },
      [session],
    );

  useEffect(() => {
    if (!session.profile) return;
    setLocalProfile(session.profile);
    profileLoaded.current = true;
    setLoading(false);
  }, [session.profile]);

  // Fetch once on mount
  useEffect(() => {
    if (session.loading) return;
    if (session.profile) return;
    fetchProfile();
  }, [fetchProfile, session.loading, session.profile]);

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
