import { useCallback, useRef, useState } from "react";

export function useNetworkError() {
  const [networkErrorVisible, setNetworkErrorVisible] = useState(false);
  const networkErrorShownRef = useRef(false);

  const showNetworkError = useCallback(() => {
    if (networkErrorShownRef.current) return;
    networkErrorShownRef.current = true;
    setNetworkErrorVisible(true);
  }, []);

  const dismissNetworkError = useCallback(() => {
    setNetworkErrorVisible(false);
    networkErrorShownRef.current = false;
  }, []);

  return { networkErrorVisible, showNetworkError, dismissNetworkError };
}
