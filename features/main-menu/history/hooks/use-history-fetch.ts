import { getApp } from "@/config/firebase-init";
import { getPersistentCache, setPersistentCache, CACHE_KEYS } from "@/utils/cache";
import {
  endAt,
  get,
  getDatabase,
  orderByChild,
  query,
  ref,
  startAt,
} from "@react-native-firebase/database";
import { useCallback, useEffect, useState } from "react";
import { dedupeByKey } from "../utils/dedupe";
import {
  normalizeDirasakan,
  normalizeTerdeteksi,
  normalizeTsunamiList,
} from "../utils/normalize-helpers";
import { readRealtimeNode } from "../utils/read-realtime-node";
import {
  applyTsunamiHistoryFilters,
  normalizeTsunamiHistoryEvents,
  type TsunamiHistoryFilters,
} from "../utils/tsunami-history";
import {
  buildDirasakanDateRangesForIsoRange,
  buildDirasakanDateRange,
  buildTerdeteksiEventTimeMsRange,
  buildTerdeteksiEventTimeMsRangeFromIsoDates,
  isDirasakanInDateRange,
  matchesDirasakanMonth,
  serializeFilterMonths,
  sortDirasakanNewestFirst,
} from "../utils/filter";
import { areSameListItems, sortTsunamiListItems } from "../utils/list-utils";
import {
  isTerdeteksiInMonth,
  sortTerdeteksiNewestFirst,
} from "../utils/terdeteksi-history";
import type { HistoryEarthquakeTab, ListItem } from "../utils/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL!;
const TSUNAMI_HISTORY_CACHE_VERSION = "v3";

const TAB_CACHE: Record<HistoryEarthquakeTab, string> = {
  "GEMPA DIRASAKAN": CACHE_KEYS.DIRASAKAN_HISTORY ?? "dirasakan_history",
  "GEMPA TERDETEKSI": CACHE_KEYS.TERDETEKSI_HISTORY,
  "RIWAYAT TSUNAMI": CACHE_KEYS.TSUNAMI_HISTORY,
};

// ─── Types ────────────────────────────────────────────────────────────────────

type UseHistoryFetchParams = {
  activeTab: HistoryEarthquakeTab;
  effectiveYear: number;
  effectiveMonths: number[];
  tsunamiFilters: TsunamiHistoryFilters;
  userLat: number;
  userLon: number;
  filterMode?: "bulan" | "range";
  filterDateFrom?: string;
  filterDateTo?: string;
};

type UseHistoryFetchResult = {
  items: ListItem[];
  listLoading: boolean;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHistoryFetch({
  activeTab,
  effectiveYear,
  effectiveMonths,
  tsunamiFilters,
  userLat,
  userLon,
  filterMode = "bulan",
  filterDateFrom,
  filterDateTo,
}: UseHistoryFetchParams): UseHistoryFetchResult {
  const [items, setItems] = useState<ListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const setItemsIfChanged = useCallback((nextItems: ListItem[]) => {
    setItems((current) =>
      areSameListItems(current, nextItems) ? current : nextItems,
    );
  }, []);

  useEffect(() => {
    let isMounted = true;

    const isTsunami = activeTab === "RIWAYAT TSUNAMI";
    const isDir = activeTab === "GEMPA DIRASAKAN";
    const isRange = !isTsunami && filterMode === "range";

    const cacheKey = isTsunami
      ? `${TAB_CACHE[activeTab]}_${TSUNAMI_HISTORY_CACHE_VERSION}_${effectiveYear}`
      : isRange
        ? `${TAB_CACHE[activeTab]}_range_${filterDateFrom ?? ""}-${filterDateTo ?? ""}`
        : `${TAB_CACHE[activeTab]}_${effectiveYear}-${serializeFilterMonths(effectiveMonths)}`;

    async function fetchData() {
      // Phase 1: sajikan cache dulu agar tidak ada blank flash
      try {
        const cached = await getPersistentCache<ListItem[]>(cacheKey);
        if (cached && cached.length > 0 && isMounted) {
          setItemsIfChanged(isTsunami ? sortTsunamiListItems(cached) : cached);
          setListLoading(false);
        }
      } catch { }

      // Phase 2: fetch Firebase
      try {
        const app = getApp();
        const db = DATABASE_URL
          ? getDatabase(app, DATABASE_URL)
          : getDatabase(app);

        if (isTsunami) {
          const rawTsunamiEvents = await readRealtimeNode(
            db,
            DATABASE_URL,
            "tsunamiEvents",
          );
          if (!isMounted) return;

          if (!rawTsunamiEvents) {
            setItemsIfChanged([]);
            setListLoading(false);
            return;
          }

          const normalized = sortTsunamiListItems(
            normalizeTsunamiList(
              applyTsunamiHistoryFilters(
                normalizeTsunamiHistoryEvents(rawTsunamiEvents),
                tsunamiFilters,
              ),
            ),
          );

          setPersistentCache(cacheKey, normalized);
          if (isMounted) {
            setItemsIfChanged(normalized);
            setListLoading(false);
          }
          return;
        }

        const snapshots = await Promise.all(
          isRange && isDir
            ? buildDirasakanDateRangesForIsoRange(
                filterDateFrom,
                filterDateTo,
              ).map((range) =>
                get(
                  query(
                    ref(db, "gempa_dirasakan/items"),
                    orderByChild("date"),
                    startAt(range.start),
                    endAt(range.end),
                  ),
                ),
              )
            : isRange
              ? [
                  get(
                    query(
                      ref(db, "gempa_terdeteksi/items"),
                      orderByChild("eventTimeMs"),
                      startAt(
                        buildTerdeteksiEventTimeMsRangeFromIsoDates(
                          filterDateFrom,
                          filterDateTo,
                        ).start,
                      ),
                      endAt(
                        buildTerdeteksiEventTimeMsRangeFromIsoDates(
                          filterDateFrom,
                          filterDateTo,
                        ).end,
                      ),
                    ),
                  ),
                ]
              : effectiveMonths.map((month) => {
                  const range = isDir
                    ? buildDirasakanDateRange(effectiveYear, month)
                    : buildTerdeteksiEventTimeMsRange(effectiveYear, month);
                  const dataQuery = query(
                    ref(
                      db,
                      isDir ? "gempa_dirasakan/items" : "gempa_terdeteksi/items",
                    ),
                    orderByChild(isDir ? "date" : "eventTimeMs"),
                    startAt(range.start),
                    endAt(range.end),
                  );
                  return get(dataQuery);
                }),
        );
        if (!isMounted) return;

        if (!snapshots.some((s) => s.exists())) {
          setItemsIfChanged([]);
          setListLoading(false);
          return;
        }

        const combinedRaw: unknown[] = [];
        snapshots.forEach((snapshot) => {
          if (!snapshot.exists()) return;
          const value = snapshot.val();
          const arr = Array.isArray(value)
            ? value
            : value && typeof value === "object"
              ? Object.values(value)
              : [];
          combinedRaw.push(...arr);
        });

        const mergedNormalized = isDir
          ? normalizeDirasakan(combinedRaw, userLat, userLon)
          : normalizeTerdeteksi(combinedRaw, userLat, userLon);

        const filtered = isRange
          ? mergedNormalized.filter((item) =>
              isDir
                ? isDirasakanInDateRange(item, filterDateFrom, filterDateTo)
                : true,
            )
          : mergedNormalized.filter((item) =>
              effectiveMonths.some((month) =>
                isDir
                  ? matchesDirasakanMonth(item.tanggal, effectiveYear, month)
                  : isTerdeteksiInMonth(item, effectiveYear, month),
              ),
            );

        const normalized = isDir
          ? sortDirasakanNewestFirst(dedupeByKey(filtered, (item) => item.id))
          : sortTerdeteksiNewestFirst(dedupeByKey(filtered, (item) => item.id));
        setPersistentCache(cacheKey, normalized);

        if (isMounted) {
          setItemsIfChanged(normalized);
          setListLoading(false);
        }
      } catch {
        if (isMounted) setListLoading(false);
      }
    }

    setListLoading(true);
    void fetchData();

    return () => {
      isMounted = false;
    };
  }, [
    activeTab,
    effectiveMonths,
    effectiveYear,
    filterDateFrom,
    filterDateTo,
    filterMode,
    setItemsIfChanged,
    tsunamiFilters,
    userLat,
    userLon,
  ]);

  return { items, listLoading };
}
