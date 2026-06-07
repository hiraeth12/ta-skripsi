import { CACHE_KEYS, getCachedData, setCacheData } from "@/utils/cache";
import type { UserLocation } from "@/features/main-menu/account/session";
import { haversineDistanceKm } from "@/utils/geo";
import { XMLParser } from "fast-xml-parser";
import { useCallback, useRef, useState } from "react";
import type { TsunamiQuake } from "../components/tsunami-card";
import { DIRASAKAN_API_URL, TERDETEKSI_API_URL_FAST, TSUNAMI_API_URL } from "../constants";
import type { DirasakanQuake, TerdeteksiQuake } from "../types";
import { buildShakemapUrl, buildNarasiUrl, buildHistoryUrl, formatCoord } from "../utils/coord-utils";
import { parseDirasakanPayload } from "../utils/parse-dirasakan";
import { getLatestTerdeteksiGempa, parseTerdeteksiPayload } from "../utils/parse-terdeteksi";
import { getLatestTsunamiQuake } from "../utils/parse-tsunami";

function withCacheBuster(url: string): string {
  const base = url.trim();
  if (!base) return "";
  if (base.endsWith("=") || base.endsWith("?") || base.endsWith("&")) {
    return `${base}${Date.now()}`;
  }
  return `${base}${base.includes("?") ? "&" : "?"}t=${Date.now()}`;
}

const xmlParser = new XMLParser({ ignoreAttributes: false });
async function checkNarasiAvailable(
  narasiUrl: string,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const res = await fetch(narasiUrl, { method: "HEAD", signal });
    return res.ok ? narasiUrl : null;
  } catch {
    return null;
  }
}

export function useHomeData(isMountedRef: React.RefObject<boolean>) {
  const [dirasakanData, setDirasakanData] = useState<DirasakanQuake | null>(
    () => getCachedData(CACHE_KEYS.DIRASAKAN) ?? null,
  );
  const [terdeteksiData, setTerdeteksiData] = useState<TerdeteksiQuake | null>(
    () => getCachedData(CACHE_KEYS.TERDETEKSI) ?? null,
  );
  const [tsunamiData, setTsunamiData] = useState<TsunamiQuake | null>(
    () => getCachedData(CACHE_KEYS.TSUNAMI) ?? null,
  );
  const [dirasakanShakeMapUrl, setDirasakanShakeMapUrl] = useState<
    string | null
  >(null);
  // URL narasi resmi: null = belum dicek / tidak tersedia, string = tersedia
  const [dirasakanNarasiUrl, setDirasakanNarasiUrl] = useState<string | null>(null);
  const [tsunamiNarasiUrl, setTsunamiNarasiUrl] = useState<string | null>(null);
  const [terdeteksiHistoryUrl, setTerdeteksiHistoryUrl] = useState<string | null>(null);
  const terdeteksiHistoryEventIdRef = useRef<string | null>(null);

  const fetchLatestHomeCards = useCallback(
    async (
      location: UserLocation,
      signal?: AbortSignal,
    ) => {
      async function fetchDirasakan() {
        if (!DIRASAKAN_API_URL) return;

        const res = await fetch(withCacheBuster(DIRASAKAN_API_URL), { signal });
        if (!res.ok) throw new Error(`dirasakan fetch failed: ${res.status}`);

        const raw = await res.text();
        let latest: unknown = null;

        try {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          const info = parsed?.info;
          latest = Array.isArray(info) ? info[0] : info;
        } catch {
          const parsed = xmlParser.parse(raw) as Record<string, unknown>;
          const info = (parsed?.alert as Record<string, unknown>)?.info;
          latest = Array.isArray(info) ? info[0] : info;
        }

        if (!latest || signal?.aborted || !isMountedRef.current) return;

        const p = parseDirasakanPayload(latest);
        if (!p) return;

        const [lonStr, latStr] = p.coordStr.split(",");
        const latitude = parseFloat(latStr);
        const longitude = parseFloat(lonStr);
        if (isNaN(latitude) || isNaN(longitude)) return;

        const { latitude: uLat, longitude: uLon } = location;
        const latCoord = formatCoord(latitude);
        const lonCoord = formatCoord(longitude);

        const data: DirasakanQuake = {
          distanceKm: haversineDistanceKm(uLat, uLon, latitude, longitude).toFixed(1),
          magnitude: p.magnitude,
          kedalaman: p.kedalaman,
          latText: `${latCoord.text}°${latCoord.latLabel}`,
          lonText: `${lonCoord.text}°${lonCoord.lonLabel}`,
          wilayah: p.wilayah,
          tanggal: p.tanggal,
          jam: p.jam,
          felt: p.felt,
          description: p.description,
          latitude,
          longitude,
        };

        setCacheData(CACHE_KEYS.DIRASAKAN, data);
        if (isMountedRef.current && !signal?.aborted) {
          setDirasakanData((prev) =>
            prev?.tanggal === data.tanggal &&
            prev?.jam === data.jam &&
            prev?.distanceKm === data.distanceKm
              ? prev
              : data,
          );

          // Set shakemap URL
          const shakemapUrl = p.shakemap ? buildShakemapUrl(p.shakemap) : null;
          setDirasakanShakeMapUrl(shakemapUrl);

          // Cek dan set narasi URL dari shakemap event ID
          if (p.shakemap) {
            const narasiUrl = buildNarasiUrl(p.shakemap);
            if (narasiUrl) {
              // Reset dulu ke null (sembunyikan button) sampai cek selesai
              setDirasakanNarasiUrl(null);
              const available = await checkNarasiAvailable(narasiUrl, signal);
              if (isMountedRef.current && !signal?.aborted) {
                setDirasakanNarasiUrl(available);
              }
            } else {
              setDirasakanNarasiUrl(null);
            }
          } else {
            setDirasakanNarasiUrl(null);
          }
        }
      }

      async function fetchTerdeteksi() {
        if (!TERDETEKSI_API_URL_FAST) return;

        const res = await fetch(withCacheBuster(TERDETEKSI_API_URL_FAST), { signal });
        if (!res.ok) throw new Error(`terdeteksi fetch failed: ${res.status}`);

        const raw = await res.text();
        const xml = xmlParser.parse(raw) as Record<string, unknown>;
        const gempaNode = getLatestTerdeteksiGempa(xml);
        if (!gempaNode || signal?.aborted || !isMountedRef.current) return;

        const parsed = parseTerdeteksiPayload(gempaNode);
        if (!parsed) return;

        const eventId = parsed.eventId.trim();

        const { latitude: uLat, longitude: uLon } = location;
        const latCoord = formatCoord(parsed.latitude);
        const lonCoord = formatCoord(parsed.longitude);

        const data: TerdeteksiQuake = {
          distanceKm: haversineDistanceKm(uLat, uLon, parsed.latitude, parsed.longitude).toFixed(1),
          magnitude: parsed.magnitude,
          kedalaman: parsed.kedalaman,
          latText: `${latCoord.text}°${latCoord.latLabel}`,
          lonText: `${lonCoord.text}°${lonCoord.lonLabel}`,
          wilayah: parsed.wilayah,
          tanggal: parsed.tanggal,
          jam: parsed.jam,
          status: parsed.status,
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          eventId: eventId || undefined,
        };

        setCacheData(CACHE_KEYS.TERDETEKSI, data);
        if (isMountedRef.current && !signal?.aborted) {
          setTerdeteksiData((prev) =>
            prev?.tanggal === data.tanggal &&
            prev?.jam === data.jam &&
            prev?.distanceKm === data.distanceKm
              ? prev
              : data,
          );

          const historyUrl = eventId ? buildHistoryUrl(eventId) : null;
          if (!eventId || !historyUrl) {
            terdeteksiHistoryEventIdRef.current = null;
            setTerdeteksiHistoryUrl(null);
            return;
          }

          if (terdeteksiHistoryEventIdRef.current !== eventId) {
            terdeteksiHistoryEventIdRef.current = eventId;
            setTerdeteksiHistoryUrl(null);
          }

          const available = await checkNarasiAvailable(historyUrl, signal);
          if (
            isMountedRef.current &&
            !signal?.aborted &&
            terdeteksiHistoryEventIdRef.current === eventId
          ) {
            setTerdeteksiHistoryUrl(available);
          }
        }
      }

      async function fetchTsunami() {
        if (!TSUNAMI_API_URL) return;

        const res = await fetch(withCacheBuster(TSUNAMI_API_URL), { signal });
        if (!res.ok) throw new Error(`tsunami fetch failed: ${res.status}`);

        const raw = await res.text();
        const parsed = xmlParser.parse(raw) as Record<string, unknown>;

        const data = getLatestTsunamiQuake(parsed);
        if (!data || signal?.aborted || !isMountedRef.current) return;

        setCacheData(CACHE_KEYS.TSUNAMI, data);
        if (isMountedRef.current && !signal?.aborted) {
          setTsunamiData((prev) =>
            prev?.tanggal === data.tanggal &&
            prev?.jam === data.jam &&
            prev?.subject === data.subject
              ? prev
              : data,
          );

          // Cek dan set narasi URL dari shakemap tsunami
          if (data.shakemap) {
            const narasiUrl = buildNarasiUrl(data.shakemap);
            if (narasiUrl) {
              setTsunamiNarasiUrl(null);
              const available = await checkNarasiAvailable(narasiUrl, signal);
              if (isMountedRef.current && !signal?.aborted) {
                setTsunamiNarasiUrl(available);
              }
            } else {
              setTsunamiNarasiUrl(null);
            }
          } else {
            setTsunamiNarasiUrl(null);
          }
        }
      }

      await Promise.all([fetchDirasakan(), fetchTerdeteksi(), fetchTsunami()]);
    },
    [isMountedRef],
  );

  return {
    dirasakanData,
    setDirasakanData,
    terdeteksiData,
    setTerdeteksiData,
    tsunamiData,
    setTsunamiData,
    dirasakanShakeMapUrl,
    dirasakanNarasiUrl,
    tsunamiNarasiUrl,
    terdeteksiHistoryUrl,
    fetchLatestHomeCards,
  };
}
