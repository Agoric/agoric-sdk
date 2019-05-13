export default function buildSharedStringTable() {
  const table = new Map(); // not hardened
  const src = require.resolve('./sharedTable-src');

  return {
    src,
    endowments: { table },
    table, // for debugging/testing
  };
}
