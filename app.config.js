import * as configPlugins from "@expo/config-plugins";

const { withStringsXml } = configPlugins;

function withMapboxAccessToken(config) {
  return withStringsXml(config, (config) => {
    const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

    if (!token) {
      throw new Error(
        "EXPO_PUBLIC_MAPBOX_TOKEN belum di-set. Tambahkan variable ini di EAS Environment untuk development, preview, dan production.",
      );
    }

    const strings = config.modResults.resources.string ?? [];
    const withoutOldToken = strings.filter(
      (item) => item.$?.name !== "mapbox_access_token",
    );

    config.modResults.resources.string = [
      ...withoutOldToken,
      {
        _: token,
        $: {
          name: "mapbox_access_token",
          translatable: "false",
        },
      },
    ];

    return config;
  });
}

function hasPlugin(plugins, pluginName) {
  return plugins.some((plugin) => {
    if (typeof plugin === "string") {
      return plugin === pluginName;
    }

    return Array.isArray(plugin) && plugin[0] === pluginName;
  });
}

export default ({ config }) => {
  const plugins = config.plugins ?? [];
  const pluginsWithMapbox = hasPlugin(plugins, "@rnmapbox/maps")
    ? plugins
    : [...plugins, "@rnmapbox/maps"];

  return {
    ...config,
    android: {
      ...config.android,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ??
        config.android?.googleServicesFile ??
        "./google-services.json",
    },
    plugins: [withMapboxAccessToken, ...pluginsWithMapbox],
  };
};
