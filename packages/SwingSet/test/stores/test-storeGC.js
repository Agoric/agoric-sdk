// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import { Far } from '@endo/marshal';
import { M } from '@agoric/store';
import { buildSyscall, makeDispatch } from '../liveslots-helpers.js';
import {
  capargs,
  makeMessage,
  makeDropExports,
  makeRetireImports,
  makeRetireExports,
  makeBringOutYourDead,
} from '../util.js';
import engineGC from '../../src/engine-gc.js';

// These tests follow the model described in
// ../virtualObjects/test-virtualObjectGC.js

let aWeakMapStore;
let aWeakSetStore;

const mainHolderIdx = 1;

function buildRootObject(vatPowers) {
  const { VatData } = vatPowers;
  const {
    makeScalarBigMapStore,
    makeScalarBigWeakMapStore,
    makeScalarBigWeakSetStore,
  } = VatData;

  let nextStoreNumber = 1;
  let heldStore = null;

  const holders = [];

  function makeMapStore() {
    const result = makeScalarBigMapStore(`store #${nextStoreNumber}`, {
      keySchema: M.any(),
    });
    nextStoreNumber += 1;
    return result;
  }

  function makeWeakMapStore() {
    const result = makeScalarBigWeakMapStore(`store #${nextStoreNumber}`, {
      keySchema: M.any(),
    });
    nextStoreNumber += 1;
    return result;
  }

  function makeWeakSetStore() {
    const result = makeScalarBigWeakSetStore(`store #${nextStoreNumber}`, {
      keySchema: M.any(),
    });
    nextStoreNumber += 1;
    return result;
  }

  function makeHolder(stuff) {
    const result = makeMapStore();
    result.init('foo', stuff);
    return result;
  }

  const mainHolder = makeHolder(null);

  return Far('root', {
    makeAndHold() {
      heldStore = makeMapStore();
    },
    makeAndHoldAndKey() {
      aWeakMapStore = makeWeakMapStore();
      aWeakSetStore = makeWeakSetStore();
      heldStore = makeMapStore();
      aWeakMapStore.init(heldStore, 'arbitrary');
      aWeakSetStore.add(heldStore);
    },
    makeAndHoldRemotable() {
      heldStore = Far('thing', {});
    },
    dropHeld() {
      heldStore = null;
    },
    storeHeld() {
      mainHolder.set('foo', heldStore);
    },
    dropStored() {
      mainHolder.set('foo', null);
    },
    fetchAndHold() {
      heldStore = mainHolder.get('foo');
    },
    exportHeld() {
      return heldStore;
    },
    importAndHold(thing) {
      heldStore = thing;
    },
    importAndHoldAndKey(key) {
      aWeakMapStore = makeWeakMapStore();
      aWeakSetStore = makeWeakSetStore();
      heldStore = key;
      aWeakMapStore.init(key, 'arbitrary');
      aWeakSetStore.add(key);
    },

    prepareStore3() {
      holders.push(makeHolder(heldStore));
      holders.push(makeHolder(heldStore));
      holders.push(makeHolder(heldStore));
      heldStore = null;
    },
    finishClearHolders() {
      for (let i = 0; i < holders.length; i += 1) {
        holders[i].set('foo', null);
      }
    },
    finishDropHolders() {
      for (let i = 0; i < holders.length; i += 1) {
        holders[i] = null;
      }
    },
    prepareStoreLinked() {
      let holder = makeHolder(heldStore);
      holder = makeHolder(holder);
      holder = makeHolder(holder);
      holders.push(holder);
      heldStore = null;
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

const qcUndefined = { '@qclass': 'undefined' };
const NONE = undefined;
const DONE = [undefined, undefined];
const undefinedVal = capargs(qcUndefined);
const anySchema = JSON.stringify(
  capargs([{ '@qclass': 'tagged', tag: 'match:any', payload: qcUndefined }]),
);

function stringVal(str) {
  return {
    body: JSON.stringify(str),
    slots: [],
  };
}

function stringValString(str) {
  return JSON.stringify(stringVal(str));
}

function refVal(vref, type) {
  return {
    body: JSON.stringify({
      '@qclass': 'slot',
      iface: `Alleged: ${type}`,
      index: 0,
    }),
    slots: [vref],
  };
}

function refValString(vref, type) {
  return JSON.stringify(refVal(vref, type));
}

function refArg(vref, type) {
  return capargs(
    [{ '@qclass': 'slot', iface: `Alleged: ${type}`, index: 0 }],
    [vref],
  );
}

function thingArg(vref) {
  return capargs(
    [{ '@qclass': 'slot', iface: 'Alleged: thing', index: 0 }],
    [vref],
  );
}

function thingRefValString(vref) {
  return refValString(vref, 'thing');
}

const nullValString = JSON.stringify({ body: 'null', slots: [] });

function mapRef(idx) {
  return `o+1/${idx}`;
}

function mapRefArg(idx) {
  return refArg(mapRef(idx), 'mapStore');
}

function mapRefVal(idx) {
  return refVal(mapRef(idx), 'mapStore');
}

function mapRefValString(idx) {
  return refValString(mapRef(idx), 'mapStore');
}

function matchResolveOne(vref, value) {
  return { type: 'resolve', resolutions: [[vref, false, value]] };
}

function matchVatstoreGet(key, result) {
  return { type: 'vatstoreGet', key, result };
}

function matchVatstoreGetAfter(priorKey, start, end, result) {
  return { type: 'vatstoreGetAfter', priorKey, start, end, result };
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

function setupLifecycleTest(t) {
  const { log, syscall } = buildSyscall();
  const nextRP = makeRPMaker();
  const th = [];
  const dispatch = makeDispatch(syscall, buildRootObject, 'bob', false, 0, th);
  const [testHooks] = th;

  async function dispatchMessage(message, args = capargs([])) {
    const rp = nextRP();
    await dispatch(makeMessage(root, message, args, rp));
    // XXX TERRIBLE HACK WARNING XXX The following GC call is terrible but
    // apparently necessary.  Without it, the 'store refcount management 1' test
    // will fail under Node 16 if this test file is run non-selectively (that
    // is, without the "-m 'store refcount management 1'" flag) even though all
    // tests will succeed under Node 14 regardless of how initiated and the
    // single test will succeed under Node 16 if run standalone.
    //
    // This nonsense suggests that under Node 16 there may be a problem with
    // Ava's logic for running multiple tests that is allowing one test to side
    // effect others even though they are nominally run sequentially.  In
    // particular, forcing a GC at the start of setupLifecycleTest (which you
    // would think would reset the heap to a consistent initial state at the
    // start of each test) does not change the circumstances of the failure, but
    // inserting the GC after message dispatch does.  None of this makes any
    // sense that I can discern, but I don't have time to diagnose this right
    // now.  Since this hack is part of mocking the kernel side here anyway, I
    // suspect that the likely large investment in time and effort to puzzle out
    // what's going on here won't have much payoff; it seems plausible that
    // whatever the issue is it may only impact the mock environment.
    // Nevertheless there's a chance we may be courting some deeper problem,
    // hence this comment.
    engineGC();
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

function validateRefCountCheck(v, vref, rc) {
  validate(v, matchVatstoreGet(`vom.rc.${vref}`, rc));
}

function validateExportStatusCheck(v, vref, es) {
  validate(v, matchVatstoreGet(`vom.es.${vref}`, es));
}

function validateStatusCheck(v, vref, rc, es) {
  validateRefCountCheck(v, vref, rc);
  validateExportStatusCheck(v, vref, es);
}

function validateCreate(v, idx, isWeak = false) {
  validate(v, matchVatstoreSet(`vc.${idx}.|nextOrdinal`, `1`));
  if (!isWeak) {
    validate(v, matchVatstoreSet(`vc.${idx}.|entryCount`, `0`));
  }
  validate(v, matchVatstoreSet(`vc.${idx}.|schemata`, anySchema));
  validate(v, matchVatstoreSet(`vc.${idx}.|label`, `store #${idx}`));
}

function validateCreateStore(v, idx, isWeak) {
  validateCreate(v, idx, isWeak);
}

function validateUpdate(v, key, before, after) {
  validate(v, matchVatstoreGet(key, before));
  validate(v, matchVatstoreSet(key, after));
}

function validateMakeAndHold(v, rp) {
  validateCreateStore(v, 2);
  validateReturned(v, rp);
  validateDone(v);
}

function validateStoreHeld(v, rp, rcBefore, rcAfter) {
  validate(v, matchVatstoreGet(`vc.${mainHolderIdx}.sfoo`, nullValString));
  validateUpdate(v, `vom.rc.${mapRef(2)}`, rcBefore, rcAfter);
  validate(v, matchVatstoreSet(`vc.${mainHolderIdx}.sfoo`, mapRefValString(2)));
  validateReturned(v, rp);
  validateDone(v);
}

function validateDeleteMetadataOnly(
  v,
  idx,
  entries,
  contentRef,
  contentType,
  rc,
  nonVirtual,
) {
  if (contentRef !== NONE) {
    validate(
      v,
      matchVatstoreGetAfter('', `vc.${idx}.`, `vc.${idx}.{`, [
        `vc.${idx}.sfoo`,
        refValString(contentRef, contentType),
      ]),
    );
    validate(
      v,
      matchVatstoreGet(`vc.${idx}.sfoo`, refValString(contentRef, contentType)),
    );
    if (!nonVirtual) {
      validateUpdate(v, `vom.rc.${contentRef}`, `${rc}`, `${rc - 1}`);
    }
    if (contentType === 'thing' && rc === 1 && !nonVirtual) {
      validate(v, matchVatstoreDelete(`vom.rc.${contentRef}`));
    }
    validate(v, matchVatstoreDelete(`vc.${idx}.sfoo`));
    validate(
      v,
      matchVatstoreGetAfter(
        `vc.${idx}.sfoo`,
        `vc.${idx}.`,
        `vc.${idx}.{`,
        DONE,
      ),
    );
  } else {
    validate(v, matchVatstoreGetAfter('', `vc.${idx}.`, `vc.${idx}.{`, DONE));
  }
  let priorKey = '';
  if (entries >= 0) {
    validate(
      v,
      matchVatstoreGetAfter('', `vc.${idx}.|`, NONE, [
        `vc.${idx}.|entryCount`,
        `${entries}`,
      ]),
    );
    validate(v, matchVatstoreDelete(`vc.${idx}.|entryCount`));
    priorKey = `vc.${idx}.|entryCount`;
  }
  validate(
    v,
    matchVatstoreGetAfter(priorKey, `vc.${idx}.|`, NONE, [
      `vc.${idx}.|label`,
      `store #${idx}`,
    ]),
  );
  validate(v, matchVatstoreDelete(`vc.${idx}.|label`));
  validate(
    v,
    matchVatstoreGetAfter(`vc.${idx}.|label`, `vc.${idx}.|`, NONE, [
      `vc.${idx}.|nextOrdinal`,
      '1',
    ]),
  );
  validate(v, matchVatstoreDelete(`vc.${idx}.|nextOrdinal`));
  validate(
    v,
    matchVatstoreGetAfter(`vc.${idx}.|nextOrdinal`, `vc.${idx}.|`, NONE, [
      `vc.${idx}.|schemata`,
      anySchema,
    ]),
  );
  validate(v, matchVatstoreDelete(`vc.${idx}.|schemata`));
  validate(
    v,
    matchVatstoreGetAfter(`vc.${idx}.|schemata`, `vc.${idx}.|`, NONE, DONE),
  );
  validate(v, matchVatstoreDelete(`vom.rc.${mapRef(idx)}`));
  validate(v, matchVatstoreDelete(`vom.es.${mapRef(idx)}`));
}

function validateDeleteMetadata(
  v,
  es,
  idx,
  entries,
  contentRef,
  contentType,
  rc,
  nonVirtual,
) {
  validateExportStatusCheck(v, mapRef(idx), es);
  validateDeleteMetadataOnly(
    v,
    idx,
    entries,
    contentRef,
    contentType,
    rc,
    nonVirtual,
  );
}

function validateDropStored(v, rp, postCheck, rc, es, deleteMetadata) {
  validate(v, matchVatstoreGet(`vc.${mainHolderIdx}.sfoo`, mapRefValString(2)));
  validateUpdate(v, `vom.rc.${mapRef(2)}`, '1', '0');
  validate(v, matchVatstoreSet(`vc.${mainHolderIdx}.sfoo`, nullValString));
  validateReturned(v, rp);
  if (postCheck) {
    validateRefCountCheck(v, mapRef(2), rc);
    if (deleteMetadata) {
      validateDeleteMetadata(v, es, 2, 0);
    } else {
      validateExportStatusCheck(v, mapRef(2), es);
    }
  }
  validateDone(v);
}

function validateDropStoredWithGCAndRetire(v, rp, postCheck, rc, es) {
  validate(v, matchVatstoreGet(`vc.${mainHolderIdx}.sfoo`, mapRefValString(2)));
  validateUpdate(v, `vom.rc.${mapRef(2)}`, '1', '0');
  validate(v, matchVatstoreSet(`vc.${mainHolderIdx}.sfoo`, nullValString));
  validateReturned(v, rp);
  if (postCheck) {
    validateRefCountCheck(v, mapRef(2), rc);
    validateDeleteMetadata(v, es, 2, 0);
  }
  validate(v, matchRetireExports(mapRef(2)));
  validateDone(v);
}

function validateFetchAndHold(v, rp, idx) {
  validate(
    v,
    matchVatstoreGet(`vc.${mainHolderIdx}.sfoo`, mapRefValString(idx)),
  );
  validate(v, matchVatstoreGet(`vc.${idx}.|schemata`, anySchema));
  validate(v, matchVatstoreGet(`vc.${idx}.|label`, `store #${idx}`));
  validateReturned(v, rp);
  validateDone(v);
}

function validateExportHeld(v, rp, idx) {
  validate(v, matchVatstoreSet(`vom.es.${mapRef(idx)}`, '1'));
  validate(v, matchResolveOne(rp, mapRefVal(idx)));
  validateDone(v);
}

function validateImportAndHold(v, rp, idx) {
  if (idx !== NONE) {
    validate(v, matchVatstoreGet(`vc.${idx}.|schemata`, anySchema));
    validate(v, matchVatstoreGet(`vc.${idx}.|label`, `store #${idx}`));
  }
  validateReturned(v, rp);
  validateDone(v);
}

function validateDropHeldWithGC(v, rp, rc, es) {
  validateReturned(v, rp);
  validateRefCountCheck(v, mapRef(2), rc);
  validateDeleteMetadata(v, es, 2, 0);
  validateDone(v);
}

function validateCreateHolder(v, idx) {
  validateCreate(v, idx);
  validate(v, matchVatstoreGet(`vc.${idx}.sfoo`));
  validate(v, matchVatstoreSet(`vc.${idx}.sfoo`, nullValString));
  validate(v, matchVatstoreGet(`vc.${idx}.|entryCount`, '0'));
  validate(v, matchVatstoreSet(`vc.${idx}.|entryCount`, '1'));
}

function validateInit(v) {
  validate(v, matchVatstoreGet('storeKindIDTable', NONE));
  validate(
    v,
    matchVatstoreSet(
      'storeKindIDTable',
      '{"scalarMapStore":1,"scalarWeakMapStore":2,"scalarSetStore":3,"scalarWeakSetStore":4,"scalarDurableMapStore":5,"scalarDurableWeakMapStore":6,"scalarDurableSetStore":7,"scalarDurableWeakSetStore":8}',
    ),
  );
  validateCreateHolder(v, 1);
}

function validateDropHeld(v, rp, rc, es) {
  validateReturned(v, rp);
  validate(v, matchVatstoreGet(`vom.rc.${mapRef(2)}`, rc));
  validate(v, matchVatstoreGet(`vom.es.${mapRef(2)}`, es));
  validateDone(v);
}

function validateDropHeldWithGCAndRetire(v, rp) {
  validateReturned(v, rp);
  validateRefCountCheck(v, mapRef(2), NONE);
  validateDeleteMetadata(v, '0', 2, 0);
  validate(v, matchRetireExports(mapRef(2)));
  validateDone(v);
}

function validateDropExports(v, idx, rc, es) {
  validate(v, matchVatstoreSet(`vom.es.${mapRef(idx)}`, es));
  validate(v, matchVatstoreGet(`vom.rc.${mapRef(idx)}`, rc));
  validateDone(v);
}

function validateDropExportsWithGCAndRetire(v, idx, rc, es) {
  validate(v, matchVatstoreSet(`vom.es.${mapRef(idx)}`, es));
  validate(v, matchVatstoreGet(`vom.rc.${mapRef(idx)}`, rc));
  validateRefCountCheck(v, mapRef(2), rc);
  validateDeleteMetadata(v, es, 2, 0);
  validate(v, matchRetireExports(mapRef(2)));
  validateDone(v);
}

function validateRetireExports(v, idx) {
  validate(v, matchVatstoreDelete(`vom.es.${mapRef(idx)}`));
  validateDone(v);
}

// NOTE: these tests must be run serially, since they share a heap and garbage
// collection during one test can interfere with the deterministic behavior of a
// different test.

// test 1: lerv -> Lerv -> LerV -> Lerv -> lerv
test.serial('store lifecycle 1', async t => {
  const { v, dispatchMessage } = setupLifecycleTest(t);

  // lerv -> Lerv  Create store
  let rp = await dispatchMessage('makeAndHold');
  validateInit(v);
  validateMakeAndHold(v, rp);

  // Lerv -> LerV  Store store reference virtually (in another store)
  rp = await dispatchMessage('storeHeld');
  validateStoreHeld(v, rp, NONE, '1');

  // LerV -> Lerv  Overwrite virtual reference
  rp = await dispatchMessage('dropStored');
  validateDropStored(v, rp, false, '0', NONE);

  // Lerv -> lerv  Drop in-memory reference, unreferenced store gets GC'd
  rp = await dispatchMessage('dropHeld');
  validateDropHeldWithGC(v, rp, '0', NONE);
});

// test 2: lerv -> Lerv -> LerV -> lerV -> LerV -> LERV -> lERV -> LERV ->
//   lERV -> LERV -> lERV -> leRV -> LeRV -> leRV -> LeRV -> LerV
test.serial('store lifecycle 2', async t => {
  const {
    v,
    dispatchMessage,
    dispatchDropExports,
    dispatchRetireExports,
  } = setupLifecycleTest(t);

  // lerv -> Lerv  Create store
  let rp = await dispatchMessage('makeAndHold');
  validateInit(v);
  validateMakeAndHold(v, rp);

  // Lerv -> LerV  Store store reference virtually (in another store)
  rp = await dispatchMessage('storeHeld');
  validateStoreHeld(v, rp, NONE, '1');

  // LerV -> lerV  Drop in-memory reference, no GC because virtual reference
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp, '1', NONE);

  // lerV -> LerV  Read virtual reference, now there's an in-memory reference again too
  rp = await dispatchMessage('fetchAndHold');
  validateFetchAndHold(v, rp, 2);

  // LerV -> LERV  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld');
  validateExportHeld(v, rp, 2);

  // LERV -> lERV  Drop the in-memory reference again, but it's still exported and virtual referenced
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp, '1', '1');

  // lERV -> LERV  Reread from storage, all three legs again
  rp = await dispatchMessage('fetchAndHold');
  validateFetchAndHold(v, rp, 2);

  // LERV -> lERV  Drop in-memory reference (stepping stone to other states)
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp, '1', '1');

  // lERV -> LERV  Reintroduce the in-memory reference via message
  rp = await dispatchMessage('importAndHold', mapRefArg(2));
  validateImportAndHold(v, rp, 2);

  // LERV -> lERV  Drop in-memory reference
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp, '1', '1');

  // lERV -> leRV  Drop the export
  await dispatchDropExports(mapRef(2));
  validateDropExports(v, 2, '1', '0');

  // leRV -> LeRV  Fetch from storage
  rp = await dispatchMessage('fetchAndHold');
  validateFetchAndHold(v, rp, 2);

  // LeRV -> leRV  Forget about it *again*
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp, '1', '0');

  // leRV -> LeRV  Fetch from storage *again*
  rp = await dispatchMessage('fetchAndHold');
  validateFetchAndHold(v, rp, 2);

  // LeRV -> LerV  Retire the export
  await dispatchRetireExports(mapRef(2));
  validateRetireExports(v, 2);
});

// test 3: lerv -> Lerv -> LerV -> LERV -> LeRV -> leRV -> lerV -> lerv
test.serial('store lifecycle 3', async t => {
  const {
    v,
    dispatchMessage,
    dispatchDropExports,
    dispatchRetireExports,
  } = setupLifecycleTest(t);

  // lerv -> Lerv  Create store
  let rp = await dispatchMessage('makeAndHold');
  validateInit(v);
  validateMakeAndHold(v, rp);

  // Lerv -> LerV  Store store reference virtually (permanent for now)
  rp = await dispatchMessage('storeHeld');
  validateStoreHeld(v, rp, NONE, '1');

  // LerV -> LERV  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld');
  validateExportHeld(v, rp, 2);

  // LERV -> LeRV  Drop the export
  await dispatchDropExports(mapRef(2));
  validateDropExports(v, 2, '1', '0');

  // LeRV -> leRV  Drop in-memory reference
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp, '1', '0');

  // leRV -> lerV  Retire the export
  await dispatchRetireExports(mapRef(2));
  validateRetireExports(v, 2);

  // lerV -> lerv  Drop stored reference (gc and retire)
  rp = await dispatchMessage('dropStored');
  validateDropStored(v, rp, true, '0', NONE, true);
});

// test 4: lerv -> Lerv -> LERv -> LeRv -> lerv
test.serial('store lifecycle 4', async t => {
  const { v, dispatchMessage, dispatchDropExports } = setupLifecycleTest(t);

  // lerv -> Lerv  Create store
  let rp = await dispatchMessage('makeAndHold');
  validateInit(v);
  validateMakeAndHold(v, rp);

  // Lerv -> LERv  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld');
  validateExportHeld(v, rp, 2);

  // LERv -> LeRv  Drop the export
  await dispatchDropExports(mapRef(2));
  validateDropExports(v, 2, NONE, '0');

  // LeRv -> lerv  Drop in-memory reference (gc and retire)
  rp = await dispatchMessage('dropHeld');
  validateDropHeldWithGCAndRetire(v, rp);
});

// test 5: lerv -> Lerv -> LERv -> LeRv -> Lerv -> lerv
test.serial('store lifecycle 5', async t => {
  const {
    v,
    dispatchMessage,
    dispatchDropExports,
    dispatchRetireExports,
  } = setupLifecycleTest(t);

  // lerv -> Lerv  Create store
  let rp = await dispatchMessage('makeAndHold');
  validateInit(v);
  validateMakeAndHold(v, rp);

  // Lerv -> LERv  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld');
  validateExportHeld(v, rp, 2);

  // LERv -> LeRv  Drop the export
  await dispatchDropExports(mapRef(2));
  validateDropExports(v, 2, NONE, '0');

  // LeRv -> Lerv  Retire the export
  await dispatchRetireExports(mapRef(2));
  validateRetireExports(v, 2);

  // Lerv -> lerv  Drop in-memory reference, unreferenced store gets GC'd
  rp = await dispatchMessage('dropHeld');
  validateDropHeldWithGC(v, rp, NONE, NONE);
});

// test 6: lerv -> Lerv -> LERv -> LeRv -> LeRV -> LeRv -> LeRV -> leRV -> lerv
test.serial('store lifecycle 6', async t => {
  const { v, dispatchMessage, dispatchDropExports } = setupLifecycleTest(t);

  // lerv -> Lerv  Create store
  let rp = await dispatchMessage('makeAndHold');
  validateInit(v);
  validateMakeAndHold(v, rp);

  // Lerv -> LERv  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld');
  validateExportHeld(v, rp, 2);

  // LERv -> LeRv  Drop the export
  await dispatchDropExports(mapRef(2));
  validateDropExports(v, 2, NONE, '0');

  // LeRv -> LeRV  Store store reference virtually
  rp = await dispatchMessage('storeHeld');
  validateStoreHeld(v, rp, NONE, '1');

  // LeRV -> LeRv  Overwrite virtual reference
  rp = await dispatchMessage('dropStored');
  validateDropStored(v, rp, false, '0', NONE);

  // LeRv -> LeRV  Store store reference virtually again
  rp = await dispatchMessage('storeHeld');
  validateStoreHeld(v, rp, '0', '1');

  // LeRV -> leRV  Drop in-memory reference
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp, '1', '0');

  // leRV -> lerv  Drop stored reference (gc and retire)
  rp = await dispatchMessage('dropStored');
  validateDropStoredWithGCAndRetire(v, rp, true, '0', '0');
});

// test 7: lerv -> Lerv -> LERv -> lERv -> LERv -> lERv -> lerv
test.serial('store lifecycle 7', async t => {
  const { v, dispatchMessage, dispatchDropExports } = setupLifecycleTest(t);

  // lerv -> Lerv  Create store
  let rp = await dispatchMessage('makeAndHold');
  validateInit(v);
  validateMakeAndHold(v, rp);

  // Lerv -> LERv  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld');
  validateExportHeld(v, rp, 2);

  // LERv -> lERv  Drop in-memory reference, no GC because exported
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp, NONE, '1');

  // lERv -> LERv  Reintroduce the in-memory reference via message
  rp = await dispatchMessage('importAndHold', mapRefArg(2));
  validateImportAndHold(v, rp, 2);

  // LERv -> lERv  Drop in-memory reference again, still no GC because exported
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp, NONE, '1');

  // lERv -> lerv  Drop the export (gc and retire)
  rp = await dispatchDropExports(mapRef(2));
  validateDropExportsWithGCAndRetire(v, 2, NONE, '0');
});

// test 8: lerv -> Lerv -> LERv -> LERV -> LERv -> LERV -> lERV -> lERv -> lerv
test.serial('store lifecycle 8', async t => {
  const { v, dispatchMessage, dispatchDropExports } = setupLifecycleTest(t);

  // lerv -> Lerv  Create store
  let rp = await dispatchMessage('makeAndHold');
  validateInit(v);
  validateMakeAndHold(v, rp);

  // Lerv -> LERv  Export the reference
  rp = await dispatchMessage('exportHeld');
  validateExportHeld(v, rp, 2);

  // LERv -> LERV  Store store reference virtually
  rp = await dispatchMessage('storeHeld');
  validateStoreHeld(v, rp, NONE, '1');

  // LERV -> LERv  Overwrite virtual reference
  rp = await dispatchMessage('dropStored');
  validateDropStored(v, rp, false, '0', NONE);

  // LERv -> LERV  Store store reference virtually
  rp = await dispatchMessage('storeHeld');
  validateStoreHeld(v, rp, '0', '1');

  // LERV -> lERV  Drop the in-memory reference
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp, '1', '1');

  // lERV -> lERv  Overwrite virtual reference
  rp = await dispatchMessage('dropStored');
  validateDropStored(v, rp, true, '0', '1');

  // lERv -> lerv  Drop the export (gc and retire)
  rp = await dispatchDropExports(mapRef(2));
  validateDropExportsWithGCAndRetire(v, 2, '0', '0');
});

function validatePrepareStore3(
  v,
  rp,
  base,
  contentRef,
  content,
  checkES,
  nonVirtual,
) {
  validateCreate(v, base);
  validate(v, matchVatstoreGet(`vc.${base}.sfoo`, NONE));
  if (!nonVirtual) {
    validateUpdate(v, `vom.rc.${contentRef}`, NONE, '1');
  }
  validate(v, matchVatstoreSet(`vc.${base}.sfoo`, content));
  validate(v, matchVatstoreGet(`vc.${base}.|entryCount`, '0'));
  validate(v, matchVatstoreSet(`vc.${base}.|entryCount`, '1'));

  validateCreate(v, base + 1);
  validate(v, matchVatstoreGet(`vc.${base + 1}.sfoo`, NONE));
  if (!nonVirtual) {
    validateUpdate(v, `vom.rc.${contentRef}`, '1', '2');
  }
  validate(v, matchVatstoreSet(`vc.${base + 1}.sfoo`, content));
  validate(v, matchVatstoreGet(`vc.${base + 1}.|entryCount`, '0'));
  validate(v, matchVatstoreSet(`vc.${base + 1}.|entryCount`, '1'));

  validateCreate(v, base + 2);
  validate(v, matchVatstoreGet(`vc.${base + 2}.sfoo`, NONE));
  if (!nonVirtual) {
    validateUpdate(v, `vom.rc.${contentRef}`, '2', '3');
  }
  validate(v, matchVatstoreSet(`vc.${base + 2}.sfoo`, content));
  validate(v, matchVatstoreGet(`vc.${base + 2}.|entryCount`, '0'));
  validate(v, matchVatstoreSet(`vc.${base + 2}.|entryCount`, '1'));

  validateReturned(v, rp);
  if (!nonVirtual) {
    validateRefCountCheck(v, contentRef, '3');
    if (checkES) {
      validateExportStatusCheck(v, contentRef, NONE);
    }
  }
  validateDone(v);
}

test.serial('store refcount management 1', async t => {
  const { v, dispatchMessage } = setupLifecycleTest(t);

  let rp = await dispatchMessage('makeAndHold');
  validateInit(v);
  validateMakeAndHold(v, rp);

  rp = await dispatchMessage('prepareStore3');
  validatePrepareStore3(v, rp, 3, mapRef(2), mapRefValString(2), true);

  rp = await dispatchMessage('finishClearHolders');
  validate(v, matchVatstoreGet(`vc.3.sfoo`, mapRefValString(2)));
  validateUpdate(v, `vom.rc.${mapRef(2)}`, '3', '2');
  validate(v, matchVatstoreSet(`vc.3.sfoo`, nullValString));

  validate(v, matchVatstoreGet(`vc.4.sfoo`, mapRefValString(2)));
  validateUpdate(v, `vom.rc.${mapRef(2)}`, '2', '1');
  validate(v, matchVatstoreSet(`vc.4.sfoo`, nullValString));

  validate(v, matchVatstoreGet(`vc.5.sfoo`, mapRefValString(2)));
  validateUpdate(v, `vom.rc.${mapRef(2)}`, '1', '0');
  validate(v, matchVatstoreSet(`vc.5.sfoo`, nullValString));

  validateReturned(v, rp);
  validateRefCountCheck(v, mapRef(2), '0');
  validateDeleteMetadata(v, NONE, 2, 0);
  validateDone(v);
});

test.serial('store refcount management 2', async t => {
  const { v, dispatchMessage } = setupLifecycleTest(t);

  let rp = await dispatchMessage('makeAndHold');
  validateInit(v);
  validateMakeAndHold(v, rp);

  rp = await dispatchMessage('prepareStore3');
  validatePrepareStore3(v, rp, 3, mapRef(2), mapRefValString(2), true);

  rp = await dispatchMessage('finishDropHolders');
  validateReturned(v, rp);
  validateRefCountCheck(v, mapRef(3), NONE);
  validateDeleteMetadata(v, NONE, 3, 1, mapRef(2), 'mapStore', 3);

  validateRefCountCheck(v, mapRef(4), NONE);
  validateDeleteMetadata(v, NONE, 4, 1, mapRef(2), 'mapStore', 2);

  validateRefCountCheck(v, mapRef(5), NONE);
  validateDeleteMetadata(v, NONE, 5, 1, mapRef(2), 'mapStore', 1);

  validateRefCountCheck(v, mapRef(2), '0', NONE);
  validateDeleteMetadata(v, NONE, 2, 0, NONE, NONE, 1);

  validateDone(v);
});

test.serial('store refcount management 3', async t => {
  const { v, dispatchMessage } = setupLifecycleTest(t);

  let rp = await dispatchMessage('makeAndHold');
  validateInit(v);
  validateMakeAndHold(v, rp);

  rp = await dispatchMessage('prepareStoreLinked');
  validateCreate(v, 3);
  validate(v, matchVatstoreGet(`vc.3.sfoo`, NONE));
  validateUpdate(v, `vom.rc.${mapRef(2)}`, NONE, '1');
  validate(v, matchVatstoreSet(`vc.3.sfoo`, mapRefValString(2)));
  validate(v, matchVatstoreGet(`vc.3.|entryCount`, '0'));
  validate(v, matchVatstoreSet(`vc.3.|entryCount`, '1'));
  validateCreate(v, 4);
  validate(v, matchVatstoreGet(`vc.4.sfoo`, NONE));
  validateUpdate(v, `vom.rc.${mapRef(3)}`, NONE, '1');
  validate(v, matchVatstoreSet(`vc.4.sfoo`, mapRefValString(3)));
  validate(v, matchVatstoreGet(`vc.4.|entryCount`, '0'));
  validate(v, matchVatstoreSet(`vc.4.|entryCount`, '1'));
  validateCreate(v, 5);
  validate(v, matchVatstoreGet(`vc.5.sfoo`, NONE));
  validateUpdate(v, `vom.rc.${mapRef(4)}`, NONE, '1');
  validate(v, matchVatstoreSet(`vc.5.sfoo`, mapRefValString(4)));
  validate(v, matchVatstoreGet(`vc.5.|entryCount`, '0'));
  validate(v, matchVatstoreSet(`vc.5.|entryCount`, '1'));
  validateReturned(v, rp);
  validateStatusCheck(v, mapRef(2), '1', NONE);
  validateStatusCheck(v, mapRef(3), '1', NONE);
  validateStatusCheck(v, mapRef(4), '1', NONE);
  validateDone(v);

  rp = await dispatchMessage('finishDropHolders');
  validateReturned(v, rp);
  validateRefCountCheck(v, mapRef(5), NONE);
  validateDeleteMetadata(v, NONE, 5, 1, mapRef(4), 'mapStore', 1);
  validateRefCountCheck(v, mapRef(4), '0');
  validateDeleteMetadata(v, NONE, 4, 1, mapRef(3), 'mapStore', 1);
  validateRefCountCheck(v, mapRef(3), '0');
  validateDeleteMetadata(v, NONE, 3, 1, mapRef(2), 'mapStore', 1);
  validateRefCountCheck(v, mapRef(2), '0');
  validateDeleteMetadata(v, NONE, 2, 0, NONE, NONE, 1);
  validateDone(v);
});

test.serial('presence refcount management 1', async t => {
  const { v, dispatchMessage } = setupLifecycleTest(t);

  let rp = await dispatchMessage('importAndHold', thingArg('o-5'));
  validateInit(v);
  validateImportAndHold(v, rp);

  rp = await dispatchMessage('prepareStore3');
  validatePrepareStore3(v, rp, 2, 'o-5', thingRefValString('o-5'), false);

  rp = await dispatchMessage('finishClearHolders');
  validate(v, matchVatstoreGet(`vc.2.sfoo`, thingRefValString('o-5')));
  validateUpdate(v, `vom.rc.o-5`, '3', '2');
  validate(v, matchVatstoreSet(`vc.2.sfoo`, nullValString));

  validate(v, matchVatstoreGet(`vc.3.sfoo`, thingRefValString('o-5')));
  validateUpdate(v, `vom.rc.o-5`, '2', '1');
  validate(v, matchVatstoreSet(`vc.3.sfoo`, nullValString));

  validate(v, matchVatstoreGet(`vc.4.sfoo`, thingRefValString('o-5')));
  validateUpdate(v, `vom.rc.o-5`, '1', '0');
  validate(v, matchVatstoreDelete(`vom.rc.o-5`));
  validate(v, matchVatstoreSet(`vc.4.sfoo`, nullValString));

  validateReturned(v, rp);
  validateRefCountCheck(v, 'o-5', NONE);
  validate(v, matchDropImports('o-5'));
  validate(v, matchRetireImports('o-5'));
  validateDone(v);
});

test.serial('presence refcount management 2', async t => {
  const { v, dispatchMessage } = setupLifecycleTest(t);

  let rp = await dispatchMessage('importAndHold', thingArg('o-5'));
  validateInit(v);
  validateImportAndHold(v, rp);

  rp = await dispatchMessage('prepareStore3');
  validatePrepareStore3(v, rp, 2, 'o-5', thingRefValString('o-5'), false);

  rp = await dispatchMessage('finishDropHolders');
  validateReturned(v, rp);
  validateRefCountCheck(v, mapRef(2), NONE);
  validateDeleteMetadata(v, NONE, 2, 1, 'o-5', 'thing', 3);
  validateRefCountCheck(v, mapRef(3), NONE);
  validateDeleteMetadata(v, NONE, 3, 1, 'o-5', 'thing', 2);
  validateRefCountCheck(v, mapRef(4), NONE);
  validateDeleteMetadata(v, NONE, 4, 1, 'o-5', 'thing', 1);

  validate(v, matchVatstoreGet('vom.rc.o-5', NONE));
  validate(v, matchDropImports('o-5'));
  validate(v, matchRetireImports('o-5'));
  validateDone(v);
});

test.serial('remotable refcount management 1', async t => {
  const { v, dispatchMessage } = setupLifecycleTest(t);

  let rp = await dispatchMessage('makeAndHoldRemotable');
  validateInit(v);
  validateReturned(v, rp);
  validateDone(v);

  rp = await dispatchMessage('prepareStore3');
  validatePrepareStore3(v, rp, 2, 'o+9', thingRefValString('o+9'), false, true);

  rp = await dispatchMessage('finishClearHolders');
  validate(v, matchVatstoreGet(`vc.2.sfoo`, refValString('o+9', 'thing')));
  validate(v, matchVatstoreSet(`vc.2.sfoo`, nullValString));
  validate(v, matchVatstoreGet(`vc.3.sfoo`, refValString('o+9', 'thing')));
  validate(v, matchVatstoreSet(`vc.3.sfoo`, nullValString));
  validate(v, matchVatstoreGet(`vc.4.sfoo`, refValString('o+9', 'thing')));
  validate(v, matchVatstoreSet(`vc.4.sfoo`, nullValString));
  validateReturned(v, rp);
  validateDone(v);
});

test.serial('remotable refcount management 2', async t => {
  const { v, dispatchMessage } = setupLifecycleTest(t);

  let rp = await dispatchMessage('makeAndHoldRemotable');
  validateInit(v);
  validateReturned(v, rp);
  validateDone(v);

  rp = await dispatchMessage('prepareStore3');
  validatePrepareStore3(v, rp, 2, 'o+9', thingRefValString('o+9'), false, true);

  rp = await dispatchMessage('finishDropHolders');
  validateReturned(v, rp);
  validateRefCountCheck(v, mapRef(2), NONE);
  validateDeleteMetadata(v, NONE, 2, 1, 'o+9', 'thing', 3, true);
  validateRefCountCheck(v, mapRef(3), NONE);
  validateDeleteMetadata(v, NONE, 3, 1, 'o+9', 'thing', 2, true);
  validateRefCountCheck(v, mapRef(4), NONE);
  validateDeleteMetadata(v, NONE, 4, 1, 'o+9', 'thing', 1, true);
  validateDone(v);
});

test.serial('verify store weak key GC', async t => {
  const { v, dispatchMessage, testHooks } = setupLifecycleTest(t);

  // Create a store to use as a key and hold onto it weakly
  let rp = await dispatchMessage('makeAndHoldAndKey');
  validateInit(v);
  validateCreateStore(v, 2, true); // map
  validateCreateStore(v, 3, true); // set
  validateCreateStore(v, 4); // key

  const ordinalKey = `r0000000001:${mapRef(4)}`;

  validate(v, matchVatstoreGet(`vc.2.|${mapRef(4)}`, NONE));
  validate(v, matchVatstoreGet(`vc.2.|nextOrdinal`, '1'));
  validate(v, matchVatstoreSet(`vc.2.|${mapRef(4)}`, '1'));
  validate(v, matchVatstoreSet(`vc.2.|nextOrdinal`, '2'));
  validate(v, matchVatstoreGet(`vc.2.|${mapRef(4)}`, '1'));
  validate(
    v,
    matchVatstoreSet(`vc.2.${ordinalKey}`, stringValString('arbitrary')),
  );

  validate(v, matchVatstoreGet(`vc.3.|${mapRef(4)}`, NONE));
  validate(v, matchVatstoreGet(`vc.3.|nextOrdinal`, '1'));
  validate(v, matchVatstoreSet(`vc.3.|${mapRef(4)}`, '1'));
  validate(v, matchVatstoreSet(`vc.3.|nextOrdinal`, '2'));
  validate(v, matchVatstoreGet(`vc.3.|${mapRef(4)}`, '1'));
  validate(v, matchVatstoreSet(`vc.3.${ordinalKey}`, nullValString));
  validateReturned(v, rp);
  validateDone(v);

  t.is(testHooks.countCollectionsForWeakKey(mapRef(4)), 2);
  t.is(testHooks.storeSizeInternal(mapRef(2)), 1);
  validate(
    v,
    matchVatstoreGetAfter('', `vc.2.`, `vc.2.{`, [
      `vc.2.${ordinalKey}`,
      stringValString('arbitrary'),
    ]),
  );
  validate(
    v,
    matchVatstoreGetAfter(`vc.2.${ordinalKey}`, `vc.2.`, `vc.2.{`, DONE),
  );
  t.is(testHooks.storeSizeInternal(mapRef(3)), 1);
  validate(
    v,
    matchVatstoreGetAfter('', `vc.3.`, `vc.3.{`, [
      `vc.3.${ordinalKey}`,
      nullValString,
    ]),
  );
  validate(
    v,
    matchVatstoreGetAfter(`vc.3.${ordinalKey}`, `vc.3.`, `vc.3.{`, DONE),
  );
  validateDone(v);

  // Drop in-memory reference, GC should cause weak entries to disappear
  rp = await dispatchMessage('dropHeld');
  validateReturned(v, rp);
  validateStatusCheck(v, mapRef(4), NONE, NONE);
  validateDeleteMetadataOnly(v, 4, 0, NONE, NONE, 47, false);
  validate(v, matchVatstoreGet(`vc.2.|${mapRef(4)}`, '1'));
  validate(v, matchVatstoreDelete(`vc.2.|${mapRef(4)}`));
  validate(v, matchVatstoreDelete(`vc.2.${ordinalKey}`));
  validate(v, matchVatstoreGet(`vc.3.|${mapRef(4)}`, '1'));
  validate(v, matchVatstoreDelete(`vc.3.|${mapRef(4)}`));
  validate(v, matchVatstoreDelete(`vc.3.${ordinalKey}`));

  t.is(testHooks.countCollectionsForWeakKey(mapRef(4)), 0);
  t.is(testHooks.storeSizeInternal(mapRef(2)), 0);
  validate(v, matchVatstoreGetAfter('', `vc.2.`, `vc.2.{`, DONE));
  t.is(testHooks.storeSizeInternal(mapRef(3)), 0);
  validate(v, matchVatstoreGetAfter('', `vc.3.`, `vc.3.{`, DONE));
  validateDone(v);
});

test.serial('verify presence weak key GC', async t => {
  const {
    v,
    dispatchMessage,
    dispatchRetireImports,
    testHooks,
  } = setupLifecycleTest(t);

  // Import a presence to use as a key and hold onto it weakly
  let rp = await dispatchMessage('importAndHoldAndKey', thingArg('o-5'));
  validateInit(v);
  validateCreateStore(v, 2, true); // map
  validateCreateStore(v, 3, true); // set

  const ordinalKey = `r0000000001:o-5`;

  validate(v, matchVatstoreGet(`vc.2.|o-5`, NONE));
  validate(v, matchVatstoreGet(`vc.2.|nextOrdinal`, '1'));
  validate(v, matchVatstoreSet(`vc.2.|o-5`, '1'));
  validate(v, matchVatstoreSet(`vc.2.|nextOrdinal`, '2'));
  validate(v, matchVatstoreGet(`vc.2.|o-5`, '1'));
  validate(
    v,
    matchVatstoreSet(`vc.2.${ordinalKey}`, stringValString('arbitrary')),
  );

  validate(v, matchVatstoreGet(`vc.3.|o-5`, NONE));
  validate(v, matchVatstoreGet(`vc.3.|nextOrdinal`, '1'));
  validate(v, matchVatstoreSet(`vc.3.|o-5`, '1'));
  validate(v, matchVatstoreSet(`vc.3.|nextOrdinal`, '2'));
  validate(v, matchVatstoreGet(`vc.3.|o-5`, '1'));
  validate(v, matchVatstoreSet(`vc.3.${ordinalKey}`, nullValString));
  validateReturned(v, rp);

  t.is(testHooks.countCollectionsForWeakKey('o-5'), 2);
  t.is(testHooks.storeSizeInternal(mapRef(2)), 1);
  validate(
    v,
    matchVatstoreGetAfter('', `vc.2.`, `vc.2.{`, [
      `vc.2.${ordinalKey}`,
      stringValString('arbitrary'),
    ]),
  );
  validate(
    v,
    matchVatstoreGetAfter(`vc.2.${ordinalKey}`, `vc.2.`, `vc.2.{`, DONE),
  );
  t.is(testHooks.storeSizeInternal(mapRef(3)), 1);
  validate(
    v,
    matchVatstoreGetAfter('', `vc.3.`, `vc.3.{`, [
      `vc.3.${ordinalKey}`,
      nullValString,
    ]),
  );
  validate(
    v,
    matchVatstoreGetAfter(`vc.3.${ordinalKey}`, `vc.3.`, `vc.3.{`, DONE),
  );
  validateDone(v);

  rp = await dispatchMessage('dropHeld');
  validateReturned(v, rp);
  validate(v, matchVatstoreGet('vom.rc.o-5'));
  validate(v, matchDropImports('o-5'));
  t.is(testHooks.countCollectionsForWeakKey('o-5'), 2);
  t.is(testHooks.storeSizeInternal(mapRef(2)), 1);
  validate(
    v,
    matchVatstoreGetAfter('', `vc.2.`, `vc.2.{`, [
      `vc.2.${ordinalKey}`,
      stringValString('arbitrary'),
    ]),
  );
  validate(
    v,
    matchVatstoreGetAfter(`vc.2.${ordinalKey}`, `vc.2.`, `vc.2.{`, DONE),
  );
  t.is(testHooks.storeSizeInternal(mapRef(3)), 1);
  validate(
    v,
    matchVatstoreGetAfter('', `vc.3.`, `vc.3.{`, [
      `vc.3.${ordinalKey}`,
      nullValString,
    ]),
  );
  validate(
    v,
    matchVatstoreGetAfter(`vc.3.${ordinalKey}`, `vc.3.`, `vc.3.{`, DONE),
  );
  validateDone(v);

  await dispatchRetireImports('o-5');
  validate(v, matchVatstoreGet(`vc.2.|o-5`, '1'));
  validate(v, matchVatstoreDelete(`vc.2.|o-5`));
  validate(v, matchVatstoreDelete(`vc.2.${ordinalKey}`));
  validate(v, matchVatstoreGet(`vc.3.|o-5`, '1'));
  validate(v, matchVatstoreDelete(`vc.3.|o-5`));
  validate(v, matchVatstoreDelete(`vc.3.${ordinalKey}`));
  validateRefCountCheck(v, 'o-5', NONE);
  validate(v, matchDropImports('o-5'));
  validate(v, matchRetireImports('o-5'));
  validateDone(v);

  t.is(testHooks.countCollectionsForWeakKey('o-5'), 0);
  t.is(testHooks.storeSizeInternal(mapRef(2)), 0);
  validate(v, matchVatstoreGetAfter('', `vc.2.`, `vc.2.{`, DONE));
  t.is(testHooks.storeSizeInternal(mapRef(3)), 0);
  validate(v, matchVatstoreGetAfter('', `vc.3.`, `vc.3.{`, DONE));
  validateDone(v);
});
