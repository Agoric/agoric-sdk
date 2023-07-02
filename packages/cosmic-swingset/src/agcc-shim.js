/* global process */
import { Fail } from '@agoric/assert';

let agccP;
const { AGVM_FROM_AGD, AGVM_TO_AGD } = process.env;
if (AGVM_FROM_AGD && AGVM_TO_AGD) {
  const fd = [parseInt(AGVM_FROM_AGD, 10), parseInt(AGVM_TO_AGD, 10)];
  for (const f of fd) {
    Number.isSafeInteger(f) || Fail(`fd ${f} must be a safe integer`);
    f >= 0 || Fail(`fd ${f} must be non-negative`);
  }
  const spec = JSON.stringify({
    agd: { fd },
  });
  agccP = import('./agcc-agvm.js').then(ns => ns.makeAgccFromSpec(spec));
} else {
  agccP = import('@agoric/cosmos').then(ns => ns.default);
}

const dflt = agccP;
export default dflt;
