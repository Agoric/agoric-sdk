/* eslint-disable global-require */
/* global globalThis require */
let bestGC = globalThis.gc;
if (typeof bestGC !== 'function') {
  // Node.js v8 wizardry.
  const v8 = require('v8');
  const vm = require('vm');
  v8.setFlagsFromString('--expose_gc');
  bestGC = vm.runInNewContext('gc');
  // Hide the gc global from new contexts/workers.
  v8.setFlagsFromString('--no-expose_gc');
}

// Export a const.
const engineGC = bestGC;
export default engineGC;
