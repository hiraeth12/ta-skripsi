export type WzLevel = "AWAS" | "SIAGA" | "WASPADA" | "NORMAL";

export type WzArea = {
  province: string;
  district: string;
  level: WzLevel;
  date?: string;
  time?: string;
};

export type HighlightStyle = {
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeWidth: number;
};

export type GeoJsonFeature = {
  type: "Feature";
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
  properties: Record<string, unknown>;
};

export type MatchedFeature = {
  feature: GeoJsonFeature;
  wzArea: WzArea;
  style: HighlightStyle;
};

export const LEVEL_STYLE: Record<WzLevel, HighlightStyle> = {
  AWAS: {
    fillColor: "#EF4444",
    fillOpacity: 0.65,
    strokeColor: "#B91C1C",
    strokeWidth: 2,
  },
  SIAGA: {
    fillColor: "#F97316",
    fillOpacity: 0.55,
    strokeColor: "#C2410C",
    strokeWidth: 2,
  },
  WASPADA: {
    fillColor: "#EAB308",
    fillOpacity: 0.45,
    strokeColor: "#A16207",
    strokeWidth: 1.5,
  },
  NORMAL: {
    fillColor: "#22C55E",
    fillOpacity: 0.25,
    strokeColor: "#15803D",
    strokeWidth: 1,
  },
};

export const DEFAULT_STYLE: HighlightStyle = {
  fillColor: "transparent",
  fillOpacity: 0,
  strokeColor: "#CBD5E1",
  strokeWidth: 0.3,
};

const LEVEL_PRIORITY: Record<WzLevel, number> = {
  AWAS: 4,
  SIAGA: 3,
  WASPADA: 2,
  NORMAL: 1,
};

let geoCanonicalByCompact = new Map<string, string>();
let geoCanonicalNames = new Set<string>();

function normalizeNameBase(raw: string): string {
  return raw.replace(/-/g, " ").replace(/\s+/g, " ").toLowerCase().trim();
}

function compactName(value: string): string {
  return value.replace(/\s+/g, "");
}

function stripPrefix(s: string): string {
  return s.replace(/^kabupaten\s+/, "").replace(/^kota\s+/, "").trim();
}

function stripDirectionalSuffix(s: string): string {
  if (geoCanonicalNames.has(s)) return s;
  return s.replace(/\s+bagian\s+(selatan|utara|timur|barat)$/i, "").trim();
}

function getMatchKey(normalized: string): string {
  return stripDirectionalSuffix(stripPrefix(normalized));
}

function resolveCanonicalName(normalized: string): string {
  const key = getMatchKey(normalized);
  const compact = compactName(key);
  const exact = geoCanonicalByCompact.get(compact);

  if (exact) return exact;

  for (const [geoCompact, canonical] of geoCanonicalByCompact.entries()) {
    if (compact.length > geoCompact.length && compact.includes(geoCompact)) {
      return canonical;
    }
  }

  return normalized;
}

function normalizeName(raw: string): string {
  return resolveCanonicalName(normalizeNameBase(raw))
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function getStyle(level: WzLevel): HighlightStyle {
  return LEVEL_STYLE[level] ?? DEFAULT_STYLE;
}

function cloneFeatureWithStyle(
  feature: GeoJsonFeature,
  style: HighlightStyle,
): GeoJsonFeature {
  return {
    ...feature,
    properties: {
      ...feature.properties,
      fillColor: style.fillColor,
      fillOpacity: style.fillOpacity,
      strokeColor: style.strokeColor,
      strokeWidth: style.strokeWidth,
    },
  };
}

export function buildWzAreaLookup(wzAreas: WzArea[]): Map<string, WzArea> {
  const lookup = new Map<string, WzArea>();

  for (const area of wzAreas) {
    const key = getMatchKey(normalizeName(area.district));
    if (!key) continue;

    const existing = lookup.get(key);
    if (
      !existing ||
      LEVEL_PRIORITY[area.level] > LEVEL_PRIORITY[existing.level]
    ) {
      lookup.set(key, area);
    }
  }

  return lookup;
}

export function buildGeoJsonIndex(
  features: GeoJsonFeature[],
): Map<string, number> {
  const nextCanonicalNames = new Set<string>();
  const nextCanonicalByCompact = new Map<string, string>();

  for (const feature of features) {
    const raw = String(feature.properties["alt_name"] ?? "");
    if (!raw) continue;

    const normalized = normalizeNameBase(raw);
    const withoutPrefix = stripPrefix(normalized);
    if (withoutPrefix) nextCanonicalNames.add(withoutPrefix);
  }

  geoCanonicalNames = nextCanonicalNames;

  for (const feature of features) {
    const raw = String(feature.properties["alt_name"] ?? "");
    if (!raw) continue;

    const normalized = normalizeNameBase(raw);
    const canonical = getMatchKey(normalized);
    if (!canonical) continue;

    nextCanonicalByCompact.set(compactName(canonical), canonical);
    nextCanonicalByCompact.set(compactName(normalized), canonical);
  }

  geoCanonicalByCompact = nextCanonicalByCompact;

  const index = new Map<string, number>();
  features.forEach((feature, featureIndex) => {
    const raw = String(feature.properties["alt_name"] ?? "");
    if (!raw) return;

    const key = getMatchKey(normalizeName(raw));
    if (key) index.set(key, featureIndex);
  });

  return index;
}

export function resolveMatchedFeatures(
  wzAreas: WzArea[],
  features: GeoJsonFeature[],
  geoIndex: Map<string, number>,
): MatchedFeature[] {
  const wzLookup = buildWzAreaLookup(wzAreas);
  const result: MatchedFeature[] = [];
  const usedIndices = new Set<number>();

  const pushMatch = (featureIndex: number, wzArea: WzArea) => {
    if (usedIndices.has(featureIndex)) return;

    const feature = features[featureIndex];
    if (!feature) return;

    usedIndices.add(featureIndex);
    const style = getStyle(wzArea.level);
    result.push({
      feature: cloneFeatureWithStyle(feature, style),
      wzArea,
      style,
    });
  };

  const wzEntries = Array.from(wzLookup.entries());

  for (const [wzKey, wzArea] of wzEntries) {
    const exactIndex = geoIndex.get(wzKey);
    if (exactIndex !== undefined) {
      pushMatch(exactIndex, wzArea);
    }
  }

  for (const [wzKey, wzArea] of wzEntries) {
    if (geoIndex.get(wzKey) !== undefined) continue;

    for (const [geoKey, geoIndexValue] of geoIndex.entries()) {
      if (geoKey.includes(wzKey)) {
        pushMatch(geoIndexValue, wzArea);
      }
    }

    for (const [geoKey, geoIndexValue] of geoIndex.entries()) {
      if (wzKey.includes(geoKey)) {
        pushMatch(geoIndexValue, wzArea);
      }
    }
  }

  return result;
}

export function getFeatureStyle(
  properties: Record<string, unknown>,
  wzLookup: Map<string, WzArea>,
): HighlightStyle {
  const raw = String(properties["alt_name"] ?? "");
  if (!raw) return DEFAULT_STYLE;

  const geoKey = getMatchKey(normalizeName(raw));
  const exact = wzLookup.get(geoKey);
  if (exact) return getStyle(exact.level);

  for (const [wzKey, area] of wzLookup.entries()) {
    if (geoKey.includes(wzKey) || wzKey.includes(geoKey)) {
      return getStyle(area.level);
    }
  }

  return DEFAULT_STYLE;
}
