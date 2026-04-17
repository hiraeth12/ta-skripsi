import Mapbox from "@rnmapbox/maps";
import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || "";
Mapbox.setAccessToken(MAPBOX_TOKEN);

type CardMapProps = {
  latitude: number | string;
  longitude: number | string;
  magnitude?: string | number;
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 180,
    backgroundColor: "#f0f0f0",
  },
  map: {
    flex: 1,
  },
});

// Helper function to parse formatted coordinate strings like "6.25°LS" or "107.18°BT"
const parseCoordinate = (
  coordString: string,
  type: "lat" | "lon"
): number => {
  if (!coordString) return 0;

  // Extract the numeric part
  const numericMatch = coordString.match(/[\d.]+/);
  if (!numericMatch) return 0;

  const value = parseFloat(numericMatch[0]);

  if (type === "lat") {
    // If ends with LS (Lintang Selatan) or LU (Lintang Utara)
    return coordString.includes("LS") ? -Math.abs(value) : Math.abs(value);
  } else {
    // If ends with BB (Bujur Barat) or BT (Bujur Timur)
    return coordString.includes("BB") ? -Math.abs(value) : Math.abs(value);
  }
};

export const CardMap = ({ latitude, longitude, magnitude }: CardMapProps) => {
  const cameraRef = useRef<Mapbox.Camera | null>(null);

  // Handle both raw coordinates and formatted string coordinates
  const parsedLat = typeof latitude === "string" 
    ? parseCoordinate(latitude, "lat") 
    : latitude;
  const parsedLon = typeof longitude === "string" 
    ? parseCoordinate(longitude, "lon") 
    : longitude;

  // Validate coordinates
  const validLat = isNaN(parsedLat) ? -6.9175 : parsedLat;
  const validLon = isNaN(parsedLon) ? 107.6191 : parsedLon;

  const getMagnitudeColor = (mag: string | number | undefined): string => {
    if (!mag) return "#ef4444";
    const magnitudeVal = typeof mag === "string" ? parseFloat(mag) : mag;
    if (magnitudeVal < 4) return "#eab308";
    if (magnitudeVal < 5) return "#f97316";
    if (magnitudeVal < 6) return "#ef4444";
    return "#7c2d12";
  };

  const dotSize = 20 + (typeof magnitude === "string" ? parseFloat(magnitude) : magnitude || 0) * 2;

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={Mapbox.StyleURL.Street}
        zoomEnabled={false}
        scrollEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        compassEnabled={false}
        logoEnabled={false}
        scaleBarEnabled={false}
      >
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [validLon, validLat],
            zoomLevel: 6,
          }}
        />

        {/* Epicenter Marker */}
        <Mapbox.ShapeSource
          id="epicenterSource"
          shape={{
            type: "FeatureCollection" as const,
            features: [
              {
                type: "Feature" as const,
                geometry: {
                  type: "Point" as const,
                  coordinates: [validLon, validLat],
                },
                properties: {
                  magnitude: magnitude?.toString() || "0",
                },
              },
            ],
          }}
        >
          <Mapbox.CircleLayer
            id="epicenterCircle"
            style={{
              circlePitchAlignment: "map" as const,
              circleRadius: dotSize,
              circleColor: getMagnitudeColor(magnitude),
              circleOpacity: 0.8,
            }}
          />
          <Mapbox.CircleLayer
            id="epicenterCircleOutline"
            style={{
              circlePitchAlignment: "map" as const,
              circleRadius: dotSize + 3,
              circleColor: "transparent",
              circleStrokeWidth: 2,
              circleStrokeColor: getMagnitudeColor(magnitude),
              circleOpacity: 0.5,
            }}
          />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>
    </View>
  );
};
