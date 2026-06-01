import { useRootNavigationState, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import {
  loadStartupSession,
  type StartupRoute,
} from "@/features/main-menu/account/session";

function hideSplashAfterNavigation() {
  requestAnimationFrame(() => {
    SplashScreen.hideAsync().catch(() => {});
  });
}

export default function StartupRedirect() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!rootNavigationState?.key) return;
    let cancelled = false;

    async function redirectToStartupRoute() {
      let route: StartupRoute = "/starter/sign-in";

      try {
        const session = await loadStartupSession();
        route = session.route;
      } catch {
        route = "/starter/sign-in";
      }

      if (cancelled) return;
      router.replace(route);
      hideSplashAfterNavigation();
    }

    redirectToStartupRoute();

    return () => {
      cancelled = true;
    };
  }, [router, rootNavigationState?.key]);

  return null;
}
