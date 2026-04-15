import Mapbox from "@rnmapbox/maps";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import type { MapViewType } from "../constants/map";
import { DEFAULT_MAP_REGION } from "../constants/map";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || "";
Mapbox.setAccessToken(MAPBOX_TOKEN);

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
  mapRef: React.MutableRefObject<MapViewType | null>;
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

function getZoomLevelFromRegion(region: MapRegion): number {
  const safeDelta = Math.max(region.latitudeDelta, 0.0001);
  const rawZoom = Math.log2(360 / safeDelta);
  return Math.max(2, Math.min(rawZoom, 16));
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
  return (
    <Mapbox.PointAnnotation
      key={markerKey}
      id={markerKey}
      coordinate={[coordinate.longitude, coordinate.latitude]}
      onSelected={onPress}
    >
      <View
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
    </Mapbox.PointAnnotation>
  );
});

const EarthquakeMap = memo(
  function EarthquakeMap({
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
  const mapViewRef = React.useRef<Mapbox.MapView | null>(null);
  const cameraRef = React.useRef<Mapbox.Camera | null>(null);
  const pendingCameraMoveRef = React.useRef<{
    region: MapRegion;
    duration: number;
  } | null>(null);

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
  const [hasMeasuredViewport, setHasMeasuredViewport] = useState(false);
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
    setHasMeasuredViewport(false);
  }, [resolvedInitialRegion, shouldTrackViewport, viewportPaddingRatio]);

  const applyCameraMove = useCallback((region: MapRegion, duration: number) => {
    if (!cameraRef.current) return false;
    if (!isFinite(region.latitude) || !isFinite(region.longitude)) return false;

    cameraRef.current.setCamera({
      centerCoordinate: [region.longitude, region.latitude],
      zoomLevel: getZoomLevelFromRegion(region),
      animationDuration: duration,
      animationMode: "easeTo",
    });
    return true;
  }, []);

  const flushPendingCameraMove = useCallback(() => {
    const pending = pendingCameraMoveRef.current;
    if (!pending) return;

    const applied = applyCameraMove(pending.region, pending.duration);
    if (applied) {
      pendingCameraMoveRef.current = null;
    }
  }, [applyCameraMove]);

  const animateToRegion = useCallback((region: MapRegion, duration = 800) => {
    const applied = applyCameraMove(region, duration);
    if (!applied) {
      pendingCameraMoveRef.current = { region, duration };
    }
  }, [applyCameraMove]);

  useEffect(() => {
    mapRef.current = {
      animateToRegion,
    };

    return () => {
      mapRef.current = null;
    };
  }, [animateToRegion, mapRef]);

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
      if (!shouldTrackViewport || !hasMeasuredViewport) return indexedMarkerCoordinates;
      return indexedMarkerCoordinates.filter(({ coordinate }) =>
        isCoordinateInBounds(coordinate, viewportBounds),
      );
    },
    [hasMeasuredViewport, indexedMarkerCoordinates, shouldTrackViewport, viewportBounds],
  );

  const isMarkerVisible = useCallback(
    (coordinate: MarkerCoordinate) => {
      if (!shouldTrackViewport || !hasMeasuredViewport) return true;
      return isCoordinateInBounds(coordinate, viewportBounds);
    },
    [hasMeasuredViewport, shouldTrackViewport, viewportBounds],
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
  }, [onMarkerPress, temporaryMarkerCoordinate]);

  const highlightPolygonGeometries = useMemo(() => {
    if (!highlightPolygons || highlightPolygons.length === 0) return [];

    return highlightPolygons.map((polygon) => ({
      id: polygon.id,
      color: polygon.color,
      geometry: {
        type: "Polygon" as const,
        coordinates: polygon.rings.map((ring) =>
          ring.map((coord) => [coord.longitude, coord.latitude]),
        ),
      },
    }));
  }, [highlightPolygons]);

  const handleMapPress = useCallback(
    (feature: any) => {
      onMapPress?.();
    },
    [onMapPress],
  );

  const handleRegionDidChange = useCallback(
    async (feature: any) => {
      flushPendingCameraMove();

      if (!shouldTrackViewport) return;

      try {
        const bounds = await mapViewRef.current?.getVisibleBounds();
        if (bounds && bounds.length === 2) {
          const [cornerA, cornerB] = bounds;
          const minLat = Math.min(cornerA[1], cornerB[1]);
          const maxLat = Math.max(cornerA[1], cornerB[1]);
          const minLon = Math.min(cornerA[0], cornerB[0]);
          const maxLon = Math.max(cornerA[0], cornerB[0]);
          const nextBounds: ViewportBounds = {
            south: minLat,
            west: minLon,
            north: maxLat,
            east: maxLon,
          };

          setHasMeasuredViewport(true);
          setViewportBounds((previousBounds) =>
            areBoundsEqual(previousBounds, nextBounds)
              ? previousBounds
              : nextBounds,
          );
          onViewportBoundsChange?.(nextBounds);
        }
      } catch (error) {
        console.log("Error getting visible bounds:", error);
      }
    },
    [flushPendingCameraMove, shouldTrackViewport, onViewportBoundsChange],
  );

  const handleDidFinishLoadingMap = useCallback(() => {
    flushPendingCameraMove();
  }, [flushPendingCameraMove]);

    return (
      <Mapbox.MapView
        ref={mapViewRef}
        style={styles.map}
        styleURL="mapbox://styles/mapbox/streets-v12"
        onPress={handleMapPress}
        onDidFinishLoadingMap={handleDidFinishLoadingMap}
        onMapIdle={handleRegionDidChange}
      >
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [
              resolvedInitialRegion.longitude,
              resolvedInitialRegion.latitude,
            ],
            zoomLevel: getZoomLevelFromRegion(resolvedInitialRegion),
          }}
        />
        {singleMarkerNode}
        {multipleMarkerNodes}
        {temporaryMarkerNode}

        {highlightPolygonGeometries.map((polygon) => (
          <Mapbox.ShapeSource
            key={`source-${polygon.id}`}
            id={`source-${polygon.id}`}
            shape={{
              type: "Feature",
              properties: {},
              geometry: polygon.geometry,
            }}
          >
            <Mapbox.FillLayer
              id={`fill-${polygon.id}`}
              style={{
                fillColor:
                  polygon.color === "red"
                    ? "rgba(220, 38, 38, 0.35)"
                    : "rgba(249, 115, 22, 0.28)",
              }}
            />
            <Mapbox.LineLayer
              id={`stroke-${polygon.id}`}
              style={{
                lineColor:
                  polygon.color === "red"
                    ? "rgba(185, 28, 28, 0.85)"
                    : "rgba(194, 65, 12, 0.85)",
                lineWidth: 2,
              }}
            />
          </Mapbox.ShapeSource>
        ))}
      </Mapbox.MapView>
    );
  },
  (prevProps, nextProps) => {
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
  quakeDot: {
    borderWidth: 1.5,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
});
