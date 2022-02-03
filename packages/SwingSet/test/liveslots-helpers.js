import engineGC from '../src/engine-gc.js';

import { WeakRef, FinalizationRegistry } from '../src/weakref.js';
import { waitUntilQuiescent } from '../src/waitUntilQuiescent.js';
import { makeGcAndFinalize } from '../src/gc-and-finalize.js';
import { makeDummyMeterControl } from '../src/kernel/dummyMeterControl.js';
import { makeLiveSlots } from '../src/kernel/liveSlots.js';

export function buildSyscall() {
  const log = [];
  const fakestore = new Map();
  let sortedKeys;
  let priorKeyReturned;
  let priorKeyIndex;

  function ensureSorted() {
    if (!sortedKeys) {
      sortedKeys = [];
      for (const key of fakestore.keys()) {
        sortedKeys.push(key);
      }
      sortedKeys.sort((k1, k2) => k1.localeCompare(k2));
    }
  }

  function clearSorted() {
    sortedKeys = undefined;
    priorKeyReturned = undefined;
    priorKeyIndex = -1;
  }

  const syscall = {
    send(targetSlot, method, args, resultSlot) {
      log.push({ type: 'send', targetSlot, method, args, resultSlot });
    },
    subscribe(target) {
      log.push({ type: 'subscribe', target });
    },
    resolve(resolutions) {
      log.push({ type: 'resolve', resolutions });
    },
    dropImports(slots) {
      log.push({ type: 'dropImports', slots });
    },
    retireImports(slots) {
      log.push({ type: 'retireImports', slots });
    },
    retireExports(slots) {
      log.push({ type: 'retireExports', slots });
    },
    exit(isFailure, info) {
      log.push({ type: 'exit', isFailure, info });
    },
    vatstoreGet(key) {
      const result = fakestore.get(key);
      log.push({ type: 'vatstoreGet', key, result });
      return result;
    },
    vatstoreSet(key, value) {
      log.push({ type: 'vatstoreSet', key, value });
      if (!fakestore.has(key)) {
        clearSorted();
      }
      fakestore.set(key, value);
    },
    vatstoreDelete(key) {
      log.push({ type: 'vatstoreDelete', key });
      if (fakestore.has(key)) {
        clearSorted();
      }
      fakestore.delete(key);
    },
    vatstoreGetAfter(priorKey, start, end) {
      let actualEnd = end;
      if (!end) {
        const lastChar = String.fromCharCode(start.slice(-1).charCodeAt(0) + 1);
        actualEnd = `${start.slice(0, -1)}${lastChar}`;
      }
      ensureSorted();
      let from = 0;
      if (priorKeyReturned === priorKey) {
        from = priorKeyIndex;
      }
      let result = [undefined, undefined];
      for (let i = from; i < sortedKeys.length; i += 1) {
        const key = sortedKeys[i];
        if (key >= actualEnd) {
          priorKeyReturned = undefined;
          priorKeyIndex = -1;
          break;
        } else if (key > priorKey && key >= start) {
          priorKeyReturned = key;
          priorKeyIndex = i;
          result = [key, fakestore.get(key)];
          break;
        }
      }
      log.push({ type: 'vatstoreGetAfter', priorKey, start, end, result });
      return result;
    },
  };

  return { log, syscall };
}

export function makeDispatch(
  syscall,
  build,
  vatID = 'vatA',
  enableDisavow = false,
  cacheSize = undefined,
  returnTestHooks = undefined,
) {
  const gcTools = harden({
    WeakRef,
    FinalizationRegistry,
    waitUntilQuiescent,
    gcAndFinalize: makeGcAndFinalize(engineGC),
    meterControl: makeDummyMeterControl(),
  });
  const { setBuildRootObject, dispatch, testHooks } = makeLiveSlots(
    syscall,
    vatID,
    {},
    {},
    cacheSize,
    enableDisavow,
    false,
    gcTools,
  );
  if (returnTestHooks) {
    returnTestHooks[0] = testHooks;
  }
  setBuildRootObject(build);
  return dispatch;
}
