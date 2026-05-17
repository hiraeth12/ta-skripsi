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

  return {
    ...config,
    android: {
      ...config.android,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ??
        config.android?.googleServicesFile ??
        "./google-services.json",
    },
    plugins: hasPlugin(plugins, "@rnmapbox/maps")
      ? plugins
      : [...plugins, "@rnmapbox/maps"],
  };
};
