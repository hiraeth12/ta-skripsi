import { useMemo } from "react";
import {
  clampYearMonth,
  getNowYearMonth,
  normalizeFilterMonths,
  parseFilterMonthsParam,
  type HistoryTabKey,
} from "../utils/filter";
import type { TsunamiHistoryFilters } from "../utils/tsunami-history";
import type { HistoryEarthquakeTab } from "../utils/types";

type Params = {
  activeTab: HistoryEarthquakeTab;
  rawYear: number;
  rawMonth: number;
  rawMonthsParam: string;
  now: Date;
};

type Result = {
  effectiveFilter: { year: number; month: number };
  effectiveMonths: number[];
  tsunamiFilters: TsunamiHistoryFilters;
  tabKey: HistoryTabKey;
};

export function useHistoryFilter({
  activeTab,
  rawYear,
  rawMonth,
  rawMonthsParam,
  now,
}: Params): Result {
  const tabKey = useMemo<HistoryTabKey>(
    () =>
      activeTab === "RIWAYAT TSUNAMI"
        ? "tsunami"
        : activeTab === "GEMPA TERDETEKSI"
          ? "terdeteksi"
          : "dirasakan",
    [activeTab],
  );

  const effectiveFilter = useMemo(() => {
    const fallback = getNowYearMonth(now);
    const base = {
      year: Number.isFinite(rawYear) ? rawYear : fallback.year,
      month: Number.isFinite(rawMonth) ? rawMonth : fallback.month,
    };
    return clampYearMonth(base, tabKey, now);
  }, [now, rawMonth, rawYear, tabKey]);

  const rawMonths = useMemo(
    () => parseFilterMonthsParam(rawMonthsParam),
    [rawMonthsParam],
  );

  const effectiveMonths = useMemo(() => {
    const baseMonths =
      rawMonths.length > 0 ? rawMonths : [effectiveFilter.month];
    return normalizeFilterMonths(baseMonths, effectiveFilter.year, tabKey, now);
  }, [effectiveFilter.month, effectiveFilter.year, now, rawMonths, tabKey]);

  const tsunamiFilters = useMemo<TsunamiHistoryFilters>(
    () => ({ year: effectiveFilter.year }),
    [effectiveFilter.year],
  );

  return { effectiveFilter, effectiveMonths, tsunamiFilters, tabKey };
}