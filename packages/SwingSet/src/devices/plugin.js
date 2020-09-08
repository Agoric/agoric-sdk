export function buildPlugin(pluginRequire, queueThunkForKernel) {
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

  // srcPath and endowments are provided to buildRootDeviceNode() for use
  // during configuration.
  return {
    srcPath,
    endowments: {
      require: pluginRequire,
      queueThunkForKernel,
      registerResetter,
    },
    reset,
  };
}
