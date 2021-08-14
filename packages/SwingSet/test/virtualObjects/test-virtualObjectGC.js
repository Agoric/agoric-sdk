import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { Far } from '@agoric/marshal';
import { buildSyscall, makeDispatch } from '../liveslots-helpers.js';
import {
  capargs,
  makeMessage,
  makeDropExports,
  makeRetireImports,
  makeRetireExports,
} from '../util.js';

// Legs:
//
// Possible retainers of a VO (ensuring continued reachability):
//   L: variable in local memory
//   E: export to kernel (reachable)
//   V: virtual object property (vprop) state
// Additionally, the kernel may remember a VO (ensuring continued recognizability)
//   R: recognizable to kernel
//
// We denote the presence of a leg these via its letter in upper case, its
// absence by the letter in lower case, and "don't care" by ".".
//
// In principle there are 2^4 = 16 conceivable states, but not all are possible.
// States .er.., ..ER.., and .eR.. are possible, but .Er.. is not, since
// reachability always implies recognizability, which reduces the number of
// states to 12.
//
// In addition, any transition into the state leRv implies the loss of
// reachability, which results in the issuance of a `retireExports` syscall,
// resulting in turn to an immediate and automatic transition into state
// lerv. Thus, for purposes of analysis of state transitions driven by events
// *external* to the VO garbage collection machinery, the state leRv does not
// exist and so the state diagram in the model here has 11 states.
//
// The initial state is lerv, which is essentially the state of non-existence.
// The act of creation yields the first local reference to the object and thus
// the first state transition is always to Lerv.
//
// When the state reaches le.v the VO is no longer reachable and may be garbage
// collected (although right now the transition ...V -> ...v never happens
// because we still need to implement vprop refcounting for this).
//
// When the state reaches lerv the VO is no longer recognizable anywhere and
// any weak collection entries that use the VO as a key should be removed.

// There may be more than one local reference, hence L subsumes all states with
// 1 or more, whereas l implies there are 0.  Detection of the transition from L
// to l is handled by a JS finalizer.

// There may be more than one vprop reference, hence V subsumes all states with
// 1 or more, whereas v implies there are 0.  However, since we currently lack
// GC for vprop references, V more properly implies that there was at least 1
// reference at some point, although currently there may be any number including
// 0 (i.e., the transition from V to v is currently undetectable).

// The transitions from E to e and R to r happen as the result of explicit
// deliveries (dropExport and retireExport respectively) from the kernel.  (The
// retireExport syscall does not result in a transition but rather informs the
// kernel of the consequences of a state transition that resulted in loss of
// recognizability.)

// The possible state transitions are:
//   lerv -create-> Lerv  (creation) [1]
//   Ler. -export-> LER.  (export) [2]
//   L..v -vstore-> L..V  (store in vprop) [3]
//
//   L... -droplr-> l...  (drop local reference) [6]
//   lER. -delivr-> LER.  (reacquire local reference via delivery) [2]
//   l..V -readvp-> L..V  (reacquire local reference via read from vprop) [3]
//
//   .ER. -dropex-> .eR.  (d.dropExport) [4]
//   .eR. -retexp-> .er.  (d.retireExport) [3]
//
//   ...V -overwr-> ...v  (overwrite last vprop) [6]
//
// While in the above notation "." denotes "don't care", the legs not cared
// about are always the same in the before and after states of each state
// transition, hence each of the transition patterns above represents 2^N
// transitions, where N is the number of dots on either side of the arrow
// (minus, once again, the excluded Er states).  Since each of these 2^N
// transitions represents a potentially different path through the code, test
// cases must be constructed that exercise each of them.  Although there's a
// total of 30 of state transitions, testing each requires setting up the before
// state, which can be the after state of some earlier transition being tested,
// thus the actual tests consist of a smaller number of manually constructed
// (and somewhat ad hoc) paths through state space that collectively hit all the
// possible state transitions.

// Any transition to lerv from L... or .E.. or ...V should trigger the garbage
// collection of the virtual object.

// Any Transition to lerv (from ..R.) should trigger retirement of the virtual
// object's identity.

//   lerv -create-> Lerv

//   Lerv -export-> LERv
//   LerV -export-> LERV

//   Lerv -vstore-> LerV
//   LeRv -vstore-> LeRV
//   LERv -vstore-> LERV

//   Lerv -droplr-> lerv gc
//   LerV -droplr-> lerV
//   LeRv -droplr-> lerv gc, ret
//   LeRV -droplr-> leRV
//   LERv -droplr-> lERv
//   LERV -droplr-> lERV

//   lERv -delivr-> LERv
//   lERV -delivr-> LERV

//   lerV -readvp-> LerV
//   leRV -readvp-> LeRV
//   lERV -readvp-> LERV

//   lERv -dropex-> lerv gc, ret
//   lERV -dropex-> leRV
//   LERv -dropex-> LeRv
//   LERV -dropex-> LeRV

//   leRV -retexp-> lerV
//   LeRv -retexp-> Lerv
//   LeRV -retexp-> LerV

// Theese transitions will not be available until we refcount virtualized references:

//   lerV -overwr-> lerv gc
//   leRV -overwr-> lerv gc, ret
//   LerV -overwr-> Lerv
//   LeRV -overwr-> LeRv
//   lERV -overwr-> lERv
//   LERV -overwr-> LERv

let aWeakMap;
let aWeakSet;

function buildRootObject(vatPowers) {
  const { makeKind, WeakMap, WeakSet } = vatPowers;
  function makeThingInstance(state) {
    return {
      init(label) {
        state.label = label;
      },
      self: Far('thing', {
        getLabel() {
          return state.label;
        },
      }),
    };
  }

  function makeVirtualHolderInstance(state) {
    return {
      init(value) {
        state.value = value;
      },
      self: Far('holder', {
        getValue() {
          return state.value;
        },
      }),
    };
  }

  const thingMaker = makeKind(makeThingInstance);
  const virtualHolderMaker = makeKind(makeVirtualHolderInstance);
  const cacheDisplacer = thingMaker('cacheDisplacer');
  let nextThingNumber = 0;
  let heldThing = null;
  let virtualHolder = null;
  aWeakMap = new WeakMap();
  aWeakSet = new WeakSet();

  function displaceCache() {
    return cacheDisplacer.getLabel();
  }

  function makeNextThing() {
    const thing = thingMaker(`thing #${nextThingNumber}`);
    nextThingNumber += 1;
    return thing;
  }

  return Far('root', {
    makeAndHold() {
      heldThing = makeNextThing();
      displaceCache();
    },
    makeAndHoldAndHoldWeakly() {
      heldThing = makeNextThing();
      aWeakMap.set(heldThing, 'arbitrary');
      aWeakSet.add(heldThing);
      displaceCache();
    },
    dropHeld() {
      heldThing = null;
      displaceCache();
    },
    storeHeld() {
      virtualHolder = virtualHolderMaker(heldThing);
      displaceCache();
    },
    fetchAndHold() {
      heldThing = virtualHolder.getValue();
      displaceCache();
    },
    exportHeld() {
      return heldThing;
    },
    importAndHold(thing) {
      heldThing = thing;
      displaceCache();
    },
    importAndHoldAndHoldWeakly(thing) {
      heldThing = thing;
      aWeakMap.set(heldThing, 'arbitrary');
      aWeakSet.add(heldThing);
      displaceCache();
    },
  });
}

function makeRPMaker() {
  let idx = 0;
  return () => {
    idx += 1;
    return `p-${idx}`;
  };
}

function capdata(data, slots = []) {
  return { body: JSON.stringify(data), slots };
}

const undefinedVal = capargs({ '@qclass': 'undefined' });

function thingRef(vref) {
  return capargs({ '@qclass': 'slot', iface: 'Alleged: thing', index: 0 }, [
    vref,
  ]);
}

function thingArg(vref) {
  return capargs(
    [{ '@qclass': 'slot', iface: 'Alleged: thing', index: 0 }],
    [vref],
  );
}

function thingValue(label) {
  return JSON.stringify({ label: capdata(label) });
}

function holderValue(vref) {
  return JSON.stringify({ value: thingRef(vref) });
}

function matchResolveOne(vref, value) {
  return { type: 'resolve', resolutions: [[vref, false, value]] };
}

function matchVatstoreGet(key) {
  return { type: 'vatstoreGet', key };
}

function matchVatstoreDelete(key) {
  return { type: 'vatstoreDelete', key };
}

function matchVatstoreSet(key, value) {
  return { type: 'vatstoreSet', key, value };
}

function matchRetireExports(...slots) {
  return { type: 'retireExports', slots };
}

function matchDropImports(...slots) {
  return { type: 'dropImports', slots };
}

const root = 'o+0';

const testObjValue = thingValue('thing #0');
const cacheObjValue = thingValue('cacheDisplacer');

function setupLifecycleTest() {
  const { log, syscall } = buildSyscall();
  const nextRP = makeRPMaker();
  const th = [];
  const dispatch = makeDispatch(syscall, buildRootObject, 'bob', false, 0, th);
  const [testHooks] = th;

  async function dispatchMessage(message, args) {
    const rp = nextRP();
    await dispatch(makeMessage(root, message, args, rp));
    return rp;
  }
  async function dispatchDropExports(...vrefs) {
    await dispatch(makeDropExports(...vrefs));
  }
  async function dispatchRetireImports(...vrefs) {
    await dispatch(makeRetireImports(...vrefs));
  }
  async function dispatchRetireExports(...vrefs) {
    await dispatch(makeRetireExports(...vrefs));
  }

  return {
    log,
    dispatchMessage,
    dispatchDropExports,
    dispatchRetireExports,
    dispatchRetireImports,
    testHooks,
  };
}

function validateCreate(t, log, rp) {
  t.deepEqual(log.shift(), matchVatstoreSet('vom.o+1/1', cacheObjValue));
  t.deepEqual(log.shift(), matchVatstoreSet('vom.o+1/2', testObjValue));
  t.deepEqual(log.shift(), matchVatstoreGet('vom.o+1/1'));
  t.deepEqual(log.shift(), matchResolveOne(rp, undefinedVal));
  t.deepEqual(log, []);
}

function validateStore(t, log, rp) {
  t.deepEqual(log.shift(), matchVatstoreGet('vom.rc.o+1/2'));
  t.deepEqual(log.shift(), matchVatstoreSet('vom.rc.o+1/2', '1'));
  t.deepEqual(log.shift(), matchVatstoreSet('vom.o+2/1', holderValue('o+1/2')));
  t.deepEqual(log.shift(), matchVatstoreGet('vom.o+1/1'));
  t.deepEqual(log.shift(), matchResolveOne(rp, undefinedVal));
  t.deepEqual(log, []);
}

function validateExport(t, log, rp) {
  t.deepEqual(log.shift(), matchVatstoreSet('vom.es.o+1/2', '1'));
  t.deepEqual(log.shift(), matchResolveOne(rp, thingRef('o+1/2')));
  t.deepEqual(log, []);
}

function validateImport(t, log, rp) {
  t.deepEqual(log.shift(), matchVatstoreGet('vom.o+1/1'));
  t.deepEqual(log.shift(), matchResolveOne(rp, undefinedVal));
  t.deepEqual(log, []);
}

function validateLoad(t, log, rp) {
  t.deepEqual(log.shift(), matchVatstoreGet('vom.o+2/1'));
  t.deepEqual(log.shift(), matchVatstoreGet('vom.o+1/1'));
  t.deepEqual(log.shift(), matchResolveOne(rp, undefinedVal));
  t.deepEqual(log, []);
}

function validateDropHeld(t, log, rp) {
  t.deepEqual(log.shift(), matchResolveOne(rp, undefinedVal));
  t.deepEqual(log.shift(), matchVatstoreGet('vom.rc.o+1/2'));
  t.deepEqual(log.shift(), matchVatstoreGet('vom.es.o+1/2'));
  t.deepEqual(log, []);
}

function validateDropHeldWithGC(t, log, rp) {
  t.deepEqual(log.shift(), matchResolveOne(rp, undefinedVal));
  t.deepEqual(log.shift(), matchVatstoreGet('vom.rc.o+1/2'));
  t.deepEqual(log.shift(), matchVatstoreGet('vom.es.o+1/2'));
  t.deepEqual(log.shift(), matchVatstoreDelete('vom.o+1/2'));
  t.deepEqual(log.shift(), matchVatstoreDelete('vom.rc.o+1/2'));
  t.deepEqual(log.shift(), matchVatstoreDelete('vom.es.o+1/2'));
  t.deepEqual(log, []);
}

function validateDropHeldWithGCAndRetire(t, log, rp) {
  t.deepEqual(log.shift(), matchResolveOne(rp, undefinedVal));
  t.deepEqual(log.shift(), matchVatstoreGet('vom.rc.o+1/2'));
  t.deepEqual(log.shift(), matchVatstoreGet('vom.es.o+1/2'));
  t.deepEqual(log.shift(), matchVatstoreDelete('vom.o+1/2'));
  t.deepEqual(log.shift(), matchVatstoreDelete('vom.rc.o+1/2'));
  t.deepEqual(log.shift(), matchVatstoreDelete('vom.es.o+1/2'));
  t.deepEqual(log.shift(), matchRetireExports('o+1/2'));
  t.deepEqual(log, []);
}

function validateDropExport(t, log) {
  t.deepEqual(log.shift(), matchVatstoreSet('vom.es.o+1/2', '0'));
  t.deepEqual(log.shift(), matchVatstoreGet('vom.rc.o+1/2'));
  t.deepEqual(log, []);
}

function validateDropExportWithGCAndRetire(t, log) {
  t.deepEqual(log.shift(), matchVatstoreSet('vom.es.o+1/2', '0'));
  t.deepEqual(log.shift(), matchVatstoreGet('vom.rc.o+1/2'));
  t.deepEqual(log.shift(), matchVatstoreGet('vom.rc.o+1/2'));
  t.deepEqual(log.shift(), matchVatstoreGet('vom.es.o+1/2'));
  t.deepEqual(log.shift(), matchVatstoreDelete('vom.o+1/2'));
  t.deepEqual(log.shift(), matchVatstoreDelete('vom.rc.o+1/2'));
  t.deepEqual(log.shift(), matchVatstoreDelete('vom.es.o+1/2'));
  t.deepEqual(log.shift(), matchRetireExports('o+1/2'));
  t.deepEqual(log, []);
}

function validateRetireExport(t, log) {
  t.deepEqual(log.shift(), matchVatstoreDelete('vom.es.o+1/2'));
  t.deepEqual(log, []);
}

// NOTE: these tests must be run serially, since they share a heap and garbage
// collection during one test can interfere with the deterministic behavior of a
// different test.

// test 1: lerv -> Lerv -> lerv (hold and release, basic sanity check of VO GC)
test.serial('VO lifecycle 1', async t => {
  const { log, dispatchMessage } = setupLifecycleTest();

  // lerv -> Lerv  Create VO
  let rp = await dispatchMessage('makeAndHold', capargs([]));
  validateCreate(t, log, rp);

  // Lerv -> lerv  Drop in-memory reference, unreferenced VO gets GC'd
  rp = await dispatchMessage('dropHeld', capargs([]));
  validateDropHeldWithGC(t, log, rp);
});

// test 2: lerv -> Lerv -> LerV -> lerV -> LerV -> LERV -> lERV -> LERV ->
//   lERV -> LERV -> lERV -> leRV -> LeRV -> leRV -> LeRV -> LerV
test.serial('VO lifecycle 2', async t => {
  const {
    log,
    dispatchMessage,
    dispatchDropExports,
    dispatchRetireExports,
  } = setupLifecycleTest();

  // lerv -> Lerv  Create VO
  let rp = await dispatchMessage('makeAndHold', capargs([]));
  validateCreate(t, log, rp);

  // Lerv -> LerV  Store VO reference virtually (permanent for now)
  rp = await dispatchMessage('storeHeld', capargs([]));
  validateStore(t, log, rp);

  // LerV -> lerV  Drop in-memory reference, no GC because virtual reference
  rp = await dispatchMessage('dropHeld', capargs([]));
  validateDropHeld(t, log, rp);

  // lerV -> LerV  Read virtual reference, now there's an in-memory reference again too
  rp = await dispatchMessage('fetchAndHold', capargs([]));
  validateLoad(t, log, rp);

  // LerV -> LERV  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld', capargs([]));
  validateExport(t, log, rp);

  // LERV -> lERV  Drop the in-memory reference again, but it's still exported and virtual referenced
  rp = await dispatchMessage('dropHeld', capargs([]));
  validateDropHeld(t, log, rp);

  // lERV -> LERV  Reread from storage, all three legs again
  rp = await dispatchMessage('fetchAndHold', capargs([]));
  validateLoad(t, log, rp);

  // LERV -> lERV  Drop in-memory reference (stepping stone to other states)
  rp = await dispatchMessage('dropHeld', capargs([]));
  validateDropHeld(t, log, rp);

  // lERV -> LERV  Reintroduce the in-memory reference via message
  rp = await dispatchMessage('importAndHold', thingArg('o+1/2'));
  validateImport(t, log, rp);

  // LERV -> lERV  Drop in-memory reference
  rp = await dispatchMessage('dropHeld', capargs([]));
  validateDropHeld(t, log, rp);

  // lERV -> leRV  Drop the export
  await dispatchDropExports('o+1/2');
  validateDropExport(t, log);

  // leRV -> LeRV  Fetch from storage
  rp = await dispatchMessage('fetchAndHold', capargs([]));
  validateLoad(t, log, rp);

  // LeRV -> leRV  Forget about it *again*
  rp = await dispatchMessage('dropHeld', capargs([]));
  validateDropHeld(t, log, rp);

  // leRV -> LeRV  Fetch from storage *again*
  rp = await dispatchMessage('fetchAndHold', capargs([]));
  validateLoad(t, log, rp);

  // LeRV -> LerV  Retire the export
  await dispatchRetireExports('o+1/2');
  validateRetireExport(t, log);
});

// test 3: lerv -> Lerv -> LerV -> LERV -> LeRV -> leRV -> lerV
test.serial('VO lifecycle 3', async t => {
  const {
    log,
    dispatchMessage,
    dispatchDropExports,
    dispatchRetireExports,
  } = setupLifecycleTest();

  // lerv -> Lerv  Create VO
  let rp = await dispatchMessage('makeAndHold', capargs([]));
  validateCreate(t, log, rp);

  // Lerv -> LerV  Store VO reference virtually (permanent for now)
  rp = await dispatchMessage('storeHeld', capargs([]));
  validateStore(t, log, rp);

  // LerV -> LERV  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld', capargs([]));
  validateExport(t, log, rp);

  // LERV -> LeRV  Drop the export
  await dispatchDropExports('o+1/2');
  validateDropExport(t, log);

  // LeRV -> leRV  Drop in-memory reference
  rp = await dispatchMessage('dropHeld', capargs([]));
  validateDropHeld(t, log, rp);

  // leRV -> lerV  Retire the export
  await dispatchRetireExports('o+1/2');
  validateRetireExport(t, log);
});

// test 4: lerv -> Lerv -> LERv -> LeRv -> lerv
test.serial('VO lifecycle 4', async t => {
  const { log, dispatchMessage, dispatchDropExports } = setupLifecycleTest();

  // lerv -> Lerv  Create VO
  let rp = await dispatchMessage('makeAndHold', capargs([]));
  validateCreate(t, log, rp);

  // Lerv -> LERv  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld', capargs([]));
  validateExport(t, log, rp);

  // LERv -> LeRv  Drop the export
  await dispatchDropExports('o+1/2');
  validateDropExport(t, log);

  // LeRv -> lerv  Drop in-memory reference (gc and retire)
  rp = await dispatchMessage('dropHeld', capargs([]));
  validateDropHeldWithGCAndRetire(t, log, rp);
});

// test 5: lerv -> Lerv -> LERv -> LeRv -> Lerv -> lerv
test.serial('VO lifecycle 5', async t => {
  const {
    log,
    dispatchMessage,
    dispatchDropExports,
    dispatchRetireExports,
  } = setupLifecycleTest();

  // lerv -> Lerv  Create VO
  let rp = await dispatchMessage('makeAndHold', capargs([]));
  validateCreate(t, log, rp);

  // Lerv -> LERv  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld', capargs([]));
  validateExport(t, log, rp);

  // LERv -> LeRv  Drop the export
  await dispatchDropExports('o+1/2');
  validateDropExport(t, log);

  // LeRv -> Lerv  Retire the export
  await dispatchRetireExports('o+1/2');
  validateRetireExport(t, log);

  // Lerv -> lerv  Drop in-memory reference, unreferenced VO gets GC'd
  rp = await dispatchMessage('dropHeld', capargs([]));
  validateDropHeldWithGC(t, log, rp);
});

// test 6: lerv -> Lerv -> LERv -> LeRv -> LeRV
test.serial('VO lifecycle 6', async t => {
  const { log, dispatchMessage, dispatchDropExports } = setupLifecycleTest();

  // lerv -> Lerv  Create VO
  let rp = await dispatchMessage('makeAndHold', capargs([]));
  validateCreate(t, log, rp);

  // Lerv -> LERv  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld', capargs([]));
  validateExport(t, log, rp);

  // LERv -> LeRv  Drop the export
  await dispatchDropExports('o+1/2');
  validateDropExport(t, log);

  // LeRv -> LeRV  Store VO reference virtually (permanent for now)
  rp = await dispatchMessage('storeHeld', capargs([]));
  validateStore(t, log, rp);
});

// test 7: lerv -> Lerv -> LERv -> lERv -> LERv -> lERv -> lerv
test.serial('VO lifecycle 7', async t => {
  const { log, dispatchMessage, dispatchDropExports } = setupLifecycleTest();

  // lerv -> Lerv  Create VO
  let rp = await dispatchMessage('makeAndHold', capargs([]));
  validateCreate(t, log, rp);

  // Lerv -> LERv  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld', capargs([]));
  validateExport(t, log, rp);

  // LERv -> lERv  Drop in-memory reference, no GC because exported
  rp = await dispatchMessage('dropHeld', capargs([]));
  validateDropHeld(t, log, rp);

  // lERv -> LERv  Reintroduce the in-memory reference via message
  rp = await dispatchMessage('importAndHold', thingArg('o+1/2'));
  validateImport(t, log, rp);

  // LERv -> lERv  Drop in-memory reference again, still no GC because exported
  rp = await dispatchMessage('dropHeld', capargs([]));
  validateDropHeld(t, log, rp);

  // lERv -> lerv  Drop the export (gc and retire)
  await dispatchDropExports('o+1/2');
  validateDropExportWithGCAndRetire(t, log);
});

// test 8: lerv -> Lerv -> LERv -> LERV
test.serial('VO lifecycle 8', async t => {
  const { log, dispatchMessage } = setupLifecycleTest();

  // lerv -> Lerv  Create VO
  let rp = await dispatchMessage('makeAndHold', capargs([]));
  validateCreate(t, log, rp);

  // Lerv -> LERv  Export the reference
  rp = await dispatchMessage('exportHeld', capargs([]));
  validateExport(t, log, rp);

  // LERv -> LERV  Store VO reference virtually (permanent for now)
  rp = await dispatchMessage('storeHeld', capargs([]));
  validateStore(t, log, rp);
});

test.serial('verify VO weak key GC', async t => {
  const { log, dispatchMessage, testHooks } = setupLifecycleTest();

  // Create VO and hold onto it weakly
  let rp = await dispatchMessage('makeAndHoldAndHoldWeakly', capargs([]));
  validateCreate(t, log, rp);
  t.is(testHooks.countCollectionsForWeakKey('o+1/2'), 2);
  t.is(testHooks.countWeakKeysForCollection(aWeakMap), 1);
  t.is(testHooks.countWeakKeysForCollection(aWeakSet), 1);

  // Drop in-memory reference, GC should cause weak entries to disappear
  rp = await dispatchMessage('dropHeld', capargs([]));
  validateDropHeldWithGC(t, log, rp);
  t.is(testHooks.countCollectionsForWeakKey('o+1/2'), 0);
  t.is(testHooks.countWeakKeysForCollection(aWeakMap), 0);
  t.is(testHooks.countWeakKeysForCollection(aWeakSet), 0);
});

test.serial('verify presence weak key GC', async t => {
  const {
    log,
    dispatchMessage,
    dispatchRetireImports,
    testHooks,
  } = setupLifecycleTest();

  let rp = await dispatchMessage('importAndHoldAndHoldWeakly', thingArg('o-5'));
  t.deepEqual(log.shift(), matchResolveOne(rp, undefinedVal));
  t.deepEqual(log, []);
  t.is(testHooks.countCollectionsForWeakKey('o-5'), 2);
  t.is(testHooks.countWeakKeysForCollection(aWeakMap), 1);
  t.is(testHooks.countWeakKeysForCollection(aWeakSet), 1);

  rp = await dispatchMessage('dropHeld', capargs([]));
  t.deepEqual(log.shift(), matchResolveOne(rp, undefinedVal));
  t.deepEqual(log.shift(), matchDropImports('o-5'));
  t.deepEqual(log, []);
  t.is(testHooks.countCollectionsForWeakKey('o-5'), 2);
  t.is(testHooks.countWeakKeysForCollection(aWeakMap), 1);
  t.is(testHooks.countWeakKeysForCollection(aWeakSet), 1);

  await dispatchRetireImports('o-5');
  t.deepEqual(log, []);
  t.is(testHooks.countCollectionsForWeakKey('o-5'), 0);
  t.is(testHooks.countWeakKeysForCollection(aWeakMap), 0);
  t.is(testHooks.countWeakKeysForCollection(aWeakSet), 0);
});
