import type { GeoLocation } from "@/utils/geo";

export type DirasakanQuake = {
  distanceKm: string;
  magnitude: string;
  kedalaman: string;
  latText: string;
  lonText: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  felt: string;
  description?: string;
  latitude: number;
  longitude: number;
};

export type TerdeteksiQuake = {
  distanceKm: string;
  magnitude: string;
  kedalaman: string;
  latText: string;
  lonText: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  fase: string;
  latitude: number;
  longitude: number;
  eventId?: string;
};

export interface FirebaseLocation extends GeoLocation {
  name: string;
  image?: string;
}

export type ApplyHomeUserDataOptions = {
  showImageLoading?: boolean;
};
