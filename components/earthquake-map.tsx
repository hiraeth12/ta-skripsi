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
  isCardOpen?: boolean;
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

function areCoordinatesEqual(
  a: MarkerCoordinate,
  b: MarkerCoordinate,
): boolean {
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
  for (let i = 0; i < a.length; i++) {
    if (a[i].length !== b[i].length) return false;
    for (let j = 0; j < a[i].length; j++) {
      if (
        a[i][j].latitude !== b[i][j].latitude ||
        a[i][j].longitude !== b[i][j].longitude
      )
        return false;
    }
  }
  return true;
}

function areHighlightPolygonsEqual(
  previous?: HighlightPolygon[],
  next?: HighlightPolygon[],
): boolean {
  if (previous === next) return true;
  if (!previous || !next || previous.length !== next.length) return false;
  for (let index = 0; index < previous.length; index += 1) {
    const prevP = previous[index];
    const nextP = next[index];
    if (
      prevP.id !== nextP.id ||
      prevP.color !== nextP.color ||
      !areRingsEqual(prevP.rings, nextP.rings)
    )
      return false;
  }
  return true;
}

function areWaveOverlaysEqual(
  previous?: WaveOverlay[],
  next?: WaveOverlay[],
): boolean {
  if (previous === next) return true;
  if (!previous || !next || previous.length !== next.length) return false;
  for (let i = 0; i < previous.length; i++) {
    if (
      previous[i].id !== next[i].id ||
      previous[i].pWaveRadiusMeters !== next[i].pWaveRadiusMeters
    )
      return false;
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
  return Math.max(2, Math.min(Math.log2(360 / safeDelta), 16));
}

function isCoordinateInBounds(
  coordinate: MarkerCoordinate,
  bounds: ViewportBounds,
): boolean {
  const isLatOk =
    coordinate.latitude <= bounds.north && coordinate.latitude >= bounds.south;
  const isLonOk =
    bounds.west > bounds.east
      ? coordinate.longitude >= bounds.west ||
        coordinate.longitude <= bounds.east
      : coordinate.longitude >= bounds.west &&
        coordinate.longitude <= bounds.east;
  return isLatOk && isLonOk;
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
  data: any,
): GeoJSON.FeatureCollection | null {
  if (
    !data ||
    data.type !== "FeatureCollection" ||
    !Array.isArray(data.features)
  )
    return null;
  const normalizedFeatures: GeoJSON.Feature[] = [];
  for (const feature of data.features) {
    const coords = feature.geometry?.coordinates;
    if (!coords) continue;
    const lon = toCoordinateNumber(coords[0]);
    const lat = toCoordinateNumber(coords[1]);
    if (lon === null || lat === null) continue;
    normalizedFeatures.push({
      type: "Feature",
      properties: feature.properties ?? {},
      geometry: { type: "Point", coordinates: [lon, lat] },
    });
  }
  return { type: "FeatureCollection", features: normalizedFeatures };
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
    isCardOpen = false,
  }: Props) {
    const mapViewRef = React.useRef<Mapbox.MapView | null>(null);
    const cameraRef = React.useRef<Mapbox.Camera | null>(null);
    const pendingCameraMoveRef = React.useRef<{
      region: MapRegion;
      duration: number;
    } | null>(null);

    const hasMultipleMarkers =
      Array.isArray(markerCoordinates) && markerCoordinates.length > 0;
    const shouldTrackViewport = hasMultipleMarkers || !!onViewportBoundsChange;
    const resolvedInitialRegion = initialRegion ?? DEFAULT_MAP_REGION;

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

    useEffect(() => {
      if (!waveOverlays?.length) {
        setInnerWaveProgress(0);
        return;
      }
      let frameId: number;
      const startedAt = Date.now();
      const animate = () => {
        setInnerWaveProgress(((Date.now() - startedAt) % 3000) / 3000);
        frameId = requestAnimationFrame(animate);
      };
      frameId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(frameId);
    }, [waveOverlays]);

    useEffect(() => {
      if (!showSeismicSensors || seismicSensorsGeoJson || !SENSOR_SEISMIC_URL)
        return;
      fetch(SENSOR_SEISMIC_URL)
        .then((res) => res.json())
        .then((data) => {
          const normalized = normalizeSeismicSensorsFeatureCollection(data);
          if (normalized) setSeismicSensorsGeoJson(normalized);
        })
        .catch((err) => console.log("Sensor error:", err));
    }, [showSeismicSensors, seismicSensorsGeoJson]);

    const applyCameraMove = useCallback(
      (region: MapRegion, duration: number) => {
        if (!cameraRef.current || !isFinite(region.latitude)) return false;
        cameraRef.current.setCamera({
          centerCoordinate: [region.longitude, region.latitude],
          zoomLevel: getZoomLevelFromRegion(region),
          animationDuration: duration,
          animationMode: "easeTo",
        });
        return true;
      },
      [],
    );

    const animateToRegion = useCallback(
      (region: MapRegion, duration = 800) => {
        if (!applyCameraMove(region, duration))
          pendingCameraMoveRef.current = { region, duration };
      },
      [applyCameraMove],
    );

    useEffect(() => {
      mapRef.current = { animateToRegion };
      return () => {
        mapRef.current = null;
      };
    }, [animateToRegion, mapRef]);

    const highlightPolygonGeometries = useMemo(() => {
      return (highlightPolygons ?? []).map((p) => ({
        id: p.id,
        color: p.color,
        geometry: {
          type: "Polygon" as const,
          coordinates: p.rings.map((r) =>
            r.map((c) => [c.longitude, c.latitude]),
          ),
        },
      }));
    }, [highlightPolygons]);

    const waveOverlayGeometries = useMemo(() => {
      return (waveOverlays ?? []).map((w) => ({
        id: w.id,
        outerGeometry: buildWaveCircleGeometry(w.center, w.pWaveRadiusMeters),
        innerGeometry: buildWaveCircleGeometry(
          w.center,
          w.sWaveRadiusMeters * innerWaveProgress,
        ),
        innerWaveOpacity: Math.max(0, 1 - innerWaveProgress),
      }));
    }, [innerWaveProgress, waveOverlays]);

    const visibleMarkers = useMemo(() => {
      const all = (markerCoordinates ?? []).map((c, i) => ({
        coordinate: c,
        index: i,
      }));
      if (!shouldTrackViewport || !hasMeasuredViewport) return all;
      return all.filter((m) =>
        isCoordinateInBounds(m.coordinate, viewportBounds),
      );
    }, [
      markerCoordinates,
      viewportBounds,
      hasMeasuredViewport,
      shouldTrackViewport,
    ]);

    return (
      <View style={styles.container}>
        <Mapbox.MapView
          ref={mapViewRef}
          style={styles.map}
          styleURL="mapbox://styles/mapbox/streets-v12"
          onPress={() => {
            if (isMenuOpen) setIsMenuOpen(false);
            onMapPress?.();
          }}
          onMapIdle={async () => {
            const b = await mapViewRef.current?.getVisibleBounds();
            if (b) {
              const next = {
                south: Math.min(b[0][1], b[1][1]),
                west: Math.min(b[0][0], b[1][0]),
                north: Math.max(b[0][1], b[1][1]),
                east: Math.max(b[0][0], b[1][0]),
              };
              setViewportBounds((prev) => {
                if (areBoundsEqual(prev, next)) return prev;
                onViewportBoundsChange?.(next);
                return next;
              });
              setHasMeasuredViewport(true);
            }
          }}
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

          {showFaultLines && (
            <Mapbox.ShapeSource id="faults" shape={patahanGeoJson}>
              <Mapbox.LineLayer
                id="fault-lines"
                style={{
                  lineColor: "rgba(175, 66, 16, 0.85)",
                  lineWidth: [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    3,
                    0.8,
                    9,
                    2.2,
                  ],
                }}
              />
            </Mapbox.ShapeSource>
          )}

          {showSeismicSensors && seismicSensorsGeoJson && (
            <Mapbox.ShapeSource id="sensors" shape={seismicSensorsGeoJson}>
              <Mapbox.SymbolLayer
                id="sensor-labels"
                style={{
                  textField: "▲",
                  textSize: 14,
                  textColor: "#2563eb",
                  textHaloColor: "#fff",
                  textHaloWidth: 1,
                }}
              />
            </Mapbox.ShapeSource>
          )}

          {highlightPolygonGeometries.map((p) => (
            <Mapbox.ShapeSource
              key={p.id}
              id={`src-${p.id}`}
              shape={{ type: "Feature", properties: {}, geometry: p.geometry }}
            >
              <Mapbox.FillLayer
                id={`fill-${p.id}`}
                style={{
                  fillColor:
                    p.color === "red"
                      ? "rgba(220, 38, 38, 0.35)"
                      : "rgba(249, 115, 22, 0.28)",
                }}
              />
              <Mapbox.LineLayer
                id={`line-${p.id}`}
                style={{
                  lineColor:
                    p.color === "red"
                      ? "rgba(185, 28, 28, 0.85)"
                      : "rgba(194, 65, 12, 0.85)",
                  lineWidth: 2,
                }}
              />
            </Mapbox.ShapeSource>
          ))}

          {waveOverlayGeometries.map((w) => (
            <React.Fragment key={w.id}>
              <Mapbox.ShapeSource
                id={`outer-${w.id}`}
                shape={{
                  type: "Feature",
                  properties: {},
                  geometry: w.outerGeometry,
                }}
              >
                <Mapbox.FillLayer
                  id={`ofill-${w.id}`}
                  style={{ fillColor: "rgba(220, 38, 38, 0.14)" }}
                />
                <Mapbox.LineLayer
                  id={`oline-${w.id}`}
                  style={{
                    lineColor: "rgba(220, 38, 38, 0.55)",
                    lineWidth: 1.5,
                  }}
                />
              </Mapbox.ShapeSource>
              <Mapbox.ShapeSource
                id={`inner-${w.id}`}
                shape={{
                  type: "Feature",
                  properties: {},
                  geometry: w.innerGeometry,
                }}
              >
                <Mapbox.FillLayer
                  id={`ifill-${w.id}`}
                  style={{
                    fillColor: `rgba(255, 255, 255, ${0.28 * w.innerWaveOpacity})`,
                  }}
                />
                <Mapbox.LineLayer
                  id={`iline-${w.id}`}
                  style={{
                    lineColor: `rgba(255, 255, 255, ${0.9 * w.innerWaveOpacity})`,
                    lineWidth: 1.5,
                  }}
                />
              </Mapbox.ShapeSource>
            </React.Fragment>
          ))}

          {markerCoordinate && (
            <DotMarker
              coordinate={markerCoordinate}
              markerKey="single"
              dotSize={getDotSize(markerCoordinate.magnitude)}
              dotColor={getDepthColor(markerCoordinate.depth)}
              onPress={onMarkerPress}
            />
          )}
          {temporaryMarkerCoordinate && (
            <DotMarker
              coordinate={temporaryMarkerCoordinate}
              markerKey="temp"
              dotSize={getDotSize(temporaryMarkerCoordinate.magnitude)}
              dotColor={getDepthColor(temporaryMarkerCoordinate.depth)}
              onPress={onMarkerPress}
            />
          )}
          {visibleMarkers.map((m) => (
            <DotMarker
              key={m.index}
              coordinate={m.coordinate}
              markerKey={`m-${m.index}`}
              dotSize={getDotSize(m.coordinate.magnitude)}
              dotColor={getDepthColor(m.coordinate.depth)}
              onPress={() => onMarkerPressIndex?.(m.index)}
            />
          ))}
        </Mapbox.MapView>

        {!isCardOpen && (
          <View pointerEvents="box-none" style={styles.menuOverlay}>
            {isMenuOpen && (
              <View style={styles.menuPanel}>
                <View style={styles.menuRow}>
                  <Text style={styles.menuLabel}>Tampilkan patahan</Text>
                  <Switch
                    value={showFaultLines}
                    onValueChange={setShowFaultLines}
                    trackColor={{ false: "#cbd5e1", true: "#f59e0b" }}
                  />
                </View>
                <View style={styles.menuRow}>
                  <Text style={styles.menuLabel}>Tampilkan sensor seismik</Text>
                  <Switch
                    value={showSeismicSensors}
                    onValueChange={setShowSeismicSensors}
                    trackColor={{ false: "#cbd5e1", true: "#2563eb" }}
                  />
                </View>
              </View>
            )}
            <Pressable
              style={styles.menuButton}
              onPress={() => setIsMenuOpen(!isMenuOpen)}
            >
              <View style={styles.menuIcon}>
                <View style={styles.menuBar} />
                <View style={styles.menuBar} />
                <View style={styles.menuBar} />
              </View>
            </Pressable>
          </View>
        )}
      </View>
    );
  },
  (prev, next) => {
    if (prev.isCardOpen !== next.isCardOpen) return false;
    if (prev.markerCoordinate !== next.markerCoordinate) return false;
    if (
      !areHighlightPolygonsEqual(prev.highlightPolygons, next.highlightPolygons)
    )
      return false;
    if (!areWaveOverlaysEqual(prev.waveOverlays, next.waveOverlays))
      return false;
    return areCoordinateArraysEqual(
      prev.markerCoordinates,
      next.markerCoordinates,
    );
  },
);

export default EarthquakeMap;

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  markerTapTarget: { alignItems: "center", justifyContent: "center" },
  quakeDot: { borderWidth: 1.5, borderColor: "#ffffff", elevation: 5 },
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
    backgroundColor: "#fff",
    elevation: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  menuIcon: { gap: 3 },
  menuBar: {
    width: 18,
    height: 2,
    backgroundColor: "#1f2937",
    borderRadius: 2,
  },
  menuPanel: {
    marginBottom: 8,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 5,
    minWidth: 200,
  },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  menuLabel: { fontSize: 13, fontWeight: "600" },
});
