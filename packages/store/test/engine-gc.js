import v8 from 'v8';
import vm from 'vm';

/* global globalThis */
let bestGC = globalThis.gc;
if (typeof bestGC !== 'function') {
  // Node.js v8 wizardry.
  v8.setFlagsFromString('--expose_gc');
  bestGC = vm.runInNewContext('gc');
  assert(bestGC);
  // We leave --expose_gc turned on, otherwise AVA's shared workers
  // may race and disable it before we manage to extract the
  // binding. This won't cause 'gc' to be visible to new Compartments
  // because SES strips out everything it doesn't recognize.

  // // Hide the gc global from new contexts/workers.
  // v8.setFlagsFromString('--no-expose_gc');
}

// Export a const.
const engineGC = bestGC;
export default engineGC;
