import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Circle, Marker, Polygon, UrlTile } from "react-native-maps";

import { DEFAULT_MAP_REGION } from "../constants/map";

const CARTO_TILE_URL =
  "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png";

type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type ViewportBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

type MarkerCoordinate = {
  latitude: number;
  longitude: number;
  magnitude?: number | string;
  depthKm?: number | string;
  depth?: number | string;
};

type RingCoordinate = {
  latitude: number;
  longitude: number;
};

type HighlightPolygon = {
  id: string;
  color: "orange" | "red";
  rings: RingCoordinate[][];
};

type WaveOverlay = {
  id: string;
  center: {
    latitude: number;
    longitude: number;
  };
  pWaveRadiusMeters: number;
  sWaveRadiusMeters: number;
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
  viewportPaddingRatio?: number;
  onViewportBoundsChange?: (bounds: ViewportBounds) => void;
  highlightPolygons?: HighlightPolygon[];
  waveOverlays?: WaveOverlay[];
};

type DotMarkerProps = {
  coordinate: MarkerCoordinate;
  markerKey: string;
  dotSize: number;
  dotColor: string;
  onPress?: () => void;
};

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

function areCoordinatesEqual(a: MarkerCoordinate, b: MarkerCoordinate): boolean {
  return (
    a.latitude === b.latitude &&
    a.longitude === b.longitude &&
    a.magnitude === b.magnitude &&
    a.depthKm === b.depthKm &&
    a.depth === b.depth
  );
}

function areCoordinateArraysEqual(
  a?: MarkerCoordinate[],
  b?: MarkerCoordinate[],
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  if (a.length !== b.length) return false;

  for (let index = 0; index < a.length; index += 1) {
    if (!areCoordinatesEqual(a[index], b[index])) return false;
  }

  return true;
}

function areBoundsEqual(a: ViewportBounds, b: ViewportBounds): boolean {
  return (
    a.north === b.north &&
    a.south === b.south &&
    a.east === b.east &&
    a.west === b.west
  );
}

function areRingsEqual(a: RingCoordinate[][], b: RingCoordinate[][]): boolean {
  if (a.length !== b.length) return false;
  for (let ringIndex = 0; ringIndex < a.length; ringIndex += 1) {
    const ringA = a[ringIndex];
    const ringB = b[ringIndex];
    if (ringA.length !== ringB.length) return false;

    for (let pointIndex = 0; pointIndex < ringA.length; pointIndex += 1) {
      const pointA = ringA[pointIndex];
      const pointB = ringB[pointIndex];
      if (
        pointA.latitude !== pointB.latitude ||
        pointA.longitude !== pointB.longitude
      ) {
        return false;
      }
    }
  }
  return true;
}

function areHighlightPolygonsEqual(
  previous?: HighlightPolygon[],
  next?: HighlightPolygon[],
): boolean {
  if (previous === next) return true;
  if (!previous || !next) return !previous && !next;
  if (previous.length !== next.length) return false;

  for (let index = 0; index < previous.length; index += 1) {
    const prevPolygon = previous[index];
    const nextPolygon = next[index];
    if (
      prevPolygon.id !== nextPolygon.id ||
      prevPolygon.color !== nextPolygon.color ||
      !areRingsEqual(prevPolygon.rings, nextPolygon.rings)
    ) {
      return false;
    }
  }

  return true;
}

function areWaveOverlaysEqual(previous?: WaveOverlay[], next?: WaveOverlay[]): boolean {
  if (previous === next) return true;
  if (!previous || !next) return !previous && !next;
  if (previous.length !== next.length) return false;

  for (let index = 0; index < previous.length; index += 1) {
    const prevWave = previous[index];
    const nextWave = next[index];
    if (
      prevWave.id !== nextWave.id ||
      prevWave.center.latitude !== nextWave.center.latitude ||
      prevWave.center.longitude !== nextWave.center.longitude ||
      prevWave.pWaveRadiusMeters !== nextWave.pWaveRadiusMeters ||
      prevWave.sWaveRadiusMeters !== nextWave.sWaveRadiusMeters
    ) {
      return false;
    }
  }

  return true;
}

function calculateViewportBounds(
  region: MapRegion,
  paddingRatio: number,
): ViewportBounds {
  const latPadding = region.latitudeDelta * paddingRatio;
  const lonPadding = region.longitudeDelta * paddingRatio;

  return {
    north: region.latitude + region.latitudeDelta / 2 + latPadding,
    south: region.latitude - region.latitudeDelta / 2 - latPadding,
    east: region.longitude + region.longitudeDelta / 2 + lonPadding,
    west: region.longitude - region.longitudeDelta / 2 - lonPadding,
  };
}

function isCoordinateInBounds(
  coordinate: MarkerCoordinate,
  bounds: ViewportBounds,
): boolean {
  const isLatitudeInRange =
    coordinate.latitude <= bounds.north && coordinate.latitude >= bounds.south;

  const crossesDateLine = bounds.west > bounds.east;
  const isLongitudeInRange = crossesDateLine
    ? coordinate.longitude >= bounds.west || coordinate.longitude <= bounds.east
    : coordinate.longitude >= bounds.west && coordinate.longitude <= bounds.east;

  return isLatitudeInRange && isLongitudeInRange;
}

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
  viewportPaddingRatio = 0.1,
  onViewportBoundsChange,
  highlightPolygons,
  waveOverlays,
}: Props) {
  const hasMultipleMarkers = useMemo(
    () => Array.isArray(markerCoordinates) && markerCoordinates.length > 0,
    [markerCoordinates],
  );
  const shouldTrackViewport = hasMultipleMarkers || !!onViewportBoundsChange;

  const resolvedInitialRegion = useMemo(
    () => initialRegion ?? DEFAULT_MAP_REGION,
    [initialRegion],
  );

  const [viewportBounds, setViewportBounds] = useState<ViewportBounds>(() =>
    calculateViewportBounds(resolvedInitialRegion, viewportPaddingRatio),
  );
  const [innerWaveProgress, setInnerWaveProgress] = useState(0);

  useEffect(() => {
    if (!waveOverlays || waveOverlays.length === 0) {
      setInnerWaveProgress(0);
      return;
    }

    let frameId = 0;
    const startedAt = Date.now();
    const durationMs = 2200;

    const animate = () => {
      const elapsedMs = Date.now() - startedAt;
      const phase = (elapsedMs % durationMs) / durationMs;
      setInnerWaveProgress(phase);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [waveOverlays]);

  useEffect(() => {
    if (!shouldTrackViewport) return;
    const nextBounds = calculateViewportBounds(
      resolvedInitialRegion,
      viewportPaddingRatio,
    );
    setViewportBounds((previousBounds) =>
      areBoundsEqual(previousBounds, nextBounds) ? previousBounds : nextBounds,
    );
  }, [resolvedInitialRegion, shouldTrackViewport, viewportPaddingRatio]);

  const indexedMarkerCoordinates = useMemo(
    () =>
      (markerCoordinates ?? []).map((coordinate, index) => ({
        coordinate,
        index,
      })),
    [markerCoordinates],
  );

  const visibleMarkerEntries = useMemo(
    () => {
      if (!shouldTrackViewport) return indexedMarkerCoordinates;
      return indexedMarkerCoordinates.filter(({ coordinate }) =>
        isCoordinateInBounds(coordinate, viewportBounds),
      );
    },
    [indexedMarkerCoordinates, shouldTrackViewport, viewportBounds],
  );

  const isMarkerVisible = useCallback(
    (coordinate: MarkerCoordinate) => {
      if (!shouldTrackViewport) return true;
      return isCoordinateInBounds(coordinate, viewportBounds);
    },
    [shouldTrackViewport, viewportBounds],
  );

  const singleMarkerNode = useMemo(() => {
    if (hasMultipleMarkers || !markerCoordinate) return null;
    if (!isMarkerVisible(markerCoordinate)) return null;

    const depthSource = markerCoordinate.depthKm ?? markerCoordinate.depth;
    const dotSize = getDotSize(markerCoordinate.magnitude);
    const dotColor = getDepthColor(depthSource);
    const markerKey = `${markerCoordinate.latitude}-${markerCoordinate.longitude}`;

    return (
      <DotMarker
        key={markerKey}
        markerKey={markerKey}
        coordinate={markerCoordinate}
        dotSize={dotSize}
        dotColor={dotColor}
        onPress={onMarkerPress}
      />
    );
  }, [hasMultipleMarkers, isMarkerVisible, markerCoordinate, onMarkerPress]);

  const getMarkerPressHandler = useCallback(
    (index: number) => () => onMarkerPressIndex?.(index),
    [onMarkerPressIndex],
  );

  const multipleMarkerNodes = useMemo(() => {
    if (!hasMultipleMarkers) return null;

    return visibleMarkerEntries.map(({ coordinate, index }) => {
      const depthSource = coordinate.depthKm ?? coordinate.depth;
      const dotSize = getDotSize(coordinate.magnitude);
      const dotColor = getDepthColor(depthSource);
      const markerKey = `${coordinate.latitude}-${coordinate.longitude}-${index}`;

      return (
        <DotMarker
          key={markerKey}
          markerKey={markerKey}
          coordinate={coordinate}
          dotSize={dotSize}
          dotColor={dotColor}
          onPress={getMarkerPressHandler(index)}
        />
      );
    });
  }, [getMarkerPressHandler, hasMultipleMarkers, visibleMarkerEntries]);

  const temporaryMarkerNode = useMemo(() => {
    if (!temporaryMarkerCoordinate) return null;
    if (!isMarkerVisible(temporaryMarkerCoordinate)) {
      return null;
    }

    const depthSource =
      temporaryMarkerCoordinate.depthKm ?? temporaryMarkerCoordinate.depth;
    const dotSize = getDotSize(temporaryMarkerCoordinate.magnitude);
    const dotColor = getDepthColor(depthSource);
    const markerKey = `temporary-${temporaryMarkerCoordinate.latitude}-${temporaryMarkerCoordinate.longitude}`;

    return (
      <DotMarker
        key={markerKey}
        markerKey={markerKey}
        coordinate={temporaryMarkerCoordinate}
        dotSize={dotSize}
        dotColor={dotColor}
        onPress={onMarkerPress}
      />
    );
  }, [isMarkerVisible, onMarkerPress, temporaryMarkerCoordinate]);

  const waveOverlayNodes = useMemo(() => {
    if (!waveOverlays || waveOverlays.length === 0) return null;

    return waveOverlays.map((wave) => (
      <React.Fragment key={`wave-${wave.id}`}>
        <Circle
          center={wave.center}
          radius={wave.pWaveRadiusMeters}
          fillColor="rgba(255, 0, 0, 0.0)"
          strokeColor="rgba(255, 0, 0, 0.95)"
          strokeWidth={3}
        />
        {wave.sWaveRadiusMeters > 0 && (
          <Circle
            center={wave.center}
            radius={wave.sWaveRadiusMeters * (0.1 + innerWaveProgress * 0.9)}
            fillColor={`rgba(255, 96, 120, ${Math.max(0, 0.18 * (1 - innerWaveProgress)).toFixed(3)})`}
            strokeColor={`rgba(255, 64, 96, ${Math.max(0, 0.95 * (1 - innerWaveProgress)).toFixed(3)})`}
            strokeWidth={2}
          />
        )}
      </React.Fragment>
    ));
  }, [innerWaveProgress, waveOverlays]);

  const highlightPolygonNodes = useMemo(() => {
    if (!highlightPolygons || highlightPolygons.length === 0) return null;

    return highlightPolygons.flatMap((polygon) => {
      const fillColor =
        polygon.color === "red"
          ? "rgba(220, 38, 38, 0.35)"
          : "rgba(249, 115, 22, 0.28)";
      const strokeColor =
        polygon.color === "red"
          ? "rgba(185, 28, 28, 0.85)"
          : "rgba(194, 65, 12, 0.85)";

      return polygon.rings.map((ring, ringIndex) => (
        <Polygon
          key={`${polygon.id}-${ringIndex}`}
          coordinates={ring}
          fillColor={fillColor}
          strokeColor={strokeColor}
          strokeWidth={0.8}
        />
      ));
    });
  }, [highlightPolygons]);

  const handleMapPress = useCallback(() => {
    onMapPress?.();
  }, [onMapPress]);

  const handleRegionChangeComplete = useCallback(
    (region: MapRegion) => {
      if (!shouldTrackViewport) return;
      const nextBounds = calculateViewportBounds(region, viewportPaddingRatio);
      setViewportBounds((previousBounds) =>
        areBoundsEqual(previousBounds, nextBounds)
          ? previousBounds
          : nextBounds,
      );
      onViewportBoundsChange?.(nextBounds);
    },
    [onViewportBoundsChange, shouldTrackViewport, viewportPaddingRatio],
  );

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      initialRegion={resolvedInitialRegion}
      mapType="none"
      toolbarEnabled={false}
      rotateEnabled={false}
      showsCompass={false}
      onPress={handleMapPress}
      onRegionChangeComplete={
        shouldTrackViewport ? handleRegionChangeComplete : undefined
      }
    >
      <UrlTile
        urlTemplate={CARTO_TILE_URL}
        maximumZ={19}
        flipY={false}
        tileSize={256}
      />
      {highlightPolygonNodes}
      {waveOverlayNodes}
      {singleMarkerNode}
      {multipleMarkerNodes}
      {temporaryMarkerNode}
    </MapView>
  );
}, (prevProps, nextProps) => {
  if (prevProps.mapRef !== nextProps.mapRef) return false;
  if (prevProps.onMapPress !== nextProps.onMapPress) return false;
  if (prevProps.onMarkerPress !== nextProps.onMarkerPress) return false;
  if (prevProps.onMarkerPressIndex !== nextProps.onMarkerPressIndex) return false;
  if (prevProps.viewportPaddingRatio !== nextProps.viewportPaddingRatio) {
    return false;
  }
  if (prevProps.onViewportBoundsChange !== nextProps.onViewportBoundsChange) {
    return false;
  }
  if (!areHighlightPolygonsEqual(prevProps.highlightPolygons, nextProps.highlightPolygons)) {
    return false;
  }
  if (!areWaveOverlaysEqual(prevProps.waveOverlays, nextProps.waveOverlays)) {
    return false;
  }

  const prevRegion = prevProps.initialRegion ?? DEFAULT_MAP_REGION;
  const nextRegion = nextProps.initialRegion ?? DEFAULT_MAP_REGION;
  if (
    prevRegion.latitude !== nextRegion.latitude ||
    prevRegion.longitude !== nextRegion.longitude ||
    prevRegion.latitudeDelta !== nextRegion.latitudeDelta ||
    prevRegion.longitudeDelta !== nextRegion.longitudeDelta
  ) {
    return false;
  }

  const prevMarker = prevProps.markerCoordinate;
  const nextMarker = nextProps.markerCoordinate;
  if (prevMarker || nextMarker) {
    if (!prevMarker || !nextMarker) return false;
    if (!areCoordinatesEqual(prevMarker, nextMarker)) return false;
  }

  const prevTemporaryMarker = prevProps.temporaryMarkerCoordinate;
  const nextTemporaryMarker = nextProps.temporaryMarkerCoordinate;
  if (prevTemporaryMarker || nextTemporaryMarker) {
    if (!prevTemporaryMarker || !nextTemporaryMarker) return false;
    if (!areCoordinatesEqual(prevTemporaryMarker, nextTemporaryMarker)) return false;
  }

  return areCoordinateArraysEqual(
    prevProps.markerCoordinates,
    nextProps.markerCoordinates,
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
