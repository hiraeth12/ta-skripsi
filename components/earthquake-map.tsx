import React, { memo, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, UrlTile } from "react-native-maps";

import { DEFAULT_MAP_REGION } from "../constants/map";

const CARTO_TILE_URL =
  "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png";

type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type MarkerCoordinate = {
  latitude: number;
  longitude: number;
  magnitude?: number | string;
  depthKm?: number | string;
  depth?: number | string;
};

type Props = {
  mapRef: React.RefObject<MapView | null>;
  initialRegion?: MapRegion;
  markerCoordinate?: MarkerCoordinate | null;
  markerCoordinates?: MarkerCoordinate[];
  temporaryMarkerCoordinate?: MarkerCoordinate | null;
  onMapPress?: () => void;
  onMarkerPress?: () => void;
  onMarkerPressIndex?: (index: number) => void;
};

type DotMarkerProps = {
  coordinate: MarkerCoordinate;
  markerKey: string;
  dotSize: number;
  dotColor: string;
  onPress?: () => void;
};

const DotMarker = memo(function DotMarker({
  coordinate,
  markerKey,
  dotSize,
  dotColor,
  onPress,
}: DotMarkerProps) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const hitSize = Math.max(44, dotSize + 18);

  useEffect(() => {
    const timeoutId = setTimeout(() => setTracksViewChanges(false), 300);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <Marker
      key={markerKey}
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      zIndex={10}
      onPress={onPress}
    >
      <View collapsable={false} style={[styles.quakeHitArea, { width: hitSize, height: hitSize }]}>
        <View
          collapsable={false}
          style={[
            styles.quakeDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: dotColor,
            },
          ]}
        />
      </View>
    </Marker>
  );
});

const EarthquakeMap = memo(function EarthquakeMap({
  mapRef,
  initialRegion,
  markerCoordinate,
  markerCoordinates,
  temporaryMarkerCoordinate,
  onMapPress,
  onMarkerPress,
  onMarkerPressIndex,
}: Props) {
  const hasMultipleMarkers = Array.isArray(markerCoordinates);

  function toNumber(value: number | string | undefined): number {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = parseFloat(value.replace(",", "."));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  function getDepthColor(depthInput: number | string | undefined): string {
    const depthKm = toNumber(depthInput);
    if (depthKm < 50) return "#ef4444";
    if (depthKm <= 100) return "#f97316";
    if (depthKm <= 250) return "#eab308";
    if (depthKm <= 600) return "#22c55e";
    return "#3b82f6";
  }

  function getDotSize(magnitudeInput: number | string | undefined): number {
    const magnitude = toNumber(magnitudeInput);
    const size = 8 + magnitude * 3;
    return Math.max(8, Math.min(size, 28));
  }

  function renderDotMarker(coordinate: MarkerCoordinate, key: string, index?: number) {
    const depthSource = coordinate.depthKm ?? coordinate.depth;
    const dotSize = getDotSize(coordinate.magnitude);
    const dotColor = getDepthColor(depthSource);

    return (
      <DotMarker
        key={key}
        markerKey={key}
        coordinate={coordinate}
        dotSize={dotSize}
        dotColor={dotColor}
        onPress={
          typeof index === "number"
            ? () => onMarkerPressIndex?.(index)
            : onMarkerPress
        }
      />
    );
  }

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      initialRegion={initialRegion ?? DEFAULT_MAP_REGION}
      mapType="none"
      rotateEnabled={false}
      showsCompass={false}
      onPress={onMapPress}
    >
      <UrlTile
        urlTemplate={CARTO_TILE_URL}
        maximumZ={19}
        flipY={false}
        tileSize={256}
      />
      {!hasMultipleMarkers && markerCoordinate && (
        renderDotMarker(
          markerCoordinate,
          `${markerCoordinate.latitude}-${markerCoordinate.longitude}`,
        )
      )}
      {hasMultipleMarkers &&
        markerCoordinates.map((coordinate, index) =>
          renderDotMarker(
            coordinate,
            `${coordinate.latitude}-${coordinate.longitude}-${index}`,
            index,
          ),
        )}
      {temporaryMarkerCoordinate &&
        renderDotMarker(
          temporaryMarkerCoordinate,
          `temporary-${temporaryMarkerCoordinate.latitude}-${temporaryMarkerCoordinate.longitude}`,
        )}
    </MapView>
  );
});

export default EarthquakeMap;

const styles = StyleSheet.create({
  map: { flex: 1 },
  quakeHitArea: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  quakeDot: {
    borderWidth: 1.5,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
});
