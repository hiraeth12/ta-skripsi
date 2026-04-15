
export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapViewType = {
  animateToRegion: (region: Region, duration?: number) => void;
};

export const DEFAULT_MAP_REGION: Region = {
  latitude: -6.2088,
  longitude: 106.8456,
  latitudeDelta: 5,
  longitudeDelta: 5,
};
