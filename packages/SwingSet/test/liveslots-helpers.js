/* global WeakRef, FinalizationRegistry */
import engineGC from '../src/lib-nodejs/engine-gc.js';

import { waitUntilQuiescent } from '../src/lib-nodejs/waitUntilQuiescent.js';
import { makeGcAndFinalize } from '../src/lib-nodejs/gc-and-finalize.js';
import { makeDummyMeterControl } from '../src/kernel/dummyMeterControl.js';
import { makeLiveSlots } from '../src/liveslots/liveslots.js';
import {
  capargs,
  makeMessage,
  makeDropExports,
  makeRetireImports,
  makeRetireExports,
  makeBringOutYourDead,
} from './util.js';

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

export async function makeDispatch(
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
  const { dispatch, startVat, testHooks } = makeLiveSlots(
    syscall,
    vatID,
    {},
    cacheSize,
    enableDisavow,
    false,
    gcTools,
    undefined,
    () => {
      return { buildRootObject: build };
    },
  );
  await startVat(capargs());
  if (returnTestHooks) {
    returnTestHooks[0] = testHooks;
  }
  return dispatch;
}

function makeRPMaker() {
  let idx = 0;
  return () => {
    idx += 1;
    return `p-${idx}`;
  };
}

export async function setupTestLiveslots(t, buildRootObject, vatName, forceGC) {
  const { log, syscall } = buildSyscall();
  const nextRP = makeRPMaker();
  const th = [];
  const dispatch = await makeDispatch(
    syscall,
    buildRootObject,
    vatName,
    false,
    0,
    th,
  );
  const [testHooks] = th;

  async function dispatchMessage(message, args = capargs([])) {
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
    }
    await dispatch(makeBringOutYourDead());
    return rp;
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

  const v = { t, log };

  return {
    v,
    dispatchMessage,
    dispatchDropExports,
    dispatchRetireExports,
    dispatchRetireImports,
    testHooks,
  };
}

export function matchResolveOne(vref, value) {
  return { type: 'resolve', resolutions: [[vref, false, value]] };
}

export function matchVatstoreGet(key, result) {
  return { type: 'vatstoreGet', key, result };
}

export function matchVatstoreGetAfter(priorKey, start, end, result) {
  return { type: 'vatstoreGetAfter', priorKey, start, end, result };
}

export function matchVatstoreDelete(key) {
  return { type: 'vatstoreDelete', key };
}

export function matchVatstoreSet(key, value) {
  if (value !== undefined) {
    return { type: 'vatstoreSet', key, value };
  } else {
    return { type: 'vatstoreSet', key };
  }
}

export function matchRetireExports(...slots) {
  return { type: 'retireExports', slots };
}

export function matchDropImports(...slots) {
  return { type: 'dropImports', slots };
}

export function matchRetireImports(...slots) {
  return { type: 'retireImports', slots };
}

export function validate(v, match) {
  v.t.like(v.log.shift(), match);
}

export function validateDone(v) {
  v.t.deepEqual(v.log, []);
}

export function validateReturned(v, rp) {
  validate(v, matchResolveOne(rp, capargs({ '@qclass': 'undefined' })));
}
