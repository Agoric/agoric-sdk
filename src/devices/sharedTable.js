export default function buildSharedStringTable() {
  const table = new Map(); // not hardened
  const srcPath = require.resolve('./sharedTable-src');

  return {
    srcPath,
    endowments: { table },
    table, // for debugging/testing
  };
}
