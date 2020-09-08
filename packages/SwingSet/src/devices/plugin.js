export function buildPlugin(pluginRequire) {
  const srcPath = require.resolve('./plugin-src');

  // srcPath and endowments are provided to buildRootDeviceNode() for use
  // during configuration.
  return {
    srcPath,
    endowments: { require: pluginRequire },
  };
}
