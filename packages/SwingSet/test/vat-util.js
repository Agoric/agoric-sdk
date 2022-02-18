// this file is imported by some test vats, so don't import any non-pure
// modules

import { assert } from '@agoric/assert';
import { QCLASS } from '@endo/marshal';

export const extractMessage = vatDeliverObject => {
  const [type, ...vdoargs] = vatDeliverObject;
  assert.equal(type, 'message', `util.js .extractMessage`);
  const [facetID, msg] = vdoargs;
  const { method, args, result } = msg;
  return { facetID, method, args, result };
};

export const capdata = (body, slots = []) => harden({ body, slots });

const marshalBigIntReplacer = (_, arg) => {
  if (typeof arg === 'bigint') {
    return { [QCLASS]: 'bigint', digits: String(arg) };
  }
  return arg;
};

export const capargs = (args, slots = []) =>
  capdata(JSON.stringify(args, marshalBigIntReplacer), slots);

export const ignore = p => {
  p.then(
    () => 0,
    () => 0,
  );
};
