import { haversineDistanceKm, parseCoordinateText } from "@/utils/geo";
import type { TsunamiHistoryEvent } from "./tsunami-history";
import type { ListItem } from "./types";

// ─── Dirasakan ────────────────────────────────────────────────────────────────

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

  return candidates
    .sort((a, b) =>
      String(b?.eventid ?? b?.timesent ?? "").localeCompare(
        String(a?.eventid ?? a?.timesent ?? ""),
      ),
    )
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
        kedalaman: String(candidate?.depth ?? candidate?.kedalaman ?? ""),
        felt: String(candidate?.felt ?? ""),
        shakemap: candidate?.shakemap ? String(candidate.shakemap) : null,
      });
      return acc;
    }, []);
}

// ─── Terdeteksi ───────────────────────────────────────────────────────────────

export function normalizeTerdeteksi(
  rawData: unknown,
  userLat: number,
  userLon: number,
): ListItem[] {
  const nodeArray: any[] = Array.isArray(rawData)
    ? rawData
    : rawData && typeof rawData === "object"
      ? Object.values(rawData as object)
      : [];

  return [...nodeArray]
    .sort((a, b) =>
      String(b?.time ?? b?.properties?.time ?? "").localeCompare(
        String(a?.time ?? a?.properties?.time ?? ""),
      ),
    )
    .reduce<ListItem[]>((acc, item, index) => {
      const coords = item?.geometry?.coordinates || item?.coordinates;
      const longitude = parseCoordinateText(
        item?.longitude ?? item?.lon ?? coords?.longitude ?? coords?.[0],
      );
      const latitude = parseCoordinateText(
        item?.latitude ?? item?.lat ?? coords?.latitude ?? coords?.[1],
      );
      if (latitude === null || longitude === null) return acc;

      const props = item?.properties ?? item;
      const [tanggalFromTime, jamRaw] = String(props?.time ?? "").split(" ");
      const jamFromTime = (jamRaw ?? "").split(".")[0];
      const distanceKm = haversineDistanceKm(
        userLat,
        userLon,
        latitude,
        longitude,
      ).toFixed(1);

      acc.push({
        id: String(
          props?.eventid ??
            props?.eventId ??
            `${props?.time ?? ""}-${latitude}-${longitude}-${index}`,
        ),
        latitude,
        longitude,
        magnitude: String(props?.magnitude ?? props?.mag ?? "0.0"),
        lokasi: String(props?.lokasi ?? props?.place ?? props?.area ?? ""),
        waktu: `${String(props?.jam ?? jamFromTime ?? "")} • ${String(props?.tanggal ?? tanggalFromTime ?? "")}`,
        jarak: `${distanceKm} km dari lokasi Anda`,
        distanceKm,
        tanggal: String(props?.tanggal ?? tanggalFromTime ?? ""),
        jam: String(props?.jam ?? jamFromTime ?? ""),
        kedalaman: String(props?.kedalaman ?? props?.depth ?? ""),
        felt: String(props?.felt ?? props?.fase ?? ""),
      });
      return acc;
    }, []);
}

// ─── Tsunami ──────────────────────────────────────────────────────────────────

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