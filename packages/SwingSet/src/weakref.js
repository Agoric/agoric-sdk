/* global globalThis */

/*
 * We retain a measure of compatibility with Node.js v12, which does not
 * expose WeakRef or FinalizationRegistry (there is a --flag for it, but it's
 * * not clear how stable it is). When running on a platform without these *
 * tools, vats cannot do GC, and the tools they get will be no-ops. WeakRef
 * instances will hold a strong reference, and the FinalizationRegistry will
 * never invoke the callbacks.
 *
 * Modules should do:
 *
 *  import { WeakRef, FinalizationRegistry } from '.../weakref';
 *
 */

function FakeWeakRef(obj) {
  const wr = Object.create({
    deref: () => obj,
  });
  delete wr.constructor;
  return wr;
}

function FakeFinalizationRegistry(_callback) {
  const fr = Object.create({
    register: (_obj, _handle) => undefined,
    unregister: _handle => undefined,
  });
  delete fr.constructor;
  return fr;
}

const WR = globalThis.WeakRef || FakeWeakRef;
const FR = globalThis.FinalizationRegistry || FakeFinalizationRegistry;

export const WeakRef = WR;
export const FinalizationRegistry = FR;
