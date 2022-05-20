// this file is imported by some test vats, so don't import any non-pure
// modules

import { assert } from '@agoric/assert';
import { QCLASS } from '@endo/marshal';

export function extractMessage(vatDeliverObject) {
  const [type, ...vdoargs] = vatDeliverObject;
  assert.equal(type, 'message', `util.js .extractMessage got type ${type}`);
  const [facetID, msg] = vdoargs;
  const { methargs, result } = msg;
  const methargsdata = JSON.parse(methargs.body);
  const [method, argsdata] = methargsdata;
  const args = { body: JSON.stringify(argsdata), slots: methargs.slots };
  return { facetID, method, args, result };
}

export function capdata(body, slots = []) {
  return harden({ body, slots });
}

function replacer(_, arg) {
  if (typeof arg === 'bigint') {
    return { [QCLASS]: 'bigint', digits: String(arg) };
  }
  if (arg === undefined) {
    return { [QCLASS]: 'undefined' };
  }
  return arg;
}

export function capargs(args, slots = []) {
  return capdata(JSON.stringify(args, replacer), slots);
}

export function ignore(p) {
  p.then(
    () => 0,
    () => 0,
  );
}
