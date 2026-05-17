import Mapbox from "@rnmapbox/maps";

let isConfigured = false;

export function configureMapbox() {
  if (isConfigured) {
    return;
  }

  const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

  if (token) {
    Mapbox.setAccessToken(token);
  }

  isConfigured = true;
}
