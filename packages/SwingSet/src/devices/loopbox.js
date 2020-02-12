export function buildLoopbox() {
  const srcPath = require.resolve('./loopbox-src');

  return {
    srcPath,
    endowments: {},
  };
}
