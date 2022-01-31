import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { Far } from '@endo/marshal';
import { buildSyscall, makeDispatch } from '../liveslots-helpers.js';
import {
  capargs,
  makeMessage,
  makeDropExports,
  makeRetireImports,
  makeRetireExports,
  makeBringOutYourDead,
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
// collected.
//
// When the state reaches lerv the VO is no longer recognizable anywhere and
// any weak collection entries that use the VO as a key should be removed.

// There may be more than one local reference, hence L subsumes all states with
// 1 or more, whereas l implies there are 0.  Detection of the transition from L
// to l is handled by a JS finalizer.

// There may be more than one vprop reference, hence V subsumes all states with
// 1 or more, whereas v implies there are 0.  The number of vprop references to
// a virtual object is tracked via explicit reference counting.

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
      init(value = null) {
        state.held = value;
      },
      self: Far('holder', {
        setValue(value) {
          state.held = value;
        },
        getValue() {
          return state.held;
        },
      }),
    };
  }

  const thingMaker = makeKind(makeThingInstance);
  const cacheDisplacer = thingMaker('cacheDisplacer');
  const virtualHolderMaker = makeKind(makeVirtualHolderInstance);
  const virtualHolder = virtualHolderMaker();
  let nextThingNumber = 0;
  let heldThing = null;
  aWeakMap = new WeakMap();
  aWeakSet = new WeakSet();

  const holders = [];

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
    makeAndHoldAndKey() {
      heldThing = makeNextThing();
      aWeakMap.set(heldThing, 'arbitrary');
      aWeakSet.add(heldThing);
      displaceCache();
    },
    makeAndHoldRemotable() {
      heldThing = Far('thing', {});
      displaceCache();
    },
    dropHeld() {
      heldThing = null;
      displaceCache();
    },
    storeHeld() {
      virtualHolder.setValue(heldThing);
      displaceCache();
    },
    dropStored() {
      virtualHolder.setValue(null);
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
    importAndHoldAndKey(thing) {
      heldThing = thing;
      aWeakMap.set(heldThing, 'arbitrary');
      aWeakSet.add(heldThing);
      displaceCache();
    },

    prepareStore3() {
      holders.push(virtualHolderMaker(heldThing));
      holders.push(virtualHolderMaker(heldThing));
      holders.push(virtualHolderMaker(heldThing));
      heldThing = null;
      displaceCache();
    },
    finishClearHolders() {
      for (let i = 0; i < holders.length; i += 1) {
        holders[i].setValue(null);
      }
      displaceCache();
    },
    finishDropHolders() {
      for (let i = 0; i < holders.length; i += 1) {
        holders[i] = null;
      }
      displaceCache();
    },
    prepareStoreLinked() {
      let holder = virtualHolderMaker(heldThing);
      holder = virtualHolderMaker(holder);
      holder = virtualHolderMaker(holder);
      holders.push(holder);
      heldThing = null;
      displaceCache();
    },
    noOp() {
      // used when an extra cycle is needed to pump GC
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
  if (vref) {
    return capargs({ '@qclass': 'slot', iface: 'Alleged: thing', index: 0 }, [
      vref,
    ]);
  } else {
    return capargs(null, []);
  }
}

function holderRef(vref) {
  if (vref) {
    return capargs({ '@qclass': 'slot', iface: 'Alleged: holder', index: 0 }, [
      vref,
    ]);
  } else {
    return capargs(null, []);
  }
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

function heldThingValue(vref) {
  return JSON.stringify({ held: thingRef(vref) });
}

function heldHolderValue(vref) {
  return JSON.stringify({ held: holderRef(vref) });
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

function matchRetireImports(...slots) {
  return { type: 'retireImports', slots };
}

const root = 'o+0';

const testObjValue = thingValue('thing #0');
const cacheObjValue = thingValue('cacheDisplacer');

function setupLifecycleTest(t) {
  const { log, syscall } = buildSyscall();
  const nextRP = makeRPMaker();
  const th = [];
  const dispatch = makeDispatch(syscall, buildRootObject, 'bob', false, 0, th);
  const [testHooks] = th;

  async function dispatchMessage(message, args = capargs([])) {
    const rp = nextRP();
    await dispatch(makeMessage(root, message, args, rp));
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

function validate(v, match) {
  v.t.deepEqual(v.log.shift(), match);
}

function validateDone(v) {
  v.t.deepEqual(v.log, []);
}

function validateReturned(v, rp) {
  validate(v, matchResolveOne(rp, undefinedVal));
}

function validateDelete(v, vobjID) {
  validate(v, matchVatstoreDelete(`vom.${vobjID}`));
  validate(v, matchVatstoreDelete(`vom.rc.${vobjID}`));
  validate(v, matchVatstoreDelete(`vom.es.${vobjID}`));
}

function validateStatusCheck(v, vobjID) {
  validate(v, matchVatstoreGet(`vom.rc.${vobjID}`));
  validate(v, matchVatstoreGet(`vom.es.${vobjID}`));
  validate(v, matchVatstoreGet(`vom.${vobjID}`));
}

function validateCreate(v, rp) {
  validate(v, matchVatstoreSet('vom.o+1/1', cacheObjValue));
  validate(v, matchVatstoreSet('vom.o+2/1', heldThingValue(null)));
  validate(v, matchVatstoreSet('vom.o+1/2', testObjValue));
  validate(v, matchVatstoreGet('vom.o+1/1'));
  validateReturned(v, rp);
  validateDone(v);
}

function validateStore(v, rp) {
  validate(v, matchVatstoreGet('vom.o+2/1'));
  validate(v, matchVatstoreGet('vom.rc.o+1/2'));
  validate(v, matchVatstoreSet('vom.rc.o+1/2', '1'));
  validate(v, matchVatstoreSet('vom.o+2/1', heldThingValue('o+1/2')));
  validate(v, matchVatstoreGet('vom.o+1/1'));
  validateReturned(v, rp);
  validateDone(v);
}

function validateDropStore(v, rp, postCheck) {
  validate(v, matchVatstoreGet('vom.o+2/1'));
  validate(v, matchVatstoreGet('vom.rc.o+1/2'));
  validate(v, matchVatstoreSet('vom.rc.o+1/2', '0'));
  validate(v, matchVatstoreSet('vom.o+2/1', heldThingValue(null)));
  validate(v, matchVatstoreGet('vom.o+1/1'));
  validateReturned(v, rp);
  if (postCheck) {
    validate(v, matchVatstoreGet('vom.rc.o+1/2'));
    validate(v, matchVatstoreGet('vom.es.o+1/2'));
  }
  validateDone(v);
}

function validateDropStoreAndRetire(v, rp) {
  validate(v, matchVatstoreGet('vom.o+2/1'));
  validate(v, matchVatstoreGet('vom.rc.o+1/2'));
  validate(v, matchVatstoreSet('vom.rc.o+1/2', '0'));
  validate(v, matchVatstoreSet('vom.o+2/1', heldThingValue(null)));
  validate(v, matchVatstoreGet('vom.o+1/1'));
  validateReturned(v, rp);
  validateStatusCheck(v, 'o+1/2');
  validateDelete(v, 'o+1/2');
  validateDone(v);
}

function validateDropStoreWithGCAndRetire(v, rp) {
  validate(v, matchVatstoreGet('vom.o+2/1'));
  validate(v, matchVatstoreGet('vom.rc.o+1/2'));
  validate(v, matchVatstoreSet('vom.rc.o+1/2', '0'));
  validate(v, matchVatstoreSet('vom.o+2/1', heldThingValue(null)));
  validate(v, matchVatstoreGet('vom.o+1/1'));
  validateReturned(v, rp);
  validateStatusCheck(v, 'o+1/2');
  validateDelete(v, 'o+1/2');
  validate(v, matchRetireExports('o+1/2'));
  validateDone(v);
}

function validateExport(v, rp) {
  validate(v, matchVatstoreSet('vom.es.o+1/2', '1'));
  validate(v, matchResolveOne(rp, thingRef('o+1/2')));
  validateDone(v);
}

function validateImport(v, rp) {
  validate(v, matchVatstoreGet('vom.o+1/1'));
  validateReturned(v, rp);
  validateDone(v);
}

function validateLoad(v, rp) {
  validate(v, matchVatstoreGet('vom.o+2/1'));
  validate(v, matchVatstoreGet('vom.o+1/1'));
  validateReturned(v, rp);
  validateDone(v);
}

function validateDropHeld(v, rp) {
  validateReturned(v, rp);
  validate(v, matchVatstoreGet('vom.rc.o+1/2'));
  validate(v, matchVatstoreGet('vom.es.o+1/2'));
  validateDone(v);
}

function validateDropHeldWithGC(v, rp) {
  validateReturned(v, rp);
  validateStatusCheck(v, 'o+1/2');
  validateDelete(v, 'o+1/2');
  validateDone(v);
}

function validateDropHeldWithGCAndRetire(v, rp) {
  validateReturned(v, rp);
  validateStatusCheck(v, 'o+1/2');
  validateDelete(v, 'o+1/2');
  validate(v, matchRetireExports('o+1/2'));
  validateDone(v);
}

function validateDropExport(v) {
  validate(v, matchVatstoreSet('vom.es.o+1/2', '0'));
  validate(v, matchVatstoreGet('vom.rc.o+1/2'));
  validateDone(v);
}

function validateDropExportWithGCAndRetire(v) {
  validate(v, matchVatstoreSet('vom.es.o+1/2', '0'));
  validate(v, matchVatstoreGet('vom.rc.o+1/2'));
  validateStatusCheck(v, 'o+1/2');
  validateDelete(v, 'o+1/2');
  validate(v, matchRetireExports('o+1/2'));
  validateDone(v);
}

function validateRetireExport(v) {
  validate(v, matchVatstoreDelete('vom.es.o+1/2'));
  validateDone(v);
}

// NOTE: these tests must be run serially, since they share a heap and garbage
// collection during one test can interfere with the deterministic behavior of a
// different test.

// test 1: lerv -> Lerv -> LerV -> Lerv -> lerv
test.serial('VO lifecycle 1', async t => {
  const { v, dispatchMessage } = setupLifecycleTest(t);

  // lerv -> Lerv  Create VO
  let rp = await dispatchMessage('makeAndHold');
  validateCreate(v, rp);

  // Lerv -> LerV  Store VO reference virtually
  rp = await dispatchMessage('storeHeld');
  validateStore(v, rp);

  // LerV -> Lerv  Overwrite virtual reference
  rp = await dispatchMessage('dropStored');
  validateDropStore(v, rp, false);

  // Lerv -> lerv  Drop in-memory reference, unreferenced VO gets GC'd
  rp = await dispatchMessage('dropHeld');
  validateDropHeldWithGC(v, rp);
});

// test 2: lerv -> Lerv -> LerV -> lerV -> LerV -> LERV -> lERV -> LERV ->
//   lERV -> LERV -> lERV -> leRV -> LeRV -> leRV -> LeRV -> LerV
test.serial('VO lifecycle 2', async t => {
  const {
    v,
    dispatchMessage,
    dispatchDropExports,
    dispatchRetireExports,
  } = setupLifecycleTest(t);

  // lerv -> Lerv  Create VO
  let rp = await dispatchMessage('makeAndHold');
  validateCreate(v, rp);

  // Lerv -> LerV  Store VO reference virtually (permanent for now)
  rp = await dispatchMessage('storeHeld');
  validateStore(v, rp);

  // LerV -> lerV  Drop in-memory reference, no GC because virtual reference
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp);

  // lerV -> LerV  Read virtual reference, now there's an in-memory reference again too
  rp = await dispatchMessage('fetchAndHold');
  validateLoad(v, rp);

  // LerV -> LERV  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld');
  validateExport(v, rp);

  // LERV -> lERV  Drop the in-memory reference again, but it's still exported and virtual referenced
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp);

  // lERV -> LERV  Reread from storage, all three legs again
  rp = await dispatchMessage('fetchAndHold');
  validateLoad(v, rp);

  // LERV -> lERV  Drop in-memory reference (stepping stone to other states)
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp);

  // lERV -> LERV  Reintroduce the in-memory reference via message
  rp = await dispatchMessage('importAndHold', thingArg('o+1/2'));
  validateImport(v, rp);

  // LERV -> lERV  Drop in-memory reference
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp);

  // lERV -> leRV  Drop the export
  await dispatchDropExports('o+1/2');
  validateDropExport(v);

  // leRV -> LeRV  Fetch from storage
  rp = await dispatchMessage('fetchAndHold');
  validateLoad(v, rp);

  // LeRV -> leRV  Forget about it *again*
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp);

  // leRV -> LeRV  Fetch from storage *again*
  rp = await dispatchMessage('fetchAndHold');
  validateLoad(v, rp);

  // LeRV -> LerV  Retire the export
  await dispatchRetireExports('o+1/2');
  validateRetireExport(v);
});

// test 3: lerv -> Lerv -> LerV -> LERV -> LeRV -> leRV -> lerV -> lerv
test.serial('VO lifecycle 3', async t => {
  const {
    v,
    dispatchMessage,
    dispatchDropExports,
    dispatchRetireExports,
  } = setupLifecycleTest(t);

  // lerv -> Lerv  Create VO
  let rp = await dispatchMessage('makeAndHold');
  validateCreate(v, rp);

  // Lerv -> LerV  Store VO reference virtually (permanent for now)
  rp = await dispatchMessage('storeHeld');
  validateStore(v, rp);

  // LerV -> LERV  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld');
  validateExport(v, rp);

  // LERV -> LeRV  Drop the export
  await dispatchDropExports('o+1/2');
  validateDropExport(v);

  // LeRV -> leRV  Drop in-memory reference
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp);

  // leRV -> lerV  Retire the export
  await dispatchRetireExports('o+1/2');
  validateRetireExport(v);

  // lerV -> lerv  Drop stored reference (gc and retire)
  rp = await dispatchMessage('dropStored');
  validateDropStoreAndRetire(v, rp);
});

// test 4: lerv -> Lerv -> LERv -> LeRv -> lerv
test.serial('VO lifecycle 4', async t => {
  const { v, dispatchMessage, dispatchDropExports } = setupLifecycleTest(t);

  // lerv -> Lerv  Create VO
  let rp = await dispatchMessage('makeAndHold');
  validateCreate(v, rp);

  // Lerv -> LERv  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld');
  validateExport(v, rp);

  // LERv -> LeRv  Drop the export
  await dispatchDropExports('o+1/2');
  validateDropExport(v);

  // LeRv -> lerv  Drop in-memory reference (gc and retire)
  rp = await dispatchMessage('dropHeld');
  validateDropHeldWithGCAndRetire(v, rp);
});

// test 5: lerv -> Lerv -> LERv -> LeRv -> Lerv -> lerv
test.serial('VO lifecycle 5', async t => {
  const {
    v,
    dispatchMessage,
    dispatchDropExports,
    dispatchRetireExports,
  } = setupLifecycleTest(t);

  // lerv -> Lerv  Create VO
  let rp = await dispatchMessage('makeAndHold');
  validateCreate(v, rp);

  // Lerv -> LERv  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld');
  validateExport(v, rp);

  // LERv -> LeRv  Drop the export
  await dispatchDropExports('o+1/2');
  validateDropExport(v);

  // LeRv -> Lerv  Retire the export
  await dispatchRetireExports('o+1/2');
  validateRetireExport(v);

  // Lerv -> lerv  Drop in-memory reference, unreferenced VO gets GC'd
  rp = await dispatchMessage('dropHeld');
  validateDropHeldWithGC(v, rp);
});

// test 6: lerv -> Lerv -> LERv -> LeRv -> LeRV -> LeRv -> LeRV -> leRV -> lerv
test.serial('VO lifecycle 6', async t => {
  const { v, dispatchMessage, dispatchDropExports } = setupLifecycleTest(t);

  // lerv -> Lerv  Create VO
  let rp = await dispatchMessage('makeAndHold');
  validateCreate(v, rp);

  // Lerv -> LERv  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld');
  validateExport(v, rp);

  // LERv -> LeRv  Drop the export
  await dispatchDropExports('o+1/2');
  validateDropExport(v);

  // LeRv -> LeRV  Store VO reference virtually
  rp = await dispatchMessage('storeHeld');
  validateStore(v, rp);

  // LeRV -> LeRv  Overwrite virtual reference
  rp = await dispatchMessage('dropStored');
  validateDropStore(v, rp, false);

  // LeRv -> LeRV  Store VO reference virtually again
  rp = await dispatchMessage('storeHeld');
  validateStore(v, rp);

  // LeRV -> leRV  Drop in-memory reference
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp);

  // leRV -> lerv  Drop stored reference (gc and retire)
  rp = await dispatchMessage('dropStored');
  validateDropStoreWithGCAndRetire(v, rp);
});

// test 7: lerv -> Lerv -> LERv -> lERv -> LERv -> lERv -> lerv
test.serial('VO lifecycle 7', async t => {
  const { v, dispatchMessage, dispatchDropExports } = setupLifecycleTest(t);

  // lerv -> Lerv  Create VO
  let rp = await dispatchMessage('makeAndHold');
  validateCreate(v, rp);

  // Lerv -> LERv  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld');
  validateExport(v, rp);

  // LERv -> lERv  Drop in-memory reference, no GC because exported
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp);

  // lERv -> LERv  Reintroduce the in-memory reference via message
  rp = await dispatchMessage('importAndHold', thingArg('o+1/2'));
  validateImport(v, rp);

  // LERv -> lERv  Drop in-memory reference again, still no GC because exported
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp);

  // lERv -> lerv  Drop the export (gc and retire)
  await dispatchDropExports('o+1/2');
  validateDropExportWithGCAndRetire(v);
});

// test 8: lerv -> Lerv -> LERv -> LERV -> LERv -> LERV -> lERV -> lERv -> lerv
test.serial('VO lifecycle 8', async t => {
  const { v, dispatchMessage, dispatchDropExports } = setupLifecycleTest(t);

  // lerv -> Lerv  Create VO
  let rp = await dispatchMessage('makeAndHold');
  validateCreate(v, rp);

  // Lerv -> LERv  Export the reference
  rp = await dispatchMessage('exportHeld');
  validateExport(v, rp);

  // LERv -> LERV  Store VO reference virtually
  rp = await dispatchMessage('storeHeld');
  validateStore(v, rp);

  // LERV -> LERv  Overwrite virtual reference
  rp = await dispatchMessage('dropStored');
  validateDropStore(v, rp, false);

  // LERv -> LERV  Store VO reference virtually
  rp = await dispatchMessage('storeHeld');
  validateStore(v, rp);

  // LERV -> lERV  Drop the in-memory reference
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp);

  // lERV -> lERv  Overwrite virtual reference
  rp = await dispatchMessage('dropStored');
  validateDropStore(v, rp, true);

  // lERv -> lerv  Drop the export (gc and retire)
  await dispatchDropExports('o+1/2');
  validateDropExportWithGCAndRetire(v);
});

function validatePrepareStore3(v, rp) {
  validate(v, matchVatstoreGet('vom.rc.o+1/2'));
  validate(v, matchVatstoreSet('vom.rc.o+1/2', '1'));
  validate(v, matchVatstoreSet('vom.o+2/2', heldThingValue('o+1/2')));
  validate(v, matchVatstoreGet('vom.rc.o+1/2'));
  validate(v, matchVatstoreSet('vom.rc.o+1/2', '2'));
  validate(v, matchVatstoreSet('vom.o+2/3', heldThingValue('o+1/2')));
  validate(v, matchVatstoreGet('vom.rc.o+1/2'));
  validate(v, matchVatstoreSet('vom.rc.o+1/2', '3'));
  validate(v, matchVatstoreSet('vom.o+2/4', heldThingValue('o+1/2')));
  validate(v, matchVatstoreGet('vom.o+1/1'));
  validateReturned(v, rp);
  validate(v, matchVatstoreGet('vom.rc.o+1/2'));
  validate(v, matchVatstoreGet('vom.es.o+1/2'));
  validateDone(v);
}

test.serial('VO refcount management 1', async t => {
  const { v, dispatchMessage } = setupLifecycleTest(t);

  let rp = await dispatchMessage('makeAndHold');
  validateCreate(v, rp);

  rp = await dispatchMessage('prepareStore3');
  validatePrepareStore3(v, rp);

  rp = await dispatchMessage('finishClearHolders');
  validate(v, matchVatstoreGet('vom.o+2/2'));
  validate(v, matchVatstoreGet('vom.rc.o+1/2'));
  validate(v, matchVatstoreSet('vom.rc.o+1/2', '2'));
  validate(v, matchVatstoreSet('vom.o+2/2', heldThingValue(null)));
  validate(v, matchVatstoreGet('vom.o+2/3'));
  validate(v, matchVatstoreGet('vom.rc.o+1/2'));
  validate(v, matchVatstoreSet('vom.rc.o+1/2', '1'));
  validate(v, matchVatstoreSet('vom.o+2/3', heldThingValue(null)));
  validate(v, matchVatstoreGet('vom.o+2/4'));
  validate(v, matchVatstoreGet('vom.rc.o+1/2'));
  validate(v, matchVatstoreSet('vom.rc.o+1/2', '0'));
  validate(v, matchVatstoreSet('vom.o+2/4', heldThingValue(null)));
  validate(v, matchVatstoreGet('vom.o+1/1'));
  validateReturned(v, rp);
  validateStatusCheck(v, 'o+1/2');
  validateDelete(v, 'o+1/2');
  validateDone(v);
});

test.serial('VO refcount management 2', async t => {
  const { v, dispatchMessage } = setupLifecycleTest(t);

  let rp = await dispatchMessage('makeAndHold');
  validateCreate(v, rp);

  rp = await dispatchMessage('prepareStore3');
  validatePrepareStore3(v, rp);

  rp = await dispatchMessage('finishDropHolders');
  validateReturned(v, rp);

  validateStatusCheck(v, 'o+2/2');
  validate(v, matchVatstoreGet('vom.rc.o+1/2'));
  validate(v, matchVatstoreSet('vom.rc.o+1/2', '2'));
  validateDelete(v, 'o+2/2');

  validateStatusCheck(v, 'o+2/3');
  validate(v, matchVatstoreGet('vom.rc.o+1/2'));
  validate(v, matchVatstoreSet('vom.rc.o+1/2', '1'));
  validateDelete(v, 'o+2/3');

  validateStatusCheck(v, 'o+2/4');
  validate(v, matchVatstoreGet('vom.rc.o+1/2'));
  validate(v, matchVatstoreSet('vom.rc.o+1/2', '0'));

  validateDelete(v, 'o+2/4');

  validateStatusCheck(v, 'o+1/2');
  validateDelete(v, 'o+1/2');

  validateDone(v);
});

test.serial('VO refcount management 3', async t => {
  const { v, dispatchMessage } = setupLifecycleTest(t);

  let rp = await dispatchMessage('makeAndHold');
  validateCreate(v, rp);

  rp = await dispatchMessage('prepareStoreLinked');
  validate(v, matchVatstoreGet('vom.rc.o+1/2'));
  validate(v, matchVatstoreSet('vom.rc.o+1/2', '1'));
  validate(v, matchVatstoreSet('vom.o+2/2', heldThingValue('o+1/2')));
  validate(v, matchVatstoreGet('vom.rc.o+2/2'));
  validate(v, matchVatstoreSet('vom.rc.o+2/2', '1'));
  validate(v, matchVatstoreSet('vom.o+2/3', heldHolderValue('o+2/2')));
  validate(v, matchVatstoreGet('vom.rc.o+2/3'));
  validate(v, matchVatstoreSet('vom.rc.o+2/3', '1'));
  validate(v, matchVatstoreSet('vom.o+2/4', heldHolderValue('o+2/3')));
  validate(v, matchVatstoreGet('vom.o+1/1'));
  validateReturned(v, rp);
  validate(v, matchVatstoreGet('vom.rc.o+1/2'));
  validate(v, matchVatstoreGet('vom.es.o+1/2'));
  validate(v, matchVatstoreGet('vom.rc.o+2/2'));
  validate(v, matchVatstoreGet('vom.es.o+2/2'));
  validate(v, matchVatstoreGet('vom.rc.o+2/3'));
  validate(v, matchVatstoreGet('vom.es.o+2/3'));
  validateDone(v);

  rp = await dispatchMessage('finishDropHolders');
  validateReturned(v, rp);
  validateStatusCheck(v, 'o+2/4');
  validate(v, matchVatstoreGet('vom.rc.o+2/3'));
  validate(v, matchVatstoreSet('vom.rc.o+2/3', '0'));

  validateDelete(v, 'o+2/4');

  validateStatusCheck(v, 'o+2/3');
  validate(v, matchVatstoreGet('vom.rc.o+2/2'));
  validate(v, matchVatstoreSet('vom.rc.o+2/2', '0'));
  validateDelete(v, 'o+2/3');

  validateStatusCheck(v, 'o+2/2');
  validate(v, matchVatstoreGet('vom.rc.o+1/2'));
  validate(v, matchVatstoreSet('vom.rc.o+1/2', '0'));
  validateDelete(v, 'o+2/2');

  validateStatusCheck(v, 'o+1/2');
  validateDelete(v, 'o+1/2');

  validateDone(v);
});

test.serial('presence refcount management 1', async t => {
  const { v, dispatchMessage } = setupLifecycleTest(t);

  let rp = await dispatchMessage('importAndHold', thingArg('o-5'));
  validate(v, matchVatstoreSet('vom.o+1/1', cacheObjValue));
  validate(v, matchVatstoreSet('vom.o+2/1', heldThingValue(null)));
  validate(v, matchVatstoreGet('vom.o+1/1'));
  validateReturned(v, rp);
  validateDone(v);

  rp = await dispatchMessage('prepareStore3');
  validate(v, matchVatstoreGet('vom.rc.o-5'));
  validate(v, matchVatstoreSet('vom.rc.o-5', '1'));
  validate(v, matchVatstoreSet('vom.o+2/2', heldThingValue('o-5')));
  validate(v, matchVatstoreGet('vom.rc.o-5'));
  validate(v, matchVatstoreSet('vom.rc.o-5', '2'));
  validate(v, matchVatstoreSet('vom.o+2/3', heldThingValue('o-5')));
  validate(v, matchVatstoreGet('vom.rc.o-5'));
  validate(v, matchVatstoreSet('vom.rc.o-5', '3'));
  validate(v, matchVatstoreSet('vom.o+2/4', heldThingValue('o-5')));
  validate(v, matchVatstoreGet('vom.o+1/1'));
  validateReturned(v, rp);
  validate(v, matchVatstoreGet('vom.rc.o-5'));
  validateDone(v);

  rp = await dispatchMessage('finishClearHolders');
  validate(v, matchVatstoreGet('vom.o+2/2'));
  validate(v, matchVatstoreGet('vom.rc.o-5'));
  validate(v, matchVatstoreSet('vom.rc.o-5', '2'));
  validate(v, matchVatstoreSet('vom.o+2/2', heldThingValue(null)));
  validate(v, matchVatstoreGet('vom.o+2/3'));
  validate(v, matchVatstoreGet('vom.rc.o-5'));
  validate(v, matchVatstoreSet('vom.rc.o-5', '1'));
  validate(v, matchVatstoreSet('vom.o+2/3', heldThingValue(null)));
  validate(v, matchVatstoreGet('vom.o+2/4'));
  validate(v, matchVatstoreGet('vom.rc.o-5'));
  validate(v, matchVatstoreSet('vom.rc.o-5', '0'));
  validate(v, matchVatstoreDelete('vom.rc.o-5'));
  validate(v, matchVatstoreSet('vom.o+2/4', heldThingValue(null)));
  validate(v, matchVatstoreGet('vom.o+1/1'));
  validateReturned(v, rp);
  validate(v, matchVatstoreGet('vom.rc.o-5'));
  validate(v, matchDropImports('o-5'));
  validate(v, matchRetireImports('o-5'));
  validateDone(v);
});

test.serial('presence refcount management 2', async t => {
  const { v, dispatchMessage } = setupLifecycleTest(t);

  let rp = await dispatchMessage('importAndHold', thingArg('o-5'));
  validate(v, matchVatstoreSet('vom.o+1/1', cacheObjValue));
  validate(v, matchVatstoreSet('vom.o+2/1', heldThingValue(null)));
  validate(v, matchVatstoreGet('vom.o+1/1'));
  validateReturned(v, rp);
  validateDone(v);

  rp = await dispatchMessage('prepareStore3');
  validate(v, matchVatstoreGet('vom.rc.o-5'));
  validate(v, matchVatstoreSet('vom.rc.o-5', '1'));
  validate(v, matchVatstoreSet('vom.o+2/2', heldThingValue('o-5')));
  validate(v, matchVatstoreGet('vom.rc.o-5'));
  validate(v, matchVatstoreSet('vom.rc.o-5', '2'));
  validate(v, matchVatstoreSet('vom.o+2/3', heldThingValue('o-5')));
  validate(v, matchVatstoreGet('vom.rc.o-5'));
  validate(v, matchVatstoreSet('vom.rc.o-5', '3'));
  validate(v, matchVatstoreSet('vom.o+2/4', heldThingValue('o-5')));
  validate(v, matchVatstoreGet('vom.o+1/1'));
  validateReturned(v, rp);
  validate(v, matchVatstoreGet('vom.rc.o-5'));
  validateDone(v);

  rp = await dispatchMessage('finishDropHolders');
  validateReturned(v, rp);
  validateStatusCheck(v, 'o+2/2');
  validate(v, matchVatstoreGet('vom.rc.o-5'));
  validate(v, matchVatstoreSet('vom.rc.o-5', '2'));
  validateDelete(v, 'o+2/2');
  validateStatusCheck(v, 'o+2/3');
  validate(v, matchVatstoreGet('vom.rc.o-5'));
  validate(v, matchVatstoreSet('vom.rc.o-5', '1'));
  validateDelete(v, 'o+2/3');
  validateStatusCheck(v, 'o+2/4');
  validate(v, matchVatstoreGet('vom.rc.o-5'));
  validate(v, matchVatstoreSet('vom.rc.o-5', '0'));
  validate(v, matchVatstoreDelete('vom.rc.o-5'));
  validateDelete(v, 'o+2/4');
  validate(v, matchVatstoreGet('vom.rc.o-5'));
  validate(v, matchDropImports('o-5'));
  validate(v, matchRetireImports('o-5'));
  validateDone(v);
});

test.serial('remotable refcount management 1', async t => {
  const { v, dispatchMessage } = setupLifecycleTest(t);

  let rp = await dispatchMessage('makeAndHoldRemotable');
  validate(v, matchVatstoreSet('vom.o+1/1', cacheObjValue));
  validate(v, matchVatstoreSet('vom.o+2/1', heldThingValue(null)));
  validate(v, matchVatstoreGet('vom.o+1/1'));
  validateReturned(v, rp);
  validateDone(v);

  rp = await dispatchMessage('prepareStore3');
  validate(v, matchVatstoreSet('vom.o+2/2', heldThingValue('o+3')));
  validate(v, matchVatstoreSet('vom.o+2/3', heldThingValue('o+3')));
  validate(v, matchVatstoreSet('vom.o+2/4', heldThingValue('o+3')));
  validate(v, matchVatstoreGet('vom.o+1/1'));
  validateReturned(v, rp);
  validateDone(v);

  rp = await dispatchMessage('finishClearHolders');
  validate(v, matchVatstoreGet('vom.o+2/2'));
  validate(v, matchVatstoreSet('vom.o+2/2', heldThingValue(null)));
  validate(v, matchVatstoreGet('vom.o+2/3'));
  validate(v, matchVatstoreSet('vom.o+2/3', heldThingValue(null)));
  validate(v, matchVatstoreGet('vom.o+2/4'));
  validate(v, matchVatstoreSet('vom.o+2/4', heldThingValue(null)));
  validate(v, matchVatstoreGet('vom.o+1/1'));
  validateReturned(v, rp);
  validateDone(v);
});

test.serial('remotable refcount management 2', async t => {
  const { v, dispatchMessage } = setupLifecycleTest(t);

  let rp = await dispatchMessage('makeAndHoldRemotable');
  validate(v, matchVatstoreSet('vom.o+1/1', cacheObjValue));
  validate(v, matchVatstoreSet('vom.o+2/1', heldThingValue(null)));
  validate(v, matchVatstoreGet('vom.o+1/1'));
  validateReturned(v, rp);
  validateDone(v);

  rp = await dispatchMessage('prepareStore3');
  validate(v, matchVatstoreSet('vom.o+2/2', heldThingValue('o+3')));
  validate(v, matchVatstoreSet('vom.o+2/3', heldThingValue('o+3')));
  validate(v, matchVatstoreSet('vom.o+2/4', heldThingValue('o+3')));
  validate(v, matchVatstoreGet('vom.o+1/1'));
  validateReturned(v, rp);
  validateDone(v);

  rp = await dispatchMessage('finishDropHolders');
  validateReturned(v, rp);
  validateStatusCheck(v, 'o+2/2');
  validateDelete(v, 'o+2/2');
  validateStatusCheck(v, 'o+2/3');
  validateDelete(v, 'o+2/3');
  validateStatusCheck(v, 'o+2/4');
  validateDelete(v, 'o+2/4');
  validateDone(v);
});

test.serial('verify VO weak key GC', async t => {
  const { v, dispatchMessage, testHooks } = setupLifecycleTest(t);

  // Create VO and hold onto it weakly
  let rp = await dispatchMessage('makeAndHoldAndKey');
  validateCreate(v, rp);
  t.is(testHooks.countCollectionsForWeakKey('o+1/2'), 2);
  t.is(testHooks.countWeakKeysForCollection(aWeakMap), 1);
  t.is(testHooks.countWeakKeysForCollection(aWeakSet), 1);

  // Drop in-memory reference, GC should cause weak entries to disappear
  rp = await dispatchMessage('dropHeld');
  validateDropHeldWithGC(v, rp);
  t.is(testHooks.countCollectionsForWeakKey('o+1/2'), 0);
  t.is(testHooks.countWeakKeysForCollection(aWeakMap), 0);
  t.is(testHooks.countWeakKeysForCollection(aWeakSet), 0);
});

test.serial('verify presence weak key GC', async t => {
  const {
    v,
    dispatchMessage,
    dispatchRetireImports,
    testHooks,
  } = setupLifecycleTest(t);

  validate(v, matchVatstoreSet('vom.o+1/1', cacheObjValue));
  validateDone(v);

  let rp = await dispatchMessage('importAndHoldAndKey', thingArg('o-5'));
  validate(v, matchVatstoreSet('vom.o+2/1', heldThingValue(null)));
  validate(v, matchVatstoreGet('vom.o+1/1'));
  validateReturned(v, rp);
  validateDone(v);
  t.is(testHooks.countCollectionsForWeakKey('o-5'), 2);
  t.is(testHooks.countWeakKeysForCollection(aWeakMap), 1);
  t.is(testHooks.countWeakKeysForCollection(aWeakSet), 1);

  rp = await dispatchMessage('dropHeld');
  validateReturned(v, rp);
  validate(v, matchVatstoreGet('vom.rc.o-5'));
  validate(v, matchDropImports('o-5'));
  validateDone(v);
  t.is(testHooks.countCollectionsForWeakKey('o-5'), 2);
  t.is(testHooks.countWeakKeysForCollection(aWeakMap), 1);
  t.is(testHooks.countWeakKeysForCollection(aWeakSet), 1);

  await dispatchRetireImports('o-5');
  validateDone(v);
  t.is(testHooks.countCollectionsForWeakKey('o-5'), 0);
  t.is(testHooks.countWeakKeysForCollection(aWeakMap), 0);
  t.is(testHooks.countWeakKeysForCollection(aWeakSet), 0);
});
