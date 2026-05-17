import Mapbox from "@rnmapbox/maps";
import { memo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

type CardMapProps = {
  latitude: number | string;
  longitude: number | string;
  magnitude?: string | number;
};

// ─── Module-level helpers ─────────────────────────────────────────────────────

const parseCoordinate = (coord: string, type: "lat" | "lon"): number => {
  const match = coord.match(/[\d.]+/);
  if (!match) return 0;
  const value = parseFloat(match[0]);
  if (type === "lat") return coord.includes("LS") ? -Math.abs(value) : Math.abs(value);
  return coord.includes("BB") ? -Math.abs(value) : Math.abs(value);
};

const getMagnitudeColor = (mag?: string | number): string => {
  const v = typeof mag === "string" ? parseFloat(mag) : (mag ?? 0);
  if (v < 4) return "#eab308";
  if (v < 5) return "#f97316";
  if (v < 6) return "#ef4444";
  return "#7c2d12";
};

// ─── Component ────────────────────────────────────────────────────────────────

export const CardMap = memo(({ latitude, longitude, magnitude }: CardMapProps) => {
  const [mapReady, setMapReady] = useState(false);
  const cameraRef = useRef<Mapbox.Camera | null>(null);

  const parsedLat = typeof latitude === "string" ? parseCoordinate(latitude, "lat") : latitude;
  const parsedLon = typeof longitude === "string" ? parseCoordinate(longitude, "lon") : longitude;
  const validLat = isNaN(parsedLat) ? -6.9175 : parsedLat;
  const validLon = isNaN(parsedLon) ? 107.6191 : parsedLon;

  const magNum = typeof magnitude === "string" ? parseFloat(magnitude) : (magnitude ?? 0);
  const dotSize = 20 + magNum * 2;
  const color = getMagnitudeColor(magnitude);

  const shape: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [validLon, validLat] },
        properties: { magnitude: String(magnitude ?? "0") },
      },
    ],
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={[styles.map, !mapReady && styles.hidden]}
        surfaceView={false} // fixes Android black screen on loading
        styleURL={Mapbox.StyleURL.Street}
        zoomEnabled={false}
        scrollEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        compassEnabled={false}
        logoEnabled={false}
        scaleBarEnabled={false}
        attributionEnabled={false}
        onDidFinishLoadingMap={() => setMapReady(true)}
      >
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [validLon, validLat],
            zoomLevel: 6,
          }}
        />

        <Mapbox.ShapeSource id="epicenterSource" shape={shape}>
          <Mapbox.CircleLayer
            id="epicenterCircle"
            style={{
              circlePitchAlignment: "map",
              circleRadius: dotSize,
              circleColor: color,
              circleOpacity: 0.8,
            }}
          />
          <Mapbox.CircleLayer
            id="epicenterCircleOutline"
            style={{
              circlePitchAlignment: "map",
              circleRadius: dotSize + 3,
              circleColor: "transparent",
              circleStrokeWidth: 2,
              circleStrokeColor: color,
              circleOpacity: 0.5,
            }}
          />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>

      {!mapReady && <View style={[StyleSheet.absoluteFill, styles.placeholder]} />}
    </View>
  );
});

CardMap.displayName = "CardMap";

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 180,
    overflow: "hidden",
    backgroundColor: "#e8edf2",
  },
  map: {
    flex: 1,
  },
  hidden: {
    opacity: 0,
  },
  placeholder: {
    backgroundColor: "#e8edf2",
    zIndex: 1, // ensure it covers the loading map
  },
});
