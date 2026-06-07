import { haversineDistanceKm, parseCoordinateText } from "@/utils/geo";
import {
  normalizeTerdeteksiHistoryItem,
  sortTerdeteksiNewestFirst,
  toTerdeteksiHistoryArray,
} from "./terdeteksi-history";
import { getDirasakanEventTimeMs, sortDirasakanNewestFirst } from "./filter";
import type { TsunamiHistoryEvent } from "./tsunami-history";
import type { ListItem } from "./types";

export function normalizeDirasakan(
  rawData: unknown,
  userLat: number,
  userLon: number,
): ListItem[] {
  const candidates: any[] = Array.isArray(rawData)
    ? rawData
    : rawData && typeof rawData === "object"
      ? Object.values(rawData as object)
      : [];

  return sortDirasakanNewestFirst(candidates)
    .reduce<ListItem[]>((acc, candidate, index) => {
      const coordStr = String(candidate?.point?.coordinates ?? "");
      const [lonStr, latStr] = coordStr.split(",");
      const latitude = parseCoordinateText(
        candidate?.latitude ?? candidate?.lat ?? latStr,
      );
      const longitude = parseCoordinateText(
        candidate?.longitude ?? candidate?.lon ?? lonStr,
      );
      if (latitude === null || longitude === null) return acc;

      const distanceKm = haversineDistanceKm(
        userLat,
        userLon,
        latitude,
        longitude,
      ).toFixed(1);

      acc.push({
        id: String(
          candidate?.eventid ??
            candidate?.eventId ??
            `${candidate?.time ?? ""}-${candidate?.date ?? ""}-${index}`,
        ),
        latitude,
        longitude,
        magnitude: String(candidate?.magnitude ?? candidate?.mag ?? ""),
        lokasi: String(
          candidate?.area ?? candidate?.wilayah ?? candidate?.lokasi ?? "",
        ),
        waktu: `${String(candidate?.time ?? candidate?.jam ?? "")} • ${String(candidate?.date ?? candidate?.tanggal ?? "")}`,
        jarak: `${distanceKm} km dari lokasi Anda`,
        distanceKm,
        tanggal: String(candidate?.date ?? candidate?.tanggal ?? ""),
        jam: String(candidate?.time ?? candidate?.jam ?? ""),
        eventTimeMs: getDirasakanEventTimeMs(candidate),
        kedalaman: String(candidate?.depth ?? candidate?.kedalaman ?? ""),
        felt: String(candidate?.felt ?? ""),
        shakemap: candidate?.shakemap ? String(candidate.shakemap) : null,
      });
      return acc;
    }, []);
}

export function normalizeTerdeteksi(
  rawData: unknown,
  userLat: number,
  userLon: number,
): ListItem[] {
  return sortTerdeteksiNewestFirst(toTerdeteksiHistoryArray(rawData)).reduce<
    ListItem[]
  >((acc, rawItem) => {
    const item = normalizeTerdeteksiHistoryItem(rawItem);
    if (!item) return acc;

    const distanceKm = haversineDistanceKm(
      userLat,
      userLon,
      item.latitude,
      item.longitude,
    ).toFixed(1);

    acc.push({
      id: item.eventid,
      latitude: item.latitude,
      longitude: item.longitude,
      magnitude: item.magnitude,
      lokasi: item.lokasi,
      waktu: `${item.jam} • ${item.tanggal}`,
      jarak: `${distanceKm} km dari lokasi Anda`,
      distanceKm,
      tanggal: item.tanggal,
      jam: item.jam,
      eventTimeMs: item.eventTimeMs,
      kedalaman: item.kedalaman,
      felt: item.felt,
    });
    return acc;
  }, []);
}

export function normalizeTsunamiList(events: TsunamiHistoryEvent[]): ListItem[] {
  return events.map((event) => ({
    id: event.eventKey,
    latitude: event.latitude,
    longitude: event.longitude,
    magnitude: event.magnitude,
    lokasi: event.area,
    waktu: `${event.time} • ${event.date}`,
    jarak: "",
    distanceKm: "",
    tanggal: event.date,
    jam: event.time,
    kedalaman: event.depth,
    felt: "",
    eventType: "tsunami" as const,
    status: event.latestSubject,
    headline: event.latestHeadline,
    latestWarningId: event.latestWarningId,
  }));
}
