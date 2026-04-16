import Mapbox from "@rnmapbox/maps";
import { circle as turfCircle } from "@turf/turf";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import patahanGeoJson from "../assets/geojson/patahan.geojson";

import type { MapViewType } from "../constants/map";
import { DEFAULT_MAP_REGION } from "../constants/map";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || "";
const SENSOR_SEISMIC_URL = process.env.EXPO_PUBLIC_SENSOR_SEISMIC_URL || "";
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

function buildWaveCircleGeometry(
  center: { latitude: number; longitude: number },
  radiusMeters: number,
) {
  const radiusKm = Math.max(radiusMeters, 1) / 1000;
  const feature = turfCircle([center.longitude, center.latitude], radiusKm, {
    steps: 96,
    units: "kilometers",
  });
  return feature.geometry;
}

function toCoordinateNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeSeismicSensorsFeatureCollection(
  data: unknown,
): GeoJSON.FeatureCollection | null {
  if (!data || typeof data !== "object") return null;

  const candidate = data as {
    type?: string;
    features?: Array<{
      type?: string;
      properties?: Record<string, unknown>;
      geometry?: {
        type?: string;
        coordinates?: unknown[];
      };
    }>;
  };

  if (candidate.type !== "FeatureCollection" || !Array.isArray(candidate.features)) {
    return null;
  }

  const normalizedFeatures: GeoJSON.Feature[] = [];

  for (const feature of candidate.features) {
    if (!feature || feature.type !== "Feature") continue;
    if (!feature.geometry || feature.geometry.type !== "Point") continue;
    if (!Array.isArray(feature.geometry.coordinates)) continue;

    const [rawLon, rawLat] = feature.geometry.coordinates;
    const longitude = toCoordinateNumber(rawLon);
    const latitude = toCoordinateNumber(rawLat);
    if (longitude === null || latitude === null) continue;

    normalizedFeatures.push({
      type: "Feature",
      properties: feature.properties ?? {},
      geometry: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
    });
  }

  return {
    type: "FeatureCollection",
    features: normalizedFeatures,
  };
}

const DotMarker = memo(function DotMarker({
  coordinate,
  markerKey,
  dotSize,
  dotColor,
  onPress,
}: DotMarkerProps) {
  const tapTargetSize = Math.max(40, dotSize + 20);

  return (
    <Mapbox.PointAnnotation
      key={markerKey}
      id={markerKey}
      coordinate={[coordinate.longitude, coordinate.latitude]}
      onSelected={onPress}
    >
      <View
        collapsable={false}
        style={[
          styles.markerTapTarget,
          {
            width: tapTargetSize,
            height: tapTargetSize,
            borderRadius: tapTargetSize / 2,
          },
        ]}
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
      </View>
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showFaultLines, setShowFaultLines] = useState(true);
  const [showSeismicSensors, setShowSeismicSensors] = useState(false);
  const [seismicSensorsGeoJson, setSeismicSensorsGeoJson] =
    useState<GeoJSON.FeatureCollection | null>(null);

  const hasSeismicSensorsUrl = SENSOR_SEISMIC_URL.trim().length > 0;

  useEffect(() => {
    if (!waveOverlays || waveOverlays.length === 0) {
      setInnerWaveProgress(0);
      return;
    }

    let frameId = 0;
    const startedAt = Date.now();
    const durationMs = 3000;

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
    if (!showSeismicSensors) return;
    if (seismicSensorsGeoJson) return;
    if (!hasSeismicSensorsUrl) return;

    let isMounted = true;

    const loadSeismicSensors = async () => {
      try {
        const response = await fetch(SENSOR_SEISMIC_URL);
        if (!response.ok) {
          throw new Error(`Failed to load seismic sensors: ${response.status}`);
        }

        const payload = await response.json();
        const normalized = normalizeSeismicSensorsFeatureCollection(payload);
        if (isMounted && normalized) {
          setSeismicSensorsGeoJson(normalized);
        }
      } catch (error) {
        console.log("Error loading seismic sensors:", error);
      }
    };

    loadSeismicSensors();

    return () => {
      isMounted = false;
    };
  }, [hasSeismicSensorsUrl, seismicSensorsGeoJson, showSeismicSensors]);

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

  const waveOverlayGeometries = useMemo(() => {
    if (!waveOverlays || waveOverlays.length === 0) return [];

    // Inner wave spreads from center and fades out
    // Opacity: starts at 1, ends at 0
    const innerWaveOpacity = Math.max(0, 1 - innerWaveProgress);
    // Radius: spreads from 0 to full sWaveRadiusMeters
    const innerWaveFactor = innerWaveProgress;

    return waveOverlays.map((wave) => ({
      id: wave.id,
      outerGeometry: buildWaveCircleGeometry(wave.center, wave.pWaveRadiusMeters),
      innerGeometry: buildWaveCircleGeometry(
        wave.center,
        wave.sWaveRadiusMeters * innerWaveFactor,
      ),
      innerWaveOpacity,
    }));
  }, [innerWaveProgress, waveOverlays]);

  const handleMapPress = useCallback(
    (feature: any) => {
      if (isMenuOpen) {
        setIsMenuOpen(false);
      }
      onMapPress?.();
    },
    [isMenuOpen, onMapPress],
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

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((previous) => !previous);
  }, []);

  const handleToggleFaultLines = useCallback((value: boolean) => {
    setShowFaultLines(value);
  }, []);

  const handleToggleSeismicSensors = useCallback((value: boolean) => {
    setShowSeismicSensors(value);
  }, []);

    return (
      <View style={styles.container}>
      <Mapbox.MapView
        ref={mapViewRef}
        style={styles.map}
        styleURL="mapbox://styles/mapbox/streets-v12"
        scaleBarEnabled={false}
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
        {showFaultLines ? (
          <Mapbox.ShapeSource id="fault-lines-source" shape={patahanGeoJson}>
            <Mapbox.LineLayer
              id="fault-lines-layer"
              style={{
                lineColor: "rgba(175, 66, 16, 0.85)",
                lineWidth: ["interpolate", ["linear"], ["zoom"], 3, 0.8, 9, 2.2],
                lineOpacity: 0.9,
              }}
            />
          </Mapbox.ShapeSource>
        ) : null}
        {showSeismicSensors && seismicSensorsGeoJson ? (
          <Mapbox.ShapeSource
            id="seismic-sensors-source"
            shape={seismicSensorsGeoJson}
          >
            <Mapbox.SymbolLayer
              id="seismic-sensors-layer"
              style={{
                textField: "▲",
                textSize: ["interpolate", ["linear"], ["zoom"], 3, 10, 9, 16],
                textColor: "rgba(37, 99, 235, 0.95)",
                textHaloColor: "rgba(255, 255, 255, 0.92)",
                textHaloWidth: 1,
                textAllowOverlap: true,
              }}
            />
          </Mapbox.ShapeSource>
        ) : null}
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

        {waveOverlayGeometries.map((wave) => (
          <React.Fragment key={`wave-${wave.id}`}>
            <Mapbox.ShapeSource
              id={`wave-outer-source-${wave.id}`}
              shape={{
                type: "Feature",
                properties: {},
                geometry: wave.outerGeometry,
              }}
            >
              <Mapbox.FillLayer
                id={`wave-outer-fill-${wave.id}`}
                style={{
                  fillColor: "rgba(220, 38, 38, 0.14)",
                }}
              />
              <Mapbox.LineLayer
                id={`wave-outer-stroke-${wave.id}`}
                style={{
                  lineColor: "rgba(220, 38, 38, 0.55)",
                  lineWidth: 1.5,
                }}
              />
            </Mapbox.ShapeSource>

            <Mapbox.ShapeSource
              id={`wave-inner-source-${wave.id}`}
              shape={{
                type: "Feature",
                properties: {},
                geometry: wave.innerGeometry,
              }}
            >
              <Mapbox.FillLayer
                id={`wave-inner-fill-${wave.id}`}
                style={{
                  fillColor: `rgba(255, 255, 255, ${0.28 * wave.innerWaveOpacity})`,
                }}
              />
              <Mapbox.LineLayer
                id={`wave-inner-stroke-${wave.id}`}
                style={{
                  lineColor: `rgba(255, 255, 255, ${0.9 * wave.innerWaveOpacity})`,
                  lineWidth: 1.5,
                }}
              />
            </Mapbox.ShapeSource>
          </React.Fragment>
        ))}
      </Mapbox.MapView>
      <View pointerEvents="box-none" style={styles.menuOverlay}>
        {isMenuOpen ? (
          <View style={styles.menuPanel}>
            <View style={styles.menuRow}>
              <Text style={styles.menuLabel}>Tampilkan patahan</Text>
              <Switch
                value={showFaultLines}
                onValueChange={handleToggleFaultLines}
                trackColor={{ false: "#cbd5e1", true: "#f59e0b" }}
                thumbColor="#ffffff"
              />
            </View>
            <View style={styles.menuRow}>
              <Text style={styles.menuLabel}>Tampilkan sensor seismik</Text>
              <Switch
                value={showSeismicSensors}
                onValueChange={handleToggleSeismicSensors}
                trackColor={{ false: "#cbd5e1", true: "#2563eb" }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        ) : null}

        <Pressable
          style={styles.menuButton}
          onPress={toggleMenu}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Buka menu peta"
        >
          <View style={styles.menuIcon}>
            <View style={styles.menuBar} />
            <View style={styles.menuBar} />
            <View style={styles.menuBar} />
          </View>
        </Pressable>
      </View>
      </View>
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
  container: { flex: 1 },
  map: { flex: 1 },
  markerTapTarget: {
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
  menuOverlay: {
    position: "absolute",
    bottom: 16,
    right: 12,
    alignItems: "flex-end",
    zIndex: 20,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuIcon: {
    width: 18,
    gap: 3,
  },
  menuBar: {
    width: 18,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#1f2937",
  },
  menuPanel: {
    marginBottom: 8,
    minWidth: 200,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  menuLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  menuHint: {
    marginTop: 2,
    fontSize: 11,
    color: "#475569",
  },
});
