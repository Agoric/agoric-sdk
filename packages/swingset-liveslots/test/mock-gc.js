// @ts-nocheck
import { waitUntilQuiescent } from './waitUntilQuiescent.js';
import { makeDummyMeterControl } from './dummyMeterControl.js';

// Create a WeakRef/FinalizationRegistry pair that can be manipulated for
// tests. Limitations:
// * only one WeakRef per object
// * no deregister
// * extra debugging properties like FR.countCallbacks and FR.runOneCallback
// * nothing is hardened

export function makeMockGC() {
  const weakRefToVal = new Map();
  const valToWeakRef = new Map();
  const allFRs = [];
  // eslint-disable-next-line no-unused-vars
  function log(...args) {
    // console.log(...args);
  }

  const mockWeakRefProto = {
    deref() {
      return weakRefToVal.get(this);
    },
  };
  function mockWeakRef(val) {
    assert(!valToWeakRef.has(val));
    weakRefToVal.set(this, val);
    valToWeakRef.set(val, this);
  }
  mockWeakRef.prototype = mockWeakRefProto;

  function kill(val) {
    log(`kill`, val);
    if (valToWeakRef.has(val)) {
      log(` killing weakref`);
      const wr = valToWeakRef.get(val);
      valToWeakRef.delete(val);
      weakRefToVal.delete(wr);
    }
    for (const fr of allFRs) {
      if (fr.registry.has(val)) {
        log(` pushed on FR queue, context=`, fr.registry.get(val));
        fr.ready.push(val);
      }
    }
    log(` kill done`);
  }

  function weakRefFor(val) {
    return valToWeakRef.get(val);
  }

  const mockFinalizationRegistryProto = {
    register(val, context) {
      log(`FR.register(context=${context})`);
      this.registry.set(val, context);
    },
    countCallbacks() {
      log(`countCallbacks:`);
      log(` ready:`, this.ready);
      log(` registry:`, this.registry);
      return this.ready.length;
    },
    runOneCallback() {
      log(`runOneCallback`);
      const val = this.ready.shift();
      log(` val:`, val);
      assert(this.registry.has(val));
      const context = this.registry.get(val);
      log(` context:`, context);
      this.registry.delete(val);
      this.callback(context);
    },
    flush() {
      while (this.ready.length) {
        this.runOneCallback();
      }
    },
  };

  function mockFinalizationRegistry(callback) {
    this.registry = new Map();
    this.callback = callback;
    this.ready = [];
    allFRs.push(this);
  }
  mockFinalizationRegistry.prototype = mockFinalizationRegistryProto;

  function getAllFRs() {
    return allFRs;
  }
  function flushAllFRs() {
    allFRs.map(fr => fr.flush());
  }

  function mockGCAndFinalize() {}

  return harden({
    WeakRef: mockWeakRef,
    FinalizationRegistry: mockFinalizationRegistry,
    kill,
    weakRefFor,
    getAllFRs,
    flushAllFRs,
    waitUntilQuiescent,
    gcAndFinalize: mockGCAndFinalize,
    meterControl: makeDummyMeterControl(),
  });
}
