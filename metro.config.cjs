const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Allow Metro to resolve .geojson files and handle them via a custom transformer
config.resolver.sourceExts.push("geojson");
config.transformer.babelTransformerPath =
  require.resolve("./geojson-transformer.cjs");

module.exports = config;
