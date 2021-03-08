/* global require */
export function buildPlugin(pluginDir, pluginRequire, queueThunkForKernel) {
  const srcPath = require.resolve('./plugin-src');
  let resetter;

  function reset() {
    const init = resetter;
    if (init) {
      resetter = undefined;
      init();
    }
  }

  function registerResetter(init) {
    resetter = init;
  }

  function getPluginDir() {
    return pluginDir;
  }

  // srcPath and endowments are provided to buildRootDeviceNode() for use
  // during configuration.
  return {
    srcPath,
    endowments: {
      require: pluginRequire,
      queueThunkForKernel,
      registerResetter,
      getPluginDir,
    },
    reset,
  };
}
