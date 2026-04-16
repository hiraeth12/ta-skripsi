export type WaveColor = "none" | "orange" | "red";

export type AreaProps = {
  mhid: string;
  alt_name: string;
  center: [number, number];
  color: WaveColor;
  hit: boolean;
  distance?: number;
};

export type InfoGempa = {
  id: string;
  lng: number;
  lat: number;
  mag: number;
  depth: number;
  message: string;
  place?: string;
  time: number;
};

export type WaveState = {
  id: string;
  center: [number, number];
  mag: number;
  depth: number;
  pWaveRadiusMeters: number;
  sWaveRadiusMeters: number;
  areaTerdampak: AreaProps[];
};

export type HighlightFeatureProps = AreaProps;

export type WaveHighlightResult = {
  highlightFeatures: HighlightFeatureProps[];
  waves: WaveState[];
};
