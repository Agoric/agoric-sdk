/* global process */
let agccP;
const i = process.argv.indexOf('--vm-spec');
if (i >= 0) {
  const spec = process.argv[i + 1];
  agccP = import('./agcc-agvm.js').then(ns => ns.makeAgccFromSpec(spec));
} else {
  agccP = import('@agoric/cosmos').then(ns => ns.default);
}

const dflt = agccP;
export default dflt;
