/* global WeakRef, FinalizationRegistry */
import { kser } from '@agoric/kmarshal';

import engineGC from './engine-gc.js';
import { waitUntilQuiescent } from './waitUntilQuiescent.js';
import { makeGcAndFinalize } from './gc-and-finalize.js';
import { makeDummyMeterControl } from './dummyMeterControl.js';
import { makeLiveSlots } from '../src/liveslots.js';
import {
  makeMessage,
  makeDropExports,
  makeRetireImports,
  makeRetireExports,
  makeBringOutYourDead,
} from './util.js';

/**
 * @param {object} [options]
 * @param {boolean} [options.skipLogging]
 * @param {Map<string, string>} [options.kvStore]
 */
export function buildSyscall(options = {}) {
  const { skipLogging = false, kvStore: fakestore = new Map() } = options;
  const log = [];
  let sortedKeys;
  let priorKeyReturned;
  let priorKeyIndex;

  function appendLog(s) {
    if (!skipLogging) {
      log.push(s);
    }
  }

  function ensureSorted() {
    if (!sortedKeys) {
      sortedKeys = [];
      for (const key of fakestore.keys()) {
        sortedKeys.push(key);
      }
      sortedKeys.sort((k1, k2) => k1.localeCompare(k2));
    }
  }

  function clearGetNextKeyCache() {
    priorKeyReturned = undefined;
    priorKeyIndex = -1;
  }
  clearGetNextKeyCache();

  function clearSorted() {
    sortedKeys = undefined;
    clearGetNextKeyCache();
  }

  const syscall = {
    send(targetSlot, methargs, resultSlot) {
      appendLog({ type: 'send', targetSlot, methargs, resultSlot });
    },
    subscribe(target) {
      appendLog({ type: 'subscribe', target });
    },
    resolve(resolutions) {
      appendLog({ type: 'resolve', resolutions });
    },
    dropImports(slots) {
      appendLog({ type: 'dropImports', slots });
    },
    retireImports(slots) {
      appendLog({ type: 'retireImports', slots });
    },
    retireExports(slots) {
      appendLog({ type: 'retireExports', slots });
    },
    exit(isFailure, info) {
      appendLog({ type: 'exit', isFailure, info });
    },
    vatstoreGet(key) {
      const result = fakestore.get(key);
      appendLog({ type: 'vatstoreGet', key, result });
      return result;
    },
    vatstoreGetNextKey(priorKey) {
      assert.typeof(priorKey, 'string');
      ensureSorted();
      // TODO: binary search for priorKey (maybe missing), then get
      // the one after that. For now we go simple and slow. But cache
      // a starting point, because the main use case is a full
      // iteration. OTOH, the main use case also deletes everything,
      // which will clobber the cache on each deletion, so it might
      // not help.
      const start = priorKeyReturned === priorKey ? priorKeyIndex : 0;
      let result;
      for (let i = start; i < sortedKeys.length; i += 1) {
        const key = sortedKeys[i];
        if (key > priorKey) {
          priorKeyReturned = key;
          priorKeyIndex = i;
          result = key;
          break;
        }
      }
      if (!result) {
        // reached end without finding the key, so clear our cache
        clearGetNextKeyCache();
      }
      appendLog({ type: 'vatstoreGetNextKey', priorKey, result });
      return result;
    },
    vatstoreSet(key, value) {
      appendLog({ type: 'vatstoreSet', key, value });
      if (!fakestore.has(key)) {
        clearSorted();
      }
      fakestore.set(key, value);
    },
    vatstoreDelete(key) {
      appendLog({ type: 'vatstoreDelete', key });
      if (fakestore.has(key)) {
        clearSorted();
      }
      fakestore.delete(key);
    },
  };

  return { syscall, fakestore, log };
}

export async function makeDispatch(
  syscall,
  build,
  vatID = 'vatA',
  liveSlotsOptions = {},
  vatParameters = undefined,
) {
  const gcTools = harden({
    WeakRef,
    FinalizationRegistry,
    waitUntilQuiescent,
    gcAndFinalize: makeGcAndFinalize(engineGC),
    meterControl: makeDummyMeterControl(),
  });
  const { dispatch, testHooks } = makeLiveSlots(
    syscall,
    vatID,
    {},
    liveSlotsOptions,
    gcTools,
    undefined,
    () => {
      return { buildRootObject: build };
    },
  );
  await dispatch(['startVat', kser(vatParameters)]);
  return { dispatch, testHooks };
}

function makeRPMaker(nextNumber = 1) {
  let idx = nextNumber - 1;
  return () => {
    idx += 1;
    return `p-${idx}`;
  };
}

/**
 * @param {import('ava').ExecutionContext} t
 * @param {Function} buildRootObject
 * @param {string} vatName
 * @param {object} [options]
 * @param {boolean} [options.forceGC]
 * @param {Map<string, string>} [options.kvStore]
 * @param {number} [options.nextPromiseImportNumber]
 * @param {boolean} [options.skipLogging]
 * @param {any} [options.vatParameters]
 */
export async function setupTestLiveslots(
  t,
  buildRootObject,
  vatName,
  options = {},
) {
  const {
    forceGC,
    kvStore = new Map(),
    nextPromiseImportNumber,
    skipLogging = false,
    vatParameters,
  } = options;
  const { log, syscall, fakestore } = buildSyscall({ skipLogging, kvStore });
  const nextRP = makeRPMaker(nextPromiseImportNumber);
  const { dispatch, testHooks } = await makeDispatch(
    syscall,
    buildRootObject,
    vatName,
    {},
    vatParameters,
  );

  async function dispatchMessage(message, ...args) {
    const rp = nextRP();
    await dispatch(makeMessage('o+0', message, args, rp));
    if (forceGC) {
      // XXX TERRIBLE HACK WARNING XXX The following GC call is terrible but
      // apparently sometimes necessary.  Without it, certain tests in some
      // test files will fail under Node 16 if run non-selectively (that is,
      // without the "-m 'your testname here'" flag) even though all tests in
      // the file will succeed under Node 14 regardless of how initiated and the
      // single test will succeed under Node 16 if run standalone.
      //
      // This nonsense suggests that under Node 16 there may be a problem with
      // Ava's logic for running multiple tests that is allowing one test to
      // side effect others even when they are nominally run sequentially.  In
      // particular, forcing a GC at the start of setupTestLiveslots (which you
      // would think would reset the heap to a consistent initial state at the
      // start of each test) does not change the circumstances of the failure,
      // but inserting the GC after message dispatch does.  None of this makes
      // any sense that I can discern, but I don't have time to diagnose this
      // right now.  Since this hack is part of mocking the kernel side here
      // anyway, I suspect that the likely large investment in time and effort
      // to puzzle out what's going on here won't have much payoff; it seems
      // plausible that whatever the issue is it may only impact the mock
      // environment.  Nevertheless there's a chance we may be courting some
      // deeper problem, hence this comment.
      engineGC();
      engineGC();
      engineGC();
    }
    await dispatch(makeBringOutYourDead());
    return rp;
  }

  async function dispatchMessageSuccessfully(message, ...args) {
    log.length = 0;
    const rp = await dispatchMessage(message, ...args);
    for (const l of log) {
      if (l.type === 'resolve') {
        for (const [vpid, rejected, value] of l.resolutions) {
          if (vpid === rp) {
            if (rejected) {
              throw Error(`vpid ${rp} rejected with ${value}`);
            } else {
              return value; // resolved successfully
            }
          }
        }
      }
    }
    throw Error(`vpid ${rp} failed to resolve`);
  }

  async function dispatchDropExports(...vrefs) {
    await dispatch(makeDropExports(...vrefs));
    await dispatch(makeBringOutYourDead());
  }
  async function dispatchRetireImports(...vrefs) {
    await dispatch(makeRetireImports(...vrefs));
    await dispatch(makeBringOutYourDead());
  }
  async function dispatchRetireExports(...vrefs) {
    await dispatch(makeRetireExports(...vrefs));
    await dispatch(makeBringOutYourDead());
  }

  function dumpFakestore() {
    for (const key of [...fakestore.keys()].sort()) {
      console.log(`--fs: ${key} -> ${fakestore.get(key)}`);
    }
  }

  const v = { t, log, fakestore, dumpFakestore };

  return {
    v,
    dispatch,
    dispatchMessage,
    dispatchMessageSuccessfully,
    dispatchDropExports,
    dispatchRetireExports,
    dispatchRetireImports,
    testHooks,
  };
}

export function findSyscallsByType(log, type) {
  return log.filter(m => m.type === type);
}
