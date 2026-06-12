import { useEffect, useRef } from "react";
import { AppState } from "react-native";

export type PollResult = { changed: boolean; ok: boolean };

type Options = {
  minMs?: number;
  maxMs?: number;
  isActive: boolean;
};

export function usePollingWithBackoff(
  fetcher: (silent: boolean, abortSignal: AbortSignal) => Promise<PollResult>,
  options: Options,
) {
  const { isActive, minMs = 30_000, maxMs = 120_000 } = options;

  const isMountedRef = useRef(true);
  const pollDelayRef = useRef(minMs);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isActive) return;

    isMountedRef.current = true;
    abortRef.current = new AbortController();

    function clearPollTimer() {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    }

    function scheduleNextPoll({ changed, ok }: PollResult) {
      if (!isMountedRef.current) return;
      if (!ok) {
        pollDelayRef.current = Math.min(pollDelayRef.current + 15_000, maxMs);
      } else {
        pollDelayRef.current = changed
          ? minMs
          : Math.min(pollDelayRef.current + 10_000, maxMs);
      }
      clearPollTimer();
      pollTimerRef.current = setTimeout(runPollingLoop, pollDelayRef.current);
    }

    async function runPollingLoop() {
      const result = await fetcher(true, abortRef.current!.signal);
      scheduleNextPoll(result);
    }

    // Fetch pertama tidak silent (tampilkan loading)
    fetcher(false, abortRef.current.signal).then(scheduleNextPoll);

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active" && isMountedRef.current) {
        pollDelayRef.current = minMs;
        clearPollTimer();
        runPollingLoop();
      }
    });

    return () => {
      isMountedRef.current = false;
      clearPollTimer();
      abortRef.current?.abort();
      appStateSub.remove();
    };
  }, [isActive]); // fetcher sengaja tidak di deps — harus stabil (dibungkus useCallback di caller)
}