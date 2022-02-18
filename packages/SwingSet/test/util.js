import anylogger from 'anylogger';

import { waitUntilQuiescent } from '../src/waitUntilQuiescent.js';
import { provideHostStorage } from '../src/hostStorage.js';
import { WeakRef, FinalizationRegistry } from '../src/weakref.js';
import { createSHA256 } from '../src/hasher.js';
import { extractMessage, capdata, capargs, ignore } from './vat-util.js';

export { extractMessage, capdata, capargs, ignore };

const compareArraysOfStrings = (a, b) => {
  a = a.join(' ');
  b = b.join(' ');
  if (a > b) {
    return 1;
  }
  if (a < b) {
    return -1;
  }
  return 0;
};

export const checkKT = (t, kernel, expected) => {
  // extract the "kernel table" (a summary of all Vat clists) and assert that
  // the contents match the expected list. This does a sort of the two lists
  // before a t.deepEqual, which makes it easier to incrementally add
  // expected mappings.

  const got = Array.from(kernel.dump().kernelTable);
  got.sort(compareArraysOfStrings);
  expected = Array.from(expected);
  expected.sort(compareArraysOfStrings);
  t.deepEqual(got, expected);
};

export const dumpKT = kernel => {
  const got = Array.from(kernel.dump().kernelTable).map(
    ([kid, vatdev, vid]) => [vatdev, vid, kid],
  );
  got.sort(compareArraysOfStrings);
  for (const [vatdev, vid, kid] of got) {
    console.log(`${vatdev}:${vid} <-> ${kid}`);
  }
};

export const buildDispatch = (onDispatchCallback = undefined) => {
  const log = [];

  const dispatch = vatDeliverObject => {
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
  };

  return { log, dispatch };
};

export const capSlot = index => ({
  '@qclass': 'slot',
  iface: 'Alleged: export',
  index,
});

export const capdataOneSlot = slot =>
  capargs({ '@qclass': 'slot', iface: 'Alleged: export', index: 0 }, [slot]);

export const capargsOneSlot = slot =>
  capargs([{ '@qclass': 'slot', iface: 'Alleged: export', index: 0 }], [slot]);

export const makeMessage = (target, method, args, result = null) => {
  const msg = { method, args, result };
  const vatDeliverObject = harden(['message', target, msg]);
  return vatDeliverObject;
};

export const makeBringOutYourDead = () => harden(['bringOutYourDead']);

export const makeResolutions = resolutions => {
  const vatDeliverObject = harden(['notify', resolutions]);
  return vatDeliverObject;
};

export const makeResolve = (target, result) => {
  const resolutions = [[target, false, result]];
  return makeResolutions(resolutions);
};

export const makeReject = (target, result) => {
  const resolutions = [[target, true, result]];
  const vatDeliverObject = harden(['notify', resolutions]);
  return vatDeliverObject;
};

export const makeDropExports = (...vrefs) => {
  const vatDeliverObject = harden(['dropExports', vrefs]);
  return vatDeliverObject;
};

export const makeRetireExports = (...vrefs) => {
  const vatDeliverObject = harden(['retireExports', vrefs]);
  return vatDeliverObject;
};

export const makeRetireImports = (...vrefs) => {
  const vatDeliverObject = harden(['retireImports', vrefs]);
  return vatDeliverObject;
};

const makeConsole = tag => {
  const log = anylogger(tag);
  const cons = {};
  for (const level of ['debug', 'log', 'info', 'warn', 'error']) {
    cons[level] = log[level];
  }
  return harden(cons);
};

export const makeKernelEndowments = () => ({
  waitUntilQuiescent,
  hostStorage: provideHostStorage(),
  runEndOfCrank: () => {},
  makeConsole,
  WeakRef,
  FinalizationRegistry,
  createSHA256,
});
