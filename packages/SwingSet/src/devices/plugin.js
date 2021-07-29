export function buildPlugin(pluginDir, pluginRequire, queueThunkForKernel) {
  const srcPath = new URL('plugin-src', import.meta.url).pathname;
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
