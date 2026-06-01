import { useCallback, useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ExternalSelection } from "../utils/types";

function asSingle(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

type UseExternalSelectionResult = {
  externalSelection: ExternalSelection | null;
  clearSelectionParams: () => void;
};

/**
 * Membaca semua URL params yang berkaitan dengan event yang dipilih dari list,
 * lalu membentuknya menjadi satu objek ExternalSelection yang sudah divalidasi.
 * Mengembalikan null jika eventId atau koordinat tidak valid.
 */
export function useExternalSelection(): UseExternalSelectionResult {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{
    selectedEventId?: string;
    selectedLatitude?: string;
    selectedLongitude?: string;
    selectedMagnitude?: string;
    selectedLocation?: string;
    selectedWaktu?: string;
    selectedJarak?: string;
    selectedDistanceKm?: string;
    selectedTanggal?: string;
    selectedJam?: string;
    selectedKedalaman?: string;
    selectedFelt?: string;
    selectedShakemap?: string;
    selectedStatus?: string;
    selectedHeadline?: string;
    selectedLatestWarningId?: string;
  }>();

  const externalSelection = useMemo<ExternalSelection | null>(() => {
    const eventId = asSingle(searchParams.selectedEventId);
    const latitude = parseFloat(asSingle(searchParams.selectedLatitude));
    const longitude = parseFloat(asSingle(searchParams.selectedLongitude));

    if (!eventId || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return null;
    }

    const waktu = asSingle(searchParams.selectedWaktu);
    const [fallbackJam, fallbackTanggal] = waktu
      .split("\u2022")
      .map((p) => p.trim());

    const selectedJarak = asSingle(searchParams.selectedJarak);
    const distanceKm =
      asSingle(searchParams.selectedDistanceKm) ||
      selectedJarak.replace(/[^0-9.,]/g, "") ||
      "0";

    return {
      eventId,
      latitude,
      longitude,
      magnitude: asSingle(searchParams.selectedMagnitude) || "-",
      lokasi: asSingle(searchParams.selectedLocation) || "-",
      tanggal: asSingle(searchParams.selectedTanggal) || fallbackTanggal || "",
      jam: asSingle(searchParams.selectedJam) || fallbackJam || "",
      distanceKm,
      kedalaman: asSingle(searchParams.selectedKedalaman) || "-",
      felt: asSingle(searchParams.selectedFelt),
      shakemap: asSingle(searchParams.selectedShakemap) || null,
      status: asSingle(searchParams.selectedStatus) || "-",
      headline: asSingle(searchParams.selectedHeadline) || "-",
      latestWarningId: asSingle(searchParams.selectedLatestWarningId) || "",
    };
  }, [
    searchParams.selectedDistanceKm,
    searchParams.selectedEventId,
    searchParams.selectedFelt,
    searchParams.selectedHeadline,
    searchParams.selectedJam,
    searchParams.selectedJarak,
    searchParams.selectedKedalaman,
    searchParams.selectedLatestWarningId,
    searchParams.selectedLatitude,
    searchParams.selectedLocation,
    searchParams.selectedLongitude,
    searchParams.selectedMagnitude,
    searchParams.selectedShakemap,
    searchParams.selectedStatus,
    searchParams.selectedTanggal,
    searchParams.selectedWaktu,
  ]);

  const clearSelectionParams = useCallback(() => {
    router.setParams({
      tab: undefined,
      selectedEventId: undefined,
      selectedLatitude: undefined,
      selectedLongitude: undefined,
      selectedMagnitude: undefined,
      selectedLocation: undefined,
      selectedWaktu: undefined,
      selectedJarak: undefined,
      selectedDistanceKm: undefined,
      selectedTanggal: undefined,
      selectedJam: undefined,
      selectedKedalaman: undefined,
      selectedFelt: undefined,
      selectedShakemap: undefined,
      selectedStatus: undefined,
      selectedHeadline: undefined,
      selectedLatestWarningId: undefined,
    });
  }, [router]);

  return { externalSelection, clearSelectionParams };
}