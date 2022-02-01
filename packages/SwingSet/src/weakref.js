/* global globalThis */
import { assert, details as X } from '@agoric/assert';
import { isObject } from '@endo/marshal';

const { defineProperties } = Object;

/*
 * We retain a measure of compatibility with Node.js v12, which does not
 * expose WeakRef or FinalizationRegistry (there is a --flag for it, but it's
 * not clear how stable it is). When running on a platform without these
 * tools, vats cannot do GC, and the tools they get will be no-ops. WeakRef
 * instances will hold a strong reference, and the FinalizationRegistry will
 * never invoke the callbacks.
 *
 * Modules should do:
 *
 *  import { WeakRef, FinalizationRegistry } from '.../weakref';
 *
 */

// TODO We need to migrate this into a ses-level tame-weakref.js, to happen
// as part of `lockdown`. In anticipation, this uses some of the patterns
// followed by the other tamings there.

// Emulate the internal [[WeakRefTarget]] slot. Despite the term "Weak" in the
// "WeakMap" used in the emulation, this map holds the target strongly. The only
// weakness here is that the weakref,target pair can go away together if the
// weakref is not reachable.
const weakRefTarget = new WeakMap();

const FakeWeakRef = function WeakRef(target) {
  assert(
    new.target !== undefined,
    X`WeakRef Constructor requires 'new'`,
    TypeError,
  );
  assert(isObject(target), X`WeakRef target must be an object`, TypeError);
  weakRefTarget.set(this, target);
};

const InertWeakRef = function WeakRef(_target) {
  throw new TypeError('Not available');
};

const FakeWeakRefPrototype = {
  deref() {
    return weakRefTarget.get(this);
  },
  [Symbol.toStringTag]: 'WeakRef',
};

defineProperties(FakeWeakRef, {
  prototype: { value: FakeWeakRefPrototype },
});

const WeakRef = globalThis.WeakRef || FakeWeakRef;

// If there is a real WeakRef constructor, we still make it safe before
// exporting it. Unlike https://github.com/tc39/ecma262/issues/2214
// rather than deleting the `constructor` property, we follow the other
// taming patterns and point it at a throw-only inert one.
defineProperties(WeakRef.prototype, {
  constructor: { value: InertWeakRef },
});

harden(WeakRef);

export { WeakRef };

// /////////////////////////////////////////////////////////////////////////////

const FakeFinalizationRegistry = function FinalizationRegistry(
  cleanupCallback,
) {
  assert(
    new.target !== undefined,
    X`FinalizationRegistry Constructor requires 'new'`,
    TypeError,
  );
  assert.typeof(
    cleanupCallback,
    'function',
    X`cleanupCallback must be a function`,
  );
  // fall off the end with an empty instance
};

const InertFinalizationRegistry = function FinalizationRegistry(
  _cleanupCallback,
) {
  throw new TypeError('Not available');
};

const FakeFinalizationRegistryPrototype = {
  register() {},
  unregister() {},
  [Symbol.toStringTag]: 'FinalizationRegistry',
};

defineProperties(FakeFinalizationRegistry, {
  prototype: { value: FakeFinalizationRegistryPrototype },
});

const FinalizationRegistry =
  globalThis.FinalizationRegistry || FakeFinalizationRegistry;

// If there is a real FinalizationRegistry constructor, we still make it safe
// before exporting it. Rather than deleting the `constructor` property, we
// follow the other taming patterns and point it at a throw-only inert one.
defineProperties(FinalizationRegistry.prototype, {
  constructor: { value: InertFinalizationRegistry },
});

harden(FinalizationRegistry);

export { FinalizationRegistry };
