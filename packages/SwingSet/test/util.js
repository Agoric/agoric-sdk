import { assert } from '@agoric/assert';
import { QCLASS } from '@endo/marshal';

function compareArraysOfStrings(a, b) {
  a = a.join(' ');
  b = b.join(' ');
  if (a > b) {
    return 1;
  }
  if (a < b) {
    return -1;
  }
  return 0;
}

export function checkKT(t, kernel, expected) {
  // extract the "kernel table" (a summary of all Vat clists) and assert that
  // the contents match the expected list. This does a sort of the two lists
  // before a t.deepEqual, which makes it easier to incrementally add
  // expected mappings.

  const got = Array.from(kernel.dump().kernelTable);
  got.sort(compareArraysOfStrings);
  expected = Array.from(expected);
  expected.sort(compareArraysOfStrings);
  t.deepEqual(got, expected);
}

export function dumpKT(kernel) {
  const got = Array.from(
    kernel.dump().kernelTable,
  ).map(([kid, vatdev, vid]) => [vatdev, vid, kid]);
  got.sort(compareArraysOfStrings);
  for (const [vatdev, vid, kid] of got) {
    console.log(`${vatdev}:${vid} <-> ${kid}`);
  }
}

export function buildDispatch(onDispatchCallback = undefined) {
  const log = [];

  function dispatch(vatDeliverObject) {
    const [type, ...vdoargs] = vatDeliverObject;
    if (type === 'message') {
      const [target, msg] = vdoargs;
      const { method, args, result } = msg;
      const d = {
        type: 'deliver',
        targetSlot: target,
        method,
        args,
        resultSlot: result,
      };
      log.push(d);
      if (onDispatchCallback) {
        onDispatchCallback(d);
      }
    } else if (type === 'notify') {
      const [resolutions] = vdoargs;
      const d = { type: 'notify', resolutions };
      log.push(d);
      if (onDispatchCallback) {
        onDispatchCallback(d);
      }
    } else {
      throw Error(`unknown vatDeliverObject type ${type}`);
    }
  }

  return { log, dispatch };
}

export function ignore(p) {
  p.then(
    () => 0,
    () => 0,
  );
}

export function extractMessage(vatDeliverObject) {
  const [type, ...vdoargs] = vatDeliverObject;
  assert.equal(type, 'message', `util.js .extractMessage`);
  const [facetID, msg] = vdoargs;
  const { method, args, result } = msg;
  return { facetID, method, args, result };
}

export function capdata(body, slots = []) {
  return harden({ body, slots });
}

function marshalBigIntReplacer(_, arg) {
  if (typeof arg === 'bigint') {
    return { [QCLASS]: 'bigint', digits: String(arg) };
  }
  return arg;
}

export function capargs(args, slots = []) {
  return capdata(JSON.stringify(args, marshalBigIntReplacer), slots);
}

export function capSlot(index) {
  return { '@qclass': 'slot', iface: 'Alleged: export', index };
}

export function capdataOneSlot(slot) {
  return capargs({ '@qclass': 'slot', iface: 'Alleged: export', index: 0 }, [
    slot,
  ]);
}

export function capargsOneSlot(slot) {
  return capargs(
    [{ '@qclass': 'slot', iface: 'Alleged: export', index: 0 }],
    [slot],
  );
}

export function makeMessage(target, method, args, result = null) {
  const msg = { method, args, result };
  const vatDeliverObject = harden(['message', target, msg]);
  return vatDeliverObject;
}

export function makeBringOutYourDead() {
  return harden(['bringOutYourDead']);
}

export function makeResolutions(resolutions) {
  const vatDeliverObject = harden(['notify', resolutions]);
  return vatDeliverObject;
}

export function makeResolve(target, result) {
  const resolutions = [[target, false, result]];
  return makeResolutions(resolutions);
}

export function makeReject(target, result) {
  const resolutions = [[target, true, result]];
  const vatDeliverObject = harden(['notify', resolutions]);
  return vatDeliverObject;
}

export function makeDropExports(...vrefs) {
  const vatDeliverObject = harden(['dropExports', vrefs]);
  return vatDeliverObject;
}

export function makeRetireExports(...vrefs) {
  const vatDeliverObject = harden(['retireExports', vrefs]);
  return vatDeliverObject;
}

export function makeRetireImports(...vrefs) {
  const vatDeliverObject = harden(['retireImports', vrefs]);
  return vatDeliverObject;
}
