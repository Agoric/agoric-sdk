module.exports = function override(config, _env) {
  config.resolve.fallback = { path: false, crypto: false };
  config.ignoreWarnings = [/Failed to parse source map/];
  return config;
};
