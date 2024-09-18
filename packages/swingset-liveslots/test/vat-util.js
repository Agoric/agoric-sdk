// this file is imported by some test vats, so don't import any non-pure
// modules

import { kser, kunser } from '@agoric/kmarshal';
import { Fail } from '@endo/errors';

export function extractMessage(vatDeliverObject) {
  const [type, ...vdoargs] = vatDeliverObject;
  type === 'message' || Fail`util.js .extractMessage got type ${type}`;
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
