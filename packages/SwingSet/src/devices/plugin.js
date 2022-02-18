export const buildPlugin = (pluginDir, importPlugin, queueThunkForKernel) => {
  const srcPath = new URL('plugin-src', import.meta.url).pathname;
  let resetter;

  const reset = () => {
    const init = resetter;
    if (init) {
      resetter = undefined;
      init();
    }
  };

  const registerResetter = init => {
    resetter = init;
  };

  const getPluginDir = () => pluginDir;

  // srcPath and endowments are provided to buildRootDeviceNode() for use
  // during configuration.
  return {
    srcPath,
    endowments: {
      import: importPlugin,
      queueThunkForKernel,
      registerResetter,
      getPluginDir,
    },
    reset,
  };
};
