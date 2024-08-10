// this file is imported by some test vats, so don't import any non-pure
// modules

import { assert } from '@endo/errors';
import { kser, kunser } from '@agoric/kmarshal';

export function extractMessage(vatDeliverObject) {
  const [type, ...vdoargs] = vatDeliverObject;
  assert.equal(type, 'message', `util.js .extractMessage got type ${type}`);
  const [facetID, msg] = vdoargs;
  const { methargs, result } = msg;
  const [method, argsdata] = kunser(methargs);
  const args = kser(argsdata);
  return { facetID, method, args, result };
}

export function ignore(p) {
  p.then(
    () => 0,
    () => 0,
  );
}

export const vstr = v => JSON.stringify(kser(v));
