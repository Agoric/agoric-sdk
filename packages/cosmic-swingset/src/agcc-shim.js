/* global process */
let agccP;
const { AGVM_FROM_AGD, AGVM_TO_AGD } = process.env;
if (AGVM_FROM_AGD && AGVM_TO_AGD) {
  const spec = JSON.stringify({
    agd: { fd: [parseInt(AGVM_FROM_AGD, 10), parseInt(AGVM_TO_AGD, 10)] },
  });
  agccP = import('./agcc-agvm.js').then(ns => ns.makeAgccFromSpec(spec));
} else {
  agccP = import('@agoric/cosmos').then(ns => ns.default);
}

const dflt = agccP;
export default dflt;
