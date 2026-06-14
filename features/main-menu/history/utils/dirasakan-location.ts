const DIRASAKAN_LOCATION_PATTERN =
  /^\s*Pusat\s+gempa\s+berada\s+di\s+(?:laut|darat)\s+\d+(?:[.,]\d+)?\s*km\s+(?:timur\s+laut|barat\s+daya|barat\s+laut|tenggara|utara|timur(?!\s+laut\b)|selatan|barat(?!\s+(?:daya|laut)\b))\s+(.+?)\s*$/i;

export function getDirasakanDisplayLocation(location: string): string {
  const match = DIRASAKAN_LOCATION_PATTERN.exec(location);
  const region = match?.[1]?.trim();

  return region || location;
}
