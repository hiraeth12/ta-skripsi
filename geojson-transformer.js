const upstreamTransformer = require("@expo/metro-config/build/babel-transformer");

module.exports.transform = function (params) {
  if (params.filename.endsWith(".geojson")) {
    // Wrap the raw JSON content as a CommonJS module export
    // so Babel receives valid JavaScript instead of bare JSON
    return upstreamTransformer.transform({
      ...params,
      src: `module.exports = ${params.src};`,
    });
  }
  return upstreamTransformer.transform(params);
};
