// @ts-nocheck
import test from 'ava';

import { Far } from '@endo/marshal';
import { krefOf, kser, kslot } from '@agoric/kmarshal';
import {
  setupTestLiveslots,
  findSyscallsByType,
} from '../liveslots-helpers.js';
import { parseVatSlot } from '../../src/parseVatSlots.js';

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

const unfacetedThingKindID = '10';
const unfacetedThingBaseRef = `o+v${unfacetedThingKindID}`;
const facetedThingKindID = '11';
const facetedThingBaseRef = `o+v${facetedThingKindID}`;
const markerKindID = '13';
const markerBaseRef = `o+v${markerKindID}`;

function thingVref(isf, instance) {
  return `${isf ? facetedThingBaseRef : unfacetedThingBaseRef}/${instance}`;
}

function facetRef(isf, vref, facet) {
  return `${vref}${isf && facet ? `:${facet}` : ''}`;
}

function buildRootObject(vatPowers) {
  const { VatData, WeakMap, WeakSet } = vatPowers;

  const { defineKind, defineKindMulti } = VatData;

  const makeThing = defineKind('thing', label => ({ label }), {
    getLabel: ({ state }) => state.label,
  });
  const makeFacetedThing = defineKindMulti('thing', label => ({ label }), {
    facetA: {
      getLabelA: ({ state }) => state.label,
    },
    facetB: {
      getLabelB: ({ state }) => state.label,
    },
  });
  const cacheDisplacerObj = makeThing('cacheDisplacer');
  // This immediately goes out of scope and gets GC'd and deleted, but its
  // creation consumes the same subID in its kind as the `cacheDisplacer` that
  // we actually use consumes when *it* is created. This ensures that the
  // creation of both things and faceted things during tests result in the same
  // sequence of subIDs rather than being out of phase by 1
  // eslint-disable-next-line no-unused-vars
  const unusedFacetedCacheDisplacer = makeFacetedThing('cacheDisplacer');

  const makeVirtualHolder = defineKind('holder', (held = null) => ({ held }), {
    setValue: ({ state }, value) => {
      state.held = value;
    },
    getValue: ({ state }) => state.held,
  });
  const virtualHolderObj = makeVirtualHolder();

  const makeDualMarkerThing = defineKindMulti(
    'marker',
    () => ({ unused: 'uncared for' }),
    {
      facetA: {
        methodA: () => 0,
      },
      facetB: {
        methodB: () => 0,
      },
    },
  );

  let nextThingNumber = 0;
  let heldThing = null;
  aWeakMap = new WeakMap();
  aWeakSet = new WeakSet();

  const holders = [];

  function displaceCache() {
    return cacheDisplacerObj.getLabel();
  }

  function makeNextThing(isf) {
    const label = `thing #${nextThingNumber}`;
    nextThingNumber += 1;
    if (isf) {
      const { facetB } = makeFacetedThing(label);
      return facetB;
    } else {
      return makeThing(label);
    }
  }

  return Far('root', {
    makeAndHold(isf) {
      heldThing = makeNextThing(isf);
      displaceCache();
    },
    makeAndHoldFacets() {
      heldThing = makeFacetedThing('thing #0');
      displaceCache();
    },
    makeAndHoldDualMarkers() {
      heldThing = makeDualMarkerThing().facetA;
      displaceCache();
    },
    makeAndHoldAndKey(isf) {
      heldThing = makeNextThing(isf);
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
      virtualHolderObj.setValue(heldThing);
      displaceCache();
    },
    dropStored() {
      virtualHolderObj.setValue(null);
      displaceCache();
    },
    fetchAndHold() {
      heldThing = virtualHolderObj.getValue();
      displaceCache();
    },
    exportHeld() {
      return heldThing;
    },
    exportHeldA() {
      return heldThing.facetA;
    },
    exportHeldB() {
      return heldThing.facetB;
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
      holders.push(makeVirtualHolder(heldThing));
      holders.push(makeVirtualHolder(heldThing));
      holders.push(makeVirtualHolder(heldThing));
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
      let holder = makeVirtualHolder(heldThing);
      holder = makeVirtualHolder(holder);
      holder = makeVirtualHolder(holder);
      holders.push(holder);
      heldThing = null;
      displaceCache();
    },
    noOp() {
      // used when an extra cycle is needed to pump GC
    },
  });
}

function thingValue(label) {
  return JSON.stringify({ label: kser(label) });
}

function heldHolderValue(vo) {
  return JSON.stringify({ held: kser(vo) });
}

const testObjValue = thingValue('thing #0');

const exportMap = {
  reachable: 'r',
  recognizable: 's',
  neither: 'n',
};

function assertState(v, vref, reachable, erv) {
  assert(erv[0] === 'E' || erv[0] === 'e');
  assert(erv[1] === 'R' || erv[1] === 'r');
  assert(erv[2] === 'V' || erv[2] === 'v');
  let exported = 'neither';
  if (erv[1] === 'R') {
    exported = erv[0] === 'E' ? 'reachable' : 'recognizable';
  }
  const vdata = erv[2] === 'V';
  const { t, fakestore } = v;
  const { baseRef, facet } = parseVatSlot(vref);

  if (reachable) {
    // should have data
    t.truthy(fakestore.get(`vom.${baseRef}`));
    t.regex(fakestore.get(`vom.${baseRef}`), /thing #0/);
    if (vdata) {
      t.is(fakestore.get(`vom.rc.${baseRef}`), `1`);
    } else {
      t.is(fakestore.get(`vom.rc.${baseRef}`), undefined);
    }

    const expectedFacetExportStatus = exportMap[exported];
    let expectedExportStatus;
    if (exported !== 'neither') {
      if (facet !== undefined) {
        // target has multiple facets, our test only ever asks about
        // the second one, so expect 'nr' or 'ns' or undefined
        expectedExportStatus = `n${expectedFacetExportStatus}`;
      } else {
        expectedExportStatus = expectedFacetExportStatus;
      }
    }
    const exportStatus = fakestore.get(`vom.es.${baseRef}`);
    t.is(exportStatus, expectedExportStatus);
  } else {
    t.is(fakestore.get(`vom.${baseRef}`), undefined);
    t.is(fakestore.get(`vom.rc.${baseRef}`), undefined);
    t.is(fakestore.get(`vom.es.${baseRef}`), undefined);
  }
}

function assertState2(v, vref, reachable, ererv) {
  // ER (for facetA) ER (for facetB) V (for the baseref)
  assert(ererv[0] === 'E' || ererv[0] === 'e');
  assert(ererv[1] === 'R' || ererv[1] === 'r');
  assert(ererv[2] === 'E' || ererv[2] === 'e');
  assert(ererv[3] === 'R' || ererv[3] === 'r');
  assert(ererv[4] === 'V' || ererv[4] === 'v');
  let exportedA = 'neither';
  if (ererv[1] === 'R') {
    exportedA = ererv[0] === 'E' ? 'reachable' : 'recognizable';
  }
  let exportedB = 'neither';
  if (ererv[3] === 'R') {
    exportedB = ererv[2] === 'E' ? 'reachable' : 'recognizable';
  }
  const vdata = ererv[4] === 'V';
  const { t, fakestore } = v;
  const { baseRef } = parseVatSlot(vref);

  if (reachable) {
    // should have data
    t.truthy(fakestore.get(`vom.${baseRef}`));
    t.regex(fakestore.get(`vom.${baseRef}`), /thing #0/);
    if (vdata) {
      t.is(fakestore.get(`vom.rc.${baseRef}`), `1`);
    } else {
      t.is(fakestore.get(`vom.rc.${baseRef}`), undefined);
    }

    let expectedExportStatus = `${exportMap[exportedA]}${exportMap[exportedB]}`;
    if (expectedExportStatus === 'nn') {
      expectedExportStatus = undefined;
    }
    const exportStatus = fakestore.get(`vom.es.${baseRef}`);
    t.is(exportStatus, expectedExportStatus);
  } else {
    t.is(fakestore.get(`vom.${baseRef}`), undefined);
    t.is(fakestore.get(`vom.rc.${baseRef}`), undefined);
    t.is(fakestore.get(`vom.es.${baseRef}`), undefined);
  }
}

// NOTE: these tests must be run serially, since they share a heap and garbage
// collection during one test can interfere with the deterministic behavior of a
// different test.

// test 1: lerv -> Lerv -> LerV -> Lerv -> lerv
async function voLifeCycleTest1(t, isf) {
  const { v, dispatchMessageSuccessfully } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    { forceGC: true },
  );
  const vref = facetRef(isf, thingVref(isf, 2), '1');

  // lerv -> Lerv  Create VO
  await dispatchMessageSuccessfully('makeAndHold', isf);
  assertState(v, vref, true, 'erv');

  // Lerv -> LerV  Store VO reference virtually
  await dispatchMessageSuccessfully('storeHeld');
  assertState(v, vref, true, 'erV');

  // LerV -> Lerv  Overwrite virtual reference
  await dispatchMessageSuccessfully('dropStored');
  assertState(v, vref, true, 'erv');

  // Lerv -> lerv  Drop in-memory reference, unreferenced VO gets GC'd
  await dispatchMessageSuccessfully('dropHeld');
  assertState(v, vref, false, 'erv');
}
test.serial('VO lifecycle 1 unfaceted', async t => {
  await voLifeCycleTest1(t, false);
});
test.serial('VO lifecycle 1 faceted', async t => {
  await voLifeCycleTest1(t, true);
});

// test 2: lerv -> Lerv -> LerV -> lerV -> LerV -> LERV -> lERV -> LERV ->
//   lERV -> LERV -> lERV -> leRV -> LeRV -> leRV -> LeRV -> LerV
async function voLifeCycleTest2(t, isf) {
  const {
    v,
    dispatchMessageSuccessfully,
    dispatchDropExports,
    dispatchRetireExports,
  } = await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const vref = facetRef(isf, thingVref(isf, 2), '1');
  const thing = kslot(vref, isf ? 'thing facetB' : 'thing');

  // lerv -> Lerv  Create VO
  await dispatchMessageSuccessfully('makeAndHold', isf);
  assertState(v, vref, true, 'erv');

  // Lerv -> LerV  Store VO reference virtually (permanent for now)
  await dispatchMessageSuccessfully('storeHeld');
  assertState(v, vref, true, 'erV');

  // LerV -> lerV  Drop in-memory reference, no GC because virtual reference
  await dispatchMessageSuccessfully('dropHeld');
  assertState(v, vref, true, 'erV');

  // lerV -> LerV  Read virtual reference, now there's an in-memory reference again too
  await dispatchMessageSuccessfully('fetchAndHold');
  assertState(v, vref, true, 'erV');

  // LerV -> LERV  Export the reference, now all three legs hold it
  await dispatchMessageSuccessfully('exportHeld');
  assertState(v, vref, true, 'ERV');

  // LERV -> lERV  Drop the in-memory reference again, but it's still exported and virtual referenced
  await dispatchMessageSuccessfully('dropHeld');
  assertState(v, vref, true, 'ERV');

  // lERV -> LERV  Reread from storage, all three legs again
  await dispatchMessageSuccessfully('fetchAndHold');
  assertState(v, vref, true, 'ERV');

  // LERV -> lERV  Drop in-memory reference (stepping stone to other states)
  await dispatchMessageSuccessfully('dropHeld');
  assertState(v, vref, true, 'ERV');

  // lERV -> LERV  Reintroduce the in-memory reference via message
  await dispatchMessageSuccessfully('importAndHold', thing);
  assertState(v, vref, true, 'ERV');

  // LERV -> lERV  Drop in-memory reference
  await dispatchMessageSuccessfully('dropHeld');
  assertState(v, vref, true, 'ERV');

  // lERV -> leRV  Drop the export
  await dispatchDropExports(krefOf(thing));
  assertState(v, vref, true, 'eRV');

  // leRV -> LeRV  Fetch from storage
  await dispatchMessageSuccessfully('fetchAndHold');
  assertState(v, vref, true, 'eRV');

  // LeRV -> leRV  Forget about it *again*
  await dispatchMessageSuccessfully('dropHeld');
  assertState(v, vref, true, 'eRV');

  // leRV -> LeRV  Fetch from storage *again*
  await dispatchMessageSuccessfully('fetchAndHold');
  assertState(v, vref, true, 'eRV');

  // LeRV -> LerV  Retire the export
  await dispatchRetireExports(krefOf(thing));
  assertState(v, vref, true, 'erV');
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), []);
}

test.serial('VO lifecycle 2 unfaceted', async t => {
  await voLifeCycleTest2(t, false);
});
test.serial('VO lifecycle 2 faceted', async t => {
  await voLifeCycleTest2(t, true);
});

// test 3: lerv -> Lerv -> LerV -> LERV -> LeRV -> leRV -> lerV -> lerv
async function voLifeCycleTest3(t, isf) {
  const {
    v,
    dispatchMessageSuccessfully,
    dispatchDropExports,
    dispatchRetireExports,
  } = await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const vref = facetRef(isf, thingVref(isf, 2), '1');
  const thing = kslot(vref, isf ? 'thing facetB' : 'thing');

  // lerv -> Lerv  Create VO
  await dispatchMessageSuccessfully('makeAndHold', isf);
  assertState(v, vref, true, 'erv');

  // Lerv -> LerV  Store VO reference virtually (permanent for now)
  await dispatchMessageSuccessfully('storeHeld');
  assertState(v, vref, true, 'erV');

  // LerV -> LERV  Export the reference, now all three legs hold it
  await dispatchMessageSuccessfully('exportHeld');
  assertState(v, vref, true, 'ERV');

  // LERV -> LeRV  Drop the export
  await dispatchDropExports(krefOf(thing));
  assertState(v, vref, true, 'eRV');

  // LeRV -> leRV  Drop in-memory reference
  await dispatchMessageSuccessfully('dropHeld');
  assertState(v, vref, true, 'eRV');

  // leRV -> lerV  Retire the export
  await dispatchRetireExports(krefOf(thing));
  assertState(v, vref, true, 'erV');

  // lerV -> lerv  Drop stored reference (gc and retire)
  await dispatchMessageSuccessfully('dropStored');
  assertState(v, vref, false, 'erv');
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), []);
}
test.serial('VO lifecycle 3 unfaceted', async t => {
  await voLifeCycleTest3(t, false);
});
test.serial('VO lifecycle 3 faceted', async t => {
  await voLifeCycleTest3(t, true);
});

// test 4: lerv -> Lerv -> LERv -> LeRv -> lerv
async function voLifeCycleTest4(t, isf) {
  const { v, dispatchMessageSuccessfully, dispatchDropExports } =
    await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const vref = facetRef(isf, thingVref(isf, 2), '1');
  const thing = kslot(vref, isf ? 'thing facetB' : 'thing');

  // lerv -> Lerv  Create VO
  await dispatchMessageSuccessfully('makeAndHold', isf);
  assertState(v, vref, true, 'erv');

  // Lerv -> LERv  Export the reference, now two legs hold it
  await dispatchMessageSuccessfully('exportHeld');
  assertState(v, vref, true, 'ERv');

  // LERv -> LeRv  Drop the export
  await dispatchDropExports(krefOf(thing));
  assertState(v, vref, true, 'eRv');

  // LeRv -> lerv  Drop in-memory reference (gc and retire)
  await dispatchMessageSuccessfully('dropHeld');
  assertState(v, vref, false, 'erv');
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  const expected = { type: 'retireExports', slots: [vref] };
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), [expected]);
}
test.serial('VO lifecycle 4 unfaceted', async t => {
  await voLifeCycleTest4(t, false);
});
test.serial('VO lifecycle 4 faceted', async t => {
  await voLifeCycleTest4(t, true);
});

// test 5: lerv -> Lerv -> LERv -> LeRv -> Lerv -> lerv
async function voLifeCycleTest5(t, isf) {
  const {
    v,
    dispatchMessageSuccessfully,
    dispatchDropExports,
    dispatchRetireExports,
  } = await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const vref = facetRef(isf, thingVref(isf, 2), '1');
  const thing = kslot(vref, isf ? 'thing facetB' : 'thing');

  // lerv -> Lerv  Create VO
  await dispatchMessageSuccessfully('makeAndHold', isf);
  assertState(v, vref, true, 'erv');

  // Lerv -> LERv  Export the reference, now all three legs hold it
  await dispatchMessageSuccessfully('exportHeld');
  assertState(v, vref, true, 'ERv');

  // LERv -> LeRv  Drop the export
  await dispatchDropExports(krefOf(thing));
  assertState(v, vref, true, 'eRv');

  // LeRv -> Lerv  Retire the export
  await dispatchRetireExports(krefOf(thing));
  assertState(v, vref, true, 'erv');

  // Lerv -> lerv  Drop in-memory reference, unreferenced VO gets GC'd
  await dispatchMessageSuccessfully('dropHeld');
  assertState(v, vref, false, 'erv');
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), []);
}
test.serial('VO lifecycle 5 unfaceted', async t => {
  await voLifeCycleTest5(t, false);
});
test.serial('VO lifecycle 5 faceted', async t => {
  await voLifeCycleTest5(t, true);
});

// test 6: lerv -> Lerv -> LERv -> LeRv -> LeRV -> LeRv -> LeRV -> leRV -> lerv
async function voLifeCycleTest6(t, isf) {
  const { v, dispatchMessageSuccessfully, dispatchDropExports } =
    await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const vref = facetRef(isf, thingVref(isf, 2), '1');
  const thing = kslot(vref, isf ? 'thing facetB' : 'thing');

  // lerv -> Lerv  Create VO
  await dispatchMessageSuccessfully('makeAndHold', isf);
  assertState(v, vref, true, 'erv');

  // Lerv -> LERv  Export the reference, now all three legs hold it
  await dispatchMessageSuccessfully('exportHeld');
  assertState(v, vref, true, 'ERv');

  // LERv -> LeRv  Drop the export
  await dispatchDropExports(krefOf(thing));
  assertState(v, vref, true, 'eRv');

  // LeRv -> LeRV  Store VO reference virtually
  await dispatchMessageSuccessfully('storeHeld');
  assertState(v, vref, true, 'eRV');

  // LeRV -> LeRv  Overwrite virtual reference
  await dispatchMessageSuccessfully('dropStored');
  assertState(v, vref, true, 'eRv');

  // LeRv -> LeRV  Store VO reference virtually again
  await dispatchMessageSuccessfully('storeHeld');
  assertState(v, vref, true, 'eRV');

  // LeRV -> leRV  Drop in-memory reference
  await dispatchMessageSuccessfully('dropHeld');
  assertState(v, vref, true, 'eRV');

  // leRV -> lerv  Drop stored reference (gc and retire)
  await dispatchMessageSuccessfully('dropStored');
  assertState(v, vref, false, 'erv');
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  const expected = { type: 'retireExports', slots: [vref] };
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), [expected]);
}
test.serial('VO lifecycle 6 unfaceted', async t => {
  await voLifeCycleTest6(t, false);
});
test.serial('VO lifecycle 6 faceted', async t => {
  await voLifeCycleTest6(t, true);
});

// test 7: lerv -> Lerv -> LERv -> lERv -> LERv -> lERv -> lerv
async function voLifeCycleTest7(t, isf) {
  const { v, dispatchMessageSuccessfully, dispatchDropExports } =
    await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const vref = facetRef(isf, thingVref(isf, 2), '1');
  const thing = kslot(vref, isf ? 'thing facetB' : 'thing');

  // lerv -> Lerv  Create VO
  await dispatchMessageSuccessfully('makeAndHold', isf);
  assertState(v, vref, true, 'erv');

  // Lerv -> LERv  Export the reference, now two legs hold it
  await dispatchMessageSuccessfully('exportHeld');
  assertState(v, vref, true, 'ERv');

  // LERv -> lERv  Drop in-memory reference, no GC because exported
  await dispatchMessageSuccessfully('dropHeld');
  assertState(v, vref, true, 'ERv');

  // lERv -> LERv  Reintroduce the in-memory reference via message
  await dispatchMessageSuccessfully('importAndHold', thing);
  assertState(v, vref, true, 'ERv');

  // LERv -> lERv  Drop in-memory reference again, still no GC because exported
  await dispatchMessageSuccessfully('dropHeld');
  assertState(v, vref, true, 'ERv');

  // lERv -> leRv -> lerv  Drop the export (gc and retire)
  await dispatchDropExports(krefOf(thing));
  assertState(v, vref, false, 'erv');
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  const expected = { type: 'retireExports', slots: [vref] };
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), [expected]);
}
test.serial('VO lifecycle 7 unfaceted', async t => {
  await voLifeCycleTest7(t, false);
});
test.serial('VO lifecycle 7 faceted', async t => {
  await voLifeCycleTest7(t, true);
});

// test 8: lerv -> Lerv -> LERv -> LERV -> LERv -> LERV -> lERV -> lERv -> lerv
async function voLifeCycleTest8(t, isf) {
  const { v, dispatchMessageSuccessfully, dispatchDropExports } =
    await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const vref = facetRef(isf, thingVref(isf, 2), '1');
  const thing = kslot(vref, isf ? 'thing facetB' : 'thing');

  // lerv -> Lerv  Create VO
  await dispatchMessageSuccessfully('makeAndHold', isf);
  assertState(v, vref, true, 'erv');

  // Lerv -> LERv  Export the reference
  await dispatchMessageSuccessfully('exportHeld');
  assertState(v, vref, true, 'ERv');

  // LERv -> LERV  Store VO reference virtually
  await dispatchMessageSuccessfully('storeHeld');
  assertState(v, vref, true, 'ERV');

  // LERV -> LERv  Overwrite virtual reference
  await dispatchMessageSuccessfully('dropStored');
  assertState(v, vref, true, 'ERv');

  // LERv -> LERV  Store VO reference virtually
  await dispatchMessageSuccessfully('storeHeld');
  assertState(v, vref, true, 'ERV');

  // LERV -> lERV  Drop the in-memory reference
  await dispatchMessageSuccessfully('dropHeld');
  assertState(v, vref, true, 'ERV');

  // lERV -> lERv  Overwrite virtual reference
  await dispatchMessageSuccessfully('dropStored');
  assertState(v, vref, true, 'ERv');

  // lERv -> leRv -> lerv  Drop the export (gc and retire)
  await dispatchDropExports(krefOf(thing));
  assertState(v, vref, false, 'erv');
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  const expected = { type: 'retireExports', slots: [vref] };
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), [expected]);
}
test.serial('VO lifecycle 8 unfaceted', async t => {
  await voLifeCycleTest8(t, false);
});
test.serial('VO lifecycle 8 faceted', async t => {
  await voLifeCycleTest8(t, true);
});

// multifacet export test 1: no export
test.serial('VO multifacet export 1', async t => {
  const { v, dispatchMessageSuccessfully } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    { forceGC: true },
  );
  const vref = facetRef(true, thingVref(true, 2), '1');

  // lerv -> Lerv  Create facets
  await dispatchMessageSuccessfully('makeAndHoldFacets');
  assertState2(v, vref, true, 'ererv');

  // Lerv -> lerv  Drop in-memory reference to both facets, unreferenced VO gets GC'd
  await dispatchMessageSuccessfully('dropHeld');
  assertState2(v, vref, false, 'ererv');
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), []);
});

// multifacet export test 2a: export A, drop A, retire A
test.serial('VO multifacet export 2a', async t => {
  const { v, dispatchMessageSuccessfully, dispatchDropExports } =
    await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const vref = facetRef(true, thingVref(true, 2), '0');
  const thingA = kslot(vref, 'thing facetA');

  // lerv -> Lerv  Create facets
  await dispatchMessageSuccessfully('makeAndHoldFacets');
  assertState2(v, vref, true, 'ererv');

  // Lerv -> LE(A)R(A)v  Export facet A
  await dispatchMessageSuccessfully('exportHeldA');
  // facetA is exported, facetB is not
  assertState2(v, vref, true, 'ERerv');

  // LE(A)R(A)v -> LeR(A)v  Drop the export of A
  await dispatchDropExports(krefOf(thingA));
  assertState2(v, vref, true, 'eRerv');

  // LeR(A)v -> leR(A)v  Drop in-memory reference to both facets (gc and retire)
  await dispatchMessageSuccessfully('dropHeld');
  assertState2(v, vref, false, 'ererv');
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  const expected = { type: 'retireExports', slots: [vref] };
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), [expected]);
});

// multifacet export test 2b: export B, drop B, retire B
test.serial('VO multifacet export 2b', async t => {
  const { v, dispatchMessageSuccessfully, dispatchDropExports } =
    await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const vref = facetRef(true, thingVref(true, 2), '1');
  const thingB = kslot(vref, 'thing facetB');

  // lerv -> Lerv  Create facets
  await dispatchMessageSuccessfully('makeAndHoldFacets');
  assertState2(v, vref, true, 'ererv');

  // Lerv -> LE(B)R(B)v  Export facet B
  await dispatchMessageSuccessfully('exportHeldB');
  assertState2(v, vref, true, 'erERv');

  // LE(B)R(B)v -> LeR(B)v  Drop the export of B
  await dispatchDropExports(krefOf(thingB));
  assertState2(v, vref, true, 'ereRv');

  // LeR(B)v -> leR(B)v -> lerv  Drop in-memory reference to both facets (gc and retire)
  await dispatchMessageSuccessfully('dropHeld');
  assertState2(v, vref, false, 'ererv');
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  const expected = { type: 'retireExports', slots: [vref] };
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), [expected]);
});

// multifacet export test 3abba: export A, export B, drop B, drop A, retire
test.serial('VO multifacet export 3abba', async t => {
  const { v, dispatchMessageSuccessfully, dispatchDropExports } =
    await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const vrefA = facetRef(true, thingVref(true, 2), '0');
  const thingA = kslot(vrefA, 'thing facetA');
  const vrefB = facetRef(true, thingVref(true, 2), '1');
  const thingB = kslot(vrefB, 'thing facetB');
  const { baseRef } = parseVatSlot(vrefA);

  // lerv -> Lerv  Create facets
  await dispatchMessageSuccessfully('makeAndHoldFacets');
  assertState2(v, baseRef, true, 'ererv');

  // Lerv -> LE(A)R(A)v  Export facet A
  await dispatchMessageSuccessfully('exportHeldA');
  assertState2(v, baseRef, true, 'ERerv');

  // LE(A)R(A)v -> LE(AB)R(AB)v  Export facet B
  await dispatchMessageSuccessfully('exportHeldB');
  assertState2(v, baseRef, true, 'ERERv');

  // LE(AB)R(AB)v -> LE(A)R(AB)v  Drop the export of B
  await dispatchDropExports(krefOf(thingB));
  assertState2(v, baseRef, true, 'EReRv');

  // LE(A)R(AB)v -> LeR(AB)v  Drop the export of A
  await dispatchDropExports(krefOf(thingA));
  assertState2(v, baseRef, true, 'eReRv');

  // LeR(AB)v -> leR(AB)v -> lerv  Drop in-memory reference to both facets (gc and retire)
  await dispatchMessageSuccessfully('dropHeld');
  assertState2(v, baseRef, false, 'ererv');
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  const expected = { type: 'retireExports', slots: [vrefA, vrefB] };
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), [expected]);
});

// multifacet export test 3abab: export A, export B, drop A, drop B, retire
test.serial('VO multifacet export 3abab', async t => {
  const { v, dispatchMessageSuccessfully, dispatchDropExports } =
    await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const vrefA = facetRef(true, thingVref(true, 2), '0');
  const thingA = kslot(vrefA, 'thing facetA');
  const vrefB = facetRef(true, thingVref(true, 2), '1');
  const thingB = kslot(vrefB, 'thing facetB');
  const { baseRef } = parseVatSlot(vrefA);

  // lerv -> Lerv  Create facets
  await dispatchMessageSuccessfully('makeAndHoldFacets');
  assertState2(v, baseRef, true, 'ererv');

  // Lerv -> LE(A)R(A)v  Export facet A
  await dispatchMessageSuccessfully('exportHeldA');
  assertState2(v, baseRef, true, 'ERerv');

  // LE(A)R(A)v -> LE(AB)R(AB)v  Export facet B
  await dispatchMessageSuccessfully('exportHeldB');
  assertState2(v, baseRef, true, 'ERERv');

  // LE(AB)R(AB)v -> LE(B)R(AB)v  Drop the export of A
  await dispatchDropExports(krefOf(thingA));
  assertState2(v, baseRef, true, 'eRERv');

  // LE(B)R(AB)v -> LeR(AB)v  Drop the export of B
  await dispatchDropExports(krefOf(thingB));
  assertState2(v, baseRef, true, 'eReRv');

  // LeR(AB)v -> leR(AB) -> lerv  Drop in-memory reference to both facets (gc and retire)
  await dispatchMessageSuccessfully('dropHeld');
  assertState2(v, baseRef, false, 'ererv');
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  const expected = { type: 'retireExports', slots: [vrefA, vrefB] };
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), [expected]);
});

test.serial('VO multifacet markers only', async t => {
  const { v, dispatchMessageSuccessfully } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    { forceGC: true },
  );
  const vrefA = facetRef(true, `${markerBaseRef}/1`, '0');
  const { baseRef } = parseVatSlot(vrefA);
  const thingData = JSON.stringify({ unused: kser('uncared for') });

  // lerv -> Lerv  Create facets
  await dispatchMessageSuccessfully('makeAndHoldDualMarkers');
  // this holds facetA in RAM, but nothing holds facetB
  t.is(v.fakestore.get(`vom.${baseRef}`), thingData);

  // Lerv -> lerv  Drop in-memory reference, unreferenced VO gets GC'd
  await dispatchMessageSuccessfully('dropHeld');
  t.is(v.fakestore.get(`vom.${baseRef}`), undefined);
});

// prettier-ignore
async function voRefcountManagementTest1(t, isf) {
  const { v, dispatchMessageSuccessfully } = await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const vref = facetRef(isf, thingVref(isf, 2), '1');
  const { baseRef } = parseVatSlot(vref);
  const thing = kslot(vref, isf ? 'thing facetB' : 'thing');
  const { fakestore } = v;

  await dispatchMessageSuccessfully('makeAndHold', isf);
  assertState(v, vref, true, 'erv');

  // holder Kind is the next-to-last created kind, which gets idCounters.exportID-2
  const holderKindID = JSON.parse(fakestore.get(`idCounters`)).exportID - 2;
  t.is(JSON.parse(fakestore.get(`vom.vkind.${holderKindID}.descriptor`)).tag, 'holder');

  await dispatchMessageSuccessfully('prepareStore3');
  // create three VOs (tag "holder") which hold our vref in their vdata
  const holderVrefs = [2,3,4].map(instanceID => `o+v${holderKindID}/${instanceID}`);
  const holderdata = JSON.stringify({ held: kser(thing) }); // state of holders
  for (const holderVref of holderVrefs) {
    t.is(fakestore.get(`vom.${holderVref}`), holderdata);
  }
  t.is(fakestore.get(`vom.rc.${baseRef}`), '3');

  await dispatchMessageSuccessfully('finishClearHolders');
  // holder state is overwritten with 'null'
  const nulldata = JSON.stringify({ held: kser(null) }); // state of holders
  for (const holderVref of holderVrefs) {
    t.is(fakestore.get(`vom.${holderVref}`), nulldata);
  }
  // target object is dropped
  t.is(fakestore.get(`vom.rc.${baseRef}`), undefined);
  assertState(v, vref, false, 'erv');
}
test.serial('VO refcount management 1 unfaceted', async t => {
  await voRefcountManagementTest1(t, false);
});
test.serial('VO refcount management 1 faceted', async t => {
  await voRefcountManagementTest1(t, true);
});

// prettier-ignore
async function voRefcountManagementTest2(t, isf) {
  const { v, dispatchMessageSuccessfully } = await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const vref = facetRef(isf, thingVref(isf, 2), '1');
  const { baseRef } = parseVatSlot(vref);
  const thing = kslot(vref, isf ? 'thing facetB' : 'thing');
  const { fakestore } = v;

  await dispatchMessageSuccessfully('makeAndHold', isf);
  assertState(v, vref, true, 'erv');

  // holder Kind is the next-to-last created kind
  const holderKindID = JSON.parse(fakestore.get(`idCounters`)).exportID - 2;
  t.is(JSON.parse(fakestore.get(`vom.vkind.${holderKindID}.descriptor`)).tag, 'holder');

  await dispatchMessageSuccessfully('prepareStore3');
  // create three VOs (tag "holder") which hold our vref in their vdata
  const holderVrefs = [2,3,4].map(instanceID => `o+v${holderKindID}/${instanceID}`);
  const vdata = JSON.stringify({ held: kser(thing) }); // state of holders
  for (const holderVref of holderVrefs) {
    t.is(fakestore.get(`vom.${holderVref}`), vdata);
  }
  t.is(fakestore.get(`vom.rc.${baseRef}`), '3');


  await dispatchMessageSuccessfully('finishDropHolders');
  // holders are deleted entirely
  for (const holderVref of holderVrefs) {
    t.is(fakestore.get(`vom.${holderVref}`), undefined);
  }
  // target object is dropped
  t.is(fakestore.get(`vom.rc.${baseRef}`), undefined);
  assertState(v, vref, false, 'erv');
}
test.serial('VO refcount management 2 unfaceted', async t => {
  await voRefcountManagementTest2(t, false);
});
test.serial('VO refcount management 2 faceted', async t => {
  await voRefcountManagementTest2(t, true);
});

// prettier-ignore
async function voRefcountManagementTest3(t, isf) {
  const { v, dispatchMessageSuccessfully } = await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const vref = facetRef(isf, thingVref(isf, 2), '1');
  const { baseRef } = parseVatSlot(vref);
  const thing = kslot(vref, isf ? 'thing facetB' : 'thing');
  const { fakestore } = v;

  await dispatchMessageSuccessfully('makeAndHold', isf);
  assertState(v, vref, true, 'erv');

  // holder Kind is the next-to-last created kind
  const holderKindID = JSON.parse(fakestore.get(`idCounters`)).exportID - 2;
  t.is(JSON.parse(fakestore.get(`vom.vkind.${holderKindID}.descriptor`)).tag, 'holder');

  // make a linked list with virtual "holder" objects
  await dispatchMessageSuccessfully('prepareStoreLinked');
  const holderVrefs = [2,3,4].map(instanceID => `o+v${holderKindID}/${instanceID}`);

  t.is(fakestore.get(`vom.rc.${baseRef}`), '1'); // target held by holder[0]
  t.is(fakestore.get(`vom.rc.${holderVrefs[0]}`), '1'); // held by holder[1]
  t.is(fakestore.get(`vom.rc.${holderVrefs[1]}`), '1'); // held by holder[2]
  t.is(fakestore.get(`vom.rc.${holderVrefs[2]}`), undefined); // held by RAM

  t.is(fakestore.get(`vom.${baseRef}`), testObjValue);
  t.is(fakestore.get(`vom.${holderVrefs[0]}`), heldHolderValue(thing));
  t.is(fakestore.get(`vom.${holderVrefs[1]}`), heldHolderValue(kslot(holderVrefs[0], 'holder')));
  t.is(fakestore.get(`vom.${holderVrefs[2]}`), heldHolderValue(kslot(holderVrefs[1], 'holder')));


  await dispatchMessageSuccessfully('finishDropHolders');
  // holder[2] is dropped, so the whole chain is collected

  t.is(fakestore.get(`vom.rc.${baseRef}`), undefined);
  t.is(fakestore.get(`vom.rc.${holderVrefs[0]}`), undefined);
  t.is(fakestore.get(`vom.rc.${holderVrefs[1]}`), undefined);
  t.is(fakestore.get(`vom.rc.${holderVrefs[2]}`), undefined);

  t.is(fakestore.get(`vom.${baseRef}`), undefined);
  t.is(fakestore.get(`vom.${holderVrefs[0]}`), undefined);
  t.is(fakestore.get(`vom.${holderVrefs[1]}`), undefined);
  t.is(fakestore.get(`vom.${holderVrefs[2]}`), undefined);
}
test.serial('VO refcount management 3 unfaceted', async t => {
  await voRefcountManagementTest3(t, false);
});
test.serial('VO refcount management 3 faceted', async t => {
  await voRefcountManagementTest3(t, true);
});

// prettier-ignore
test.serial('presence refcount management 1', async t => {
  const { v, dispatchMessageSuccessfully } = await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const { fakestore } = v;

  const vref = 'o-5';
  const presence = kslot(vref, 'thing');
  await dispatchMessageSuccessfully('importAndHold', presence);
  // held by RAM, no vatstore visibility yet
  t.is(fakestore.get(`vom.rc.${vref}`), undefined);

  // holder Kind is the next-to-last created kind, which gets idCounters.exportID-2
  const holderKindID = JSON.parse(fakestore.get(`idCounters`)).exportID - 2;
  t.is(JSON.parse(fakestore.get(`vom.vkind.${holderKindID}.descriptor`)).tag, 'holder');

  // create three VOs (tag "holder") which hold our vref in their vdata
  await dispatchMessageSuccessfully('prepareStore3');

  const holderVrefs = [2,3,4].map(instanceID => `o+v${holderKindID}/${instanceID}`);
  const holderdata = JSON.stringify({ held: kser(presence) }); // state of holders
  for (const holderVref of holderVrefs) {
    t.is(fakestore.get(`vom.${holderVref}`), holderdata);
  }
  t.is(fakestore.get(`vom.rc.${vref}`), '3');

  await dispatchMessageSuccessfully('finishClearHolders');
  // holder state is overwritten with 'null'
  const nulldata = JSON.stringify({ held: kser(null) }); // state of holders
  for (const holderVref of holderVrefs) {
    t.is(fakestore.get(`vom.${holderVref}`), nulldata);
  }
  // target object is dropped
  t.is(fakestore.get(`vom.rc.${vref}`), undefined);
  const expectedDrop = { type: 'dropImports', slots: [vref] };
  t.deepEqual(findSyscallsByType(v.log, 'dropImports'), [expectedDrop]);
  const expectedRetire = { type: 'retireImports', slots: [vref] };
  t.deepEqual(findSyscallsByType(v.log, 'retireImports'), [expectedRetire]);
});

// prettier-ignore
test.serial('presence refcount management 2', async t => {
  const { v, dispatchMessageSuccessfully } = await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const { fakestore } = v;

  const vref = 'o-5';
  const presence = kslot(vref, 'thing');
  await dispatchMessageSuccessfully('importAndHold', presence);
  // held by RAM, no vatstore visibility yet
  t.is(fakestore.get(`vom.rc.${vref}`), undefined);

  // holder Kind is the next-to-last created kind, which gets idCounters.exportID-2
  const holderKindID = JSON.parse(fakestore.get(`idCounters`)).exportID - 2;
  t.is(JSON.parse(fakestore.get(`vom.vkind.${holderKindID}.descriptor`)).tag, 'holder');

  await dispatchMessageSuccessfully('prepareStore3');

  const holderVrefs = [2,3,4].map(instanceID => `o+v${holderKindID}/${instanceID}`);
  const holderdata = JSON.stringify({ held: kser(presence) }); // state of holders
  for (const holderVref of holderVrefs) {
    t.is(fakestore.get(`vom.${holderVref}`), holderdata);
  }
  t.is(fakestore.get(`vom.rc.${vref}`), '3');

  await dispatchMessageSuccessfully('finishDropHolders');
  // holders are deleted entirely
  for (const holderVref of holderVrefs) {
    t.is(fakestore.get(`vom.${holderVref}`), undefined);
  }
  // target object is dropped
  t.is(fakestore.get(`vom.rc.${vref}`), undefined);
  const expectedDrop = { type: 'dropImports', slots: [vref] };
  t.deepEqual(findSyscallsByType(v.log, 'dropImports'), [expectedDrop]);
  const expectedRetire = { type: 'retireImports', slots: [vref] };
  t.deepEqual(findSyscallsByType(v.log, 'retireImports'), [expectedRetire]);

});

// prettier-ignore
test.serial('remotable refcount management 1', async t => {
  const { v, dispatchMessageSuccessfully } = await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const { fakestore } = v;

  // holder Kind is the next-to-last created kind, which gets idCounters.exportID-2
  const holderKindID = JSON.parse(fakestore.get(`idCounters`)).exportID - 2;
  t.is(JSON.parse(fakestore.get(`vom.vkind.${holderKindID}.descriptor`)).tag, 'holder');

  await dispatchMessageSuccessfully('makeAndHoldRemotable');
  // the Remotable is currently held by RAM, and doesn't get a vref
  // until it is stored somewhere or exported

  await dispatchMessageSuccessfully('prepareStore3');

  // Now there are three VirtualHolder objects, each holding our
  // Remotable. The Remotable's vref was the last thing assigned.
  const remotableID = JSON.parse(fakestore.get(`idCounters`)).exportID - 1;
  const vref = `o+${remotableID}`;
  const remotable = kslot(vref, 'thing');

  // the Remotable lives in RAM, so virtualReferences.js is allowed to
  // keep the refcount in RAM too (in remotableRefCounts), so we don't
  // expect to see a vom.rc.${vref} key
  t.is(fakestore.get(`vom.rc.${vref}`), undefined);

  // however all three holders should have the vref in their vdata
  const holderVrefs = [2,3,4].map(instanceID => `o+v${holderKindID}/${instanceID}`);
  const holderdata = JSON.stringify({ held: kser(remotable) }); // state of holders
  for (const holderVref of holderVrefs) {
    t.is(fakestore.get(`vom.${holderVref}`), holderdata);
  }

  await dispatchMessageSuccessfully('finishClearHolders');
  // all three holders will still be present, but won't point to the Remotable
  const nulldata = JSON.stringify({ held: kser(null) }); // state of holders
  for (const holderVref of holderVrefs) {
    t.is(fakestore.get(`vom.${holderVref}`), nulldata);
  }
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), []);
});

// prettier-ignore
test.serial('remotable refcount management 2', async t => {
  const { v, dispatchMessageSuccessfully } = await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const { fakestore } = v;

  const holderKindID = JSON.parse(fakestore.get(`idCounters`)).exportID - 2;
  t.is(JSON.parse(fakestore.get(`vom.vkind.${holderKindID}.descriptor`)).tag, 'holder');

  await dispatchMessageSuccessfully('makeAndHoldRemotable');
  await dispatchMessageSuccessfully('prepareStore3');
  await dispatchMessageSuccessfully('finishDropHolders');
  // all three holders are gone
  const holderVrefs = [2,3,4].map(instanceID => `o+v${holderKindID}/${instanceID}`);
  for (const holderVref of holderVrefs) {
    t.is(fakestore.get(`vom.${holderVref}`), undefined);
  }
  // TODO: export the remotable, send a dropExport, watch for a retireExports
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), []);
});

// prettier-ignore
async function voWeakKeyGCTest(t, isf) {
  const { v, dispatchMessageSuccessfully, testHooks } = await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const vref = facetRef(isf, thingVref(isf, 2), '1');
  const thing = kslot(vref, isf ? 'thing facetB' : 'thing');
  const { baseRef } = parseVatSlot(vref);
  const { fakestore } = v;

  // Create VO and hold onto it weakly, in a VOAwareWeak(Map/Set)
  await dispatchMessageSuccessfully('makeAndHoldAndKey', isf);

  t.is(testHooks.countCollectionsForWeakKey(krefOf(thing)), 2);
  t.is(testHooks.countWeakKeysForCollection(aWeakMap), 1);
  t.is(testHooks.countWeakKeysForCollection(aWeakSet), 1);
  t.is(fakestore.get(`vom.${baseRef}`), testObjValue);

  // Drop in-memory reference, GC should cause weak entries to disappear
  await dispatchMessageSuccessfully('dropHeld');
  t.is(testHooks.countCollectionsForWeakKey(krefOf(thing)), 0);
  t.is(testHooks.countWeakKeysForCollection(aWeakMap), 0);
  t.is(testHooks.countWeakKeysForCollection(aWeakSet), 0);
  t.is(fakestore.get(`vom.${baseRef}`), undefined);
}
test.serial('verify VO weak key GC unfaceted', async t => {
  await voWeakKeyGCTest(t, false);
});
test.serial('verify VO weak key GC faceted', async t => {
  await voWeakKeyGCTest(t, true);
});

// prettier-ignore
test.serial('verify presence weak key GC', async t => {
  const { v, dispatchMessageSuccessfully, dispatchRetireImports, testHooks } =
        await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const vref = 'o-5';
  const presence = kslot(vref, 'thing');
  // hold a Presence weakly by a VOAwareWeak(Map/Set), also by RAM
  await dispatchMessageSuccessfully('importAndHoldAndKey', presence);

  t.is(testHooks.countCollectionsForWeakKey(krefOf(presence)), 2);
  t.is(testHooks.countWeakKeysForCollection(aWeakMap), 1);
  t.is(testHooks.countWeakKeysForCollection(aWeakSet), 1);
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), []);

  await dispatchMessageSuccessfully('dropHeld');
  // Drop the RAM reference to the Presence. VOAwareWeakMap/Set hold
  // the vref of their Presence keys in RAM, not the DB, so there is
  // no vom.ir key to examine

  t.is(testHooks.countCollectionsForWeakKey(krefOf(presence)), 2);
  t.is(testHooks.countWeakKeysForCollection(aWeakMap), 1);
  t.is(testHooks.countWeakKeysForCollection(aWeakSet), 1);
  const expectedDrop = { type: 'dropImports', slots: [vref] };
  t.deepEqual(findSyscallsByType(v.log, 'dropImports'), [expectedDrop]);
  t.deepEqual(findSyscallsByType(v.log, 'retireImports'), []);

  v.log.length = 0;
  await dispatchRetireImports(krefOf(presence));
  // the kernel did retireImports first, so the vat does not (and
  // should not) emit a retireImports itself

  t.is(testHooks.countCollectionsForWeakKey(krefOf(presence)), 0);
  t.is(testHooks.countWeakKeysForCollection(aWeakMap), 0);
  t.is(testHooks.countWeakKeysForCollection(aWeakSet), 0);
  t.deepEqual(findSyscallsByType(v.log, 'dropImports'), []);
  t.deepEqual(findSyscallsByType(v.log, 'retireImports'), []);
});

// To test handling of a local, non-virtual remotable *from* a virtual object,
// we have essentially the same model as used above.  However, the model
// presented is concerned with references *to* virtual objects, whose
// reachability the VOM has to manage essentially on its own, and it is the
// correctness of that management machinery that these tests have been
// constructed to validate.  However, if a non-virtual object never interacts
// with any virtual object, the VOM is not involved; what we need to be
// concerned about is the subset of states in which a virtual object refers to a
// non-virtual object (or acquires or loses such a reference), which none of the
// above tests exercise.  In the following, the letters in the LERV notation
// designate references to a non-VO.

// prettier-ignore
test.serial('VO holding non-VO', async t => {
  const { v, dispatchMessageSuccessfully, dispatchDropExports, dispatchRetireExports } =
        await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const { fakestore } = v;

  // lerv -> Lerv  Create non-VO
  await dispatchMessageSuccessfully('makeAndHoldRemotable');
  // still held in RAM, no vref allocated yet
  const holderKindID = JSON.parse(fakestore.get(`idCounters`)).exportID - 2;
  t.is(JSON.parse(fakestore.get(`vom.vkind.${holderKindID}.descriptor`)).tag, 'holder');
  // holder is first instance created of that kind
  const holderVref = `o+v${holderKindID}/1`;

  // Lerv -> LERv  Export non-VO
  const value = await dispatchMessageSuccessfully('exportHeld');
  // the export allocates the vref
  const remotableID = JSON.parse(fakestore.get(`idCounters`)).exportID - 1;
  const vref = `o+${remotableID}`;
  const remotable = kslot(vref, 'thing');
  t.is(value.slots[0], vref);

  // Remotables track export status in RAM, so no vom.es key to check

  // LERv -> LERV  Store non-VO reference virtually
  await dispatchMessageSuccessfully('storeHeld');

  // the holder should have vref in its state vdata
  const data = JSON.stringify({ held: kser(remotable) });
  t.is(fakestore.get(`vom.${holderVref}`), data);
  // but vdata refcounts for Remotables are tracked in RAM, not DB

  // LERV -> LeRV  Drop the export
  await dispatchDropExports(vref);

  // LeRV -> LerV  Retire the export
  await dispatchRetireExports(vref);

  // LerV -> LerV  Read non-VO reference from VO and expect it to deserialize successfully
  await dispatchMessageSuccessfully('fetchAndHold');
});
