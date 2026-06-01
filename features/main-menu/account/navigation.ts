import type { Router } from "expo-router";

export const ACCOUNT_ROUTE = "/main-menu/account";

export function goBackToAccount(router: Router) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(ACCOUNT_ROUTE);
}

