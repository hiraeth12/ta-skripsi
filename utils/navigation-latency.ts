import { router, type Href } from "expo-router";

let currentPathname: string | null = null;
let pendingNavigation: { from: string; startedAt: number } | null = null;
let isRouterPatched = false;

function getNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function normalizePath(value: string) {
  const withoutHash = value.split("#", 1)[0] || "/";
  const withoutQuery = withoutHash.split("?", 1)[0] || "/";
  return withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
}

function getHrefPath(href: Href) {
  if (typeof href === "string") {
    return normalizePath(href);
  }

  if (href && typeof href === "object" && "pathname" in href) {
    const pathname = href.pathname;
    return typeof pathname === "string" ? normalizePath(pathname) : null;
  }

  return null;
}

export function setNavigationLatencyPath(pathname: string) {
  currentPathname = normalizePath(pathname);
}

export function startNavigationLatency(
  fromPath: string | null | undefined,
  toPath?: string | null,
) {
  if (!fromPath) {
    return;
  }

  const from = normalizePath(fromPath);
  const to = toPath ? normalizePath(toPath) : null;

  if (to && to === from) {
    return;
  }

  pendingNavigation = {
    from,
    startedAt: getNow(),
  };
}

export function finishNavigationLatency(toPath: string) {
  if (!pendingNavigation) {
    return;
  }

  const to = normalizePath(toPath);
  if (pendingNavigation.from === to) {
    pendingNavigation = null;
    return;
  }

  const latencyMs = Math.max(0, Math.round(getNow() - pendingNavigation.startedAt));
  console.log(
    `[LATENCY LOG] Perpindahan halaman: ${pendingNavigation.from} -> ${to} dalam ${latencyMs} ms`,
  );
  pendingNavigation = null;
}

export function installNavigationLatencyRouterPatch() {
  if (isRouterPatched) {
    return;
  }

  isRouterPatched = true;

  const originalPush = router.push;
  const originalReplace = router.replace;
  const originalNavigate = router.navigate;
  const originalBack = router.back;
  const originalDismiss = router.dismiss;
  const originalDismissTo = router.dismissTo;
  const originalDismissAll = router.dismissAll;

  router.push = (href, options) => {
    startNavigationLatency(currentPathname, getHrefPath(href));
    originalPush(href, options);
  };

  router.replace = (href, options) => {
    startNavigationLatency(currentPathname, getHrefPath(href));
    originalReplace(href, options);
  };

  router.navigate = (href, options) => {
    startNavigationLatency(currentPathname, getHrefPath(href));
    originalNavigate(href, options);
  };

  router.back = () => {
    if (router.canGoBack()) {
      startNavigationLatency(currentPathname);
    }
    originalBack();
  };

  router.dismiss = (count) => {
    if (router.canDismiss()) {
      startNavigationLatency(currentPathname);
    }
    originalDismiss(count);
  };

  router.dismissTo = (href, options) => {
    startNavigationLatency(currentPathname, getHrefPath(href));
    originalDismissTo(href, options);
  };

  router.dismissAll = () => {
    if (router.canDismiss()) {
      startNavigationLatency(currentPathname);
    }
    originalDismissAll();
  };
}
