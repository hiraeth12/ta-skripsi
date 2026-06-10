import { useEffect, useRef } from "react";
import { AppState } from "react-native";

export type PollResult = { changed: boolean; ok: boolean };

type Options = {
  /** Delay awal dan reset saat data berubah. Default: 30_000 */
  minMs?: number;
  /** Batas maksimum delay backoff. Default: 120_000 */
  maxMs?: number;
  /** Apakah polling aktif. Polling berhenti total saat false. */
  isActive: boolean;
};

/**
 * Menjalankan polling dengan exponential backoff.
 *
 * - Saat `ok: false` (network error) → delay naik 15 detik tiap gagal, max `maxMs`
 * - Saat `ok: true, changed: false` → delay naik 10 detik tiap poll, max `maxMs`
 * - Saat `ok: true, changed: true` → delay reset ke `minMs`
 * - Saat app kembali ke foreground → delay reset ke `minMs` dan poll langsung
 *
 * @param fetcher  Fungsi async yang melakukan fetch. Menerima `silent: boolean`,
 *                 harus return `{ changed, ok }`. Gunakan `abortSignal` untuk
 *                 membatalkan request saat cleanup (opsional).
 * @param options  `isActive`, `minMs`, `maxMs`
 */
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