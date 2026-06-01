type LogoutAction = () => Promise<boolean>;
type LogoutTransitionRunner = (action: LogoutAction) => Promise<boolean>;

let logoutTransitionRunner: LogoutTransitionRunner | null = null;

export function setLogoutTransitionRunner(runner: LogoutTransitionRunner) {
  logoutTransitionRunner = runner;

  return () => {
    if (logoutTransitionRunner === runner) {
      logoutTransitionRunner = null;
    }
  };
}

export function runLogoutTransition(action: LogoutAction) {
  return logoutTransitionRunner ? logoutTransitionRunner(action) : action();
}
