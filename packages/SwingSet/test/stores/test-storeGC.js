// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import { Far } from '@endo/marshal';
import { M } from '@agoric/store';
import {
  setupTestLiveslots,
  matchResolveOne,
  matchVatstoreGet,
  matchVatstoreGetAfter,
  matchVatstoreDelete,
  matchVatstoreSet,
  matchRetireExports,
  matchDropImports,
  matchRetireImports,
  validate,
  validateDone,
  validateReturned,
} from '../liveslots-helpers.js';
import { capargs } from '../util.js';

// These tests follow the model described in
// ../virtualObjects/test-virtualObjectGC.js

let aWeakMapStore;
let aWeakSetStore;

const mainHolderIdx = 2;
const mainHeldIdx = 3;

function buildRootObject(vatPowers) {
  const { VatData } = vatPowers;
  const {
    makeScalarBigMapStore,
    makeScalarBigWeakMapStore,
    makeScalarBigWeakSetStore,
  } = VatData;

  let nextStoreNumber = 2;
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

const NONE = undefined;
const DONE = [undefined, undefined];
const anySchema = JSON.stringify(
  capargs([
    {
      '@qclass': 'tagged',
      tag: 'match:any',
      payload: { '@qclass': 'undefined' },
    },
  ]),
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

function validateCreateBaggage(v, idx) {
  validate(v, matchVatstoreSet(`vc.${idx}.|nextOrdinal`, `1`));
  validate(v, matchVatstoreSet(`vc.${idx}.|entryCount`, `0`));
  const baggageSchema = JSON.stringify(
    capargs([{ '@qclass': 'tagged', tag: 'match:kind', payload: 'string' }]),
  );
  validate(v, matchVatstoreSet(`vc.${idx}.|schemata`, baggageSchema));
  validate(v, matchVatstoreSet(`vc.${idx}.|label`, 'baggage'));
  validate(v, matchVatstoreSet('baggageID', 'o+5/1'));
  validate(v, matchVatstoreGet('vom.rc.o+5/1', NONE));
  validate(v, matchVatstoreSet('vom.rc.o+5/1', '1'));
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
  validateCreateStore(v, mainHeldIdx);
  validateReturned(v, rp);
  validate(v, matchVatstoreSet('idCounters'));
  validateDone(v);
}

function validateStoreHeld(v, rp, rcBefore, rcAfter) {
  validate(v, matchVatstoreGet(`vc.${mainHolderIdx}.sfoo`, nullValString));
  validateUpdate(v, `vom.rc.${mapRef(mainHeldIdx)}`, rcBefore, rcAfter);
  validate(
    v,
    matchVatstoreSet(`vc.${mainHolderIdx}.sfoo`, mapRefValString(mainHeldIdx)),
  );
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
  validate(
    v,
    matchVatstoreGet(`vc.${mainHolderIdx}.sfoo`, mapRefValString(mainHeldIdx)),
  );
  validateUpdate(v, `vom.rc.${mapRef(mainHeldIdx)}`, '1', '0');
  validate(v, matchVatstoreSet(`vc.${mainHolderIdx}.sfoo`, nullValString));
  validateReturned(v, rp);
  if (postCheck) {
    validateRefCountCheck(v, mapRef(mainHeldIdx), rc);
    if (deleteMetadata) {
      validateDeleteMetadata(v, es, mainHeldIdx, 0);
    } else {
      validateExportStatusCheck(v, mapRef(mainHeldIdx), es);
    }
  }
  validateDone(v);
}

function validateDropStoredWithGCAndRetire(v, rp, postCheck, rc, es) {
  validate(
    v,
    matchVatstoreGet(`vc.${mainHolderIdx}.sfoo`, mapRefValString(mainHeldIdx)),
  );
  validateUpdate(v, `vom.rc.${mapRef(mainHeldIdx)}`, '1', '0');
  validate(v, matchVatstoreSet(`vc.${mainHolderIdx}.sfoo`, nullValString));
  validateReturned(v, rp);
  if (postCheck) {
    validateRefCountCheck(v, mapRef(mainHeldIdx), rc);
    validateDeleteMetadata(v, es, mainHeldIdx, 0);
  }
  validate(v, matchRetireExports(mapRef(mainHeldIdx)));
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
  validate(v, matchVatstoreGet(`vom.es.${mapRef(idx)}`, NONE));
  validate(v, matchVatstoreSet(`vom.es.${mapRef(idx)}`, 'r'));
  validate(v, matchResolveOne(rp, mapRefVal(idx)));
  validateDone(v);
}

function validateImportAndHold(v, rp, idx) {
  if (idx !== NONE) {
    validate(v, matchVatstoreGet(`vc.${idx}.|schemata`, anySchema));
    validate(v, matchVatstoreGet(`vc.${idx}.|label`, `store #${idx}`));
  }
  validateReturned(v, rp);
  if (idx === NONE) {
    validate(v, matchVatstoreSet('idCounters'));
  }
  validateDone(v);
}

function validateDropHeldWithGC(v, rp, rc, es) {
  validateReturned(v, rp);
  validateRefCountCheck(v, mapRef(mainHeldIdx), rc);
  validateDeleteMetadata(v, es, mainHeldIdx, 0);
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
  validate(v, matchVatstoreGet('idCounters', NONE));
  validate(v, matchVatstoreGet('storeKindIDTable', NONE));
  validate(
    v,
    matchVatstoreSet(
      'storeKindIDTable',
      '{"scalarMapStore":1,"scalarWeakMapStore":2,"scalarSetStore":3,"scalarWeakSetStore":4,"scalarDurableMapStore":5,"scalarDurableWeakMapStore":6,"scalarDurableSetStore":7,"scalarDurableWeakSetStore":8}',
    ),
  );
  validate(v, matchVatstoreGet('baggageID', NONE));
  validateCreateBaggage(v, 1);
  validateCreateHolder(v, 2);
}

function validateDropHeld(v, rp, rc, es) {
  validateReturned(v, rp);
  validate(v, matchVatstoreGet(`vom.rc.${mapRef(mainHeldIdx)}`, rc));
  validate(v, matchVatstoreGet(`vom.es.${mapRef(mainHeldIdx)}`, es));
  validateDone(v);
}

function validateDropHeldWithGCAndRetire(v, rp) {
  validateReturned(v, rp);
  validateRefCountCheck(v, mapRef(mainHeldIdx), NONE);
  validateDeleteMetadata(v, 's', mainHeldIdx, 0);
  validate(v, matchRetireExports(mapRef(mainHeldIdx)));
  validateDone(v);
}

function validateDropExports(v, idx, rc) {
  validate(v, matchVatstoreGet(`vom.es.${mapRef(idx)}`, 'r'));
  validate(v, matchVatstoreSet(`vom.es.${mapRef(idx)}`, 's'));
  validate(v, matchVatstoreGet(`vom.rc.${mapRef(idx)}`, rc));
  validateDone(v);
}

function validateDropExportsWithGCAndRetire(v, idx, rc) {
  validate(v, matchVatstoreGet(`vom.es.${mapRef(idx)}`, 'r'));
  validate(v, matchVatstoreSet(`vom.es.${mapRef(idx)}`, 's'));
  validate(v, matchVatstoreGet(`vom.rc.${mapRef(idx)}`, rc));
  validateRefCountCheck(v, mapRef(mainHeldIdx), rc);
  validateDeleteMetadata(v, 's', mainHeldIdx, 0);
  validate(v, matchRetireExports(mapRef(mainHeldIdx)));
  validateDone(v);
}

function validateRetireExports(v, idx) {
  validate(v, matchVatstoreGet(`vom.es.${mapRef(idx)}`, 's'));
  validate(v, matchVatstoreDelete(`vom.es.${mapRef(idx)}`));
  validateDone(v);
}

// NOTE: these tests must be run serially, since they share a heap and garbage
// collection during one test can interfere with the deterministic behavior of a
// different test.

// test 1: lerv -> Lerv -> LerV -> Lerv -> lerv
test.serial('store lifecycle 1', async t => {
  const { v, dispatchMessage } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    true,
  );
  validateInit(v);

  // lerv -> Lerv  Create store
  let rp = await dispatchMessage('makeAndHold');
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
  const { v, dispatchMessage, dispatchDropExports, dispatchRetireExports } =
    await setupTestLiveslots(t, buildRootObject, 'bob', true);

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
  validateFetchAndHold(v, rp, mainHeldIdx);

  // LerV -> LERV  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld');
  validateExportHeld(v, rp, mainHeldIdx);

  // LERV -> lERV  Drop the in-memory reference again, but it's still exported and virtual referenced
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp, '1', 'r');

  // lERV -> LERV  Reread from storage, all three legs again
  rp = await dispatchMessage('fetchAndHold');
  validateFetchAndHold(v, rp, mainHeldIdx);

  // LERV -> lERV  Drop in-memory reference (stepping stone to other states)
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp, '1', 'r');

  // lERV -> LERV  Reintroduce the in-memory reference via message
  rp = await dispatchMessage('importAndHold', mapRefArg(mainHeldIdx));
  validateImportAndHold(v, rp, mainHeldIdx);

  // LERV -> lERV  Drop in-memory reference
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp, '1', 'r');

  // lERV -> leRV  Drop the export
  await dispatchDropExports(mapRef(mainHeldIdx));
  validateDropExports(v, mainHeldIdx, '1');

  // leRV -> LeRV  Fetch from storage
  rp = await dispatchMessage('fetchAndHold');
  validateFetchAndHold(v, rp, mainHeldIdx);

  // LeRV -> leRV  Forget about it *again*
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp, '1', 's');

  // leRV -> LeRV  Fetch from storage *again*
  rp = await dispatchMessage('fetchAndHold');
  validateFetchAndHold(v, rp, mainHeldIdx);

  // LeRV -> LerV  Retire the export
  await dispatchRetireExports(mapRef(mainHeldIdx));
  validateRetireExports(v, mainHeldIdx);
});

// test 3: lerv -> Lerv -> LerV -> LERV -> LeRV -> leRV -> lerV -> lerv
test.serial('store lifecycle 3', async t => {
  const { v, dispatchMessage, dispatchDropExports, dispatchRetireExports } =
    await setupTestLiveslots(t, buildRootObject, 'bob', true);

  // lerv -> Lerv  Create store
  let rp = await dispatchMessage('makeAndHold');
  validateInit(v);
  validateMakeAndHold(v, rp);

  // Lerv -> LerV  Store store reference virtually (permanent for now)
  rp = await dispatchMessage('storeHeld');
  validateStoreHeld(v, rp, NONE, '1');

  // LerV -> LERV  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld');
  validateExportHeld(v, rp, mainHeldIdx);

  // LERV -> LeRV  Drop the export
  await dispatchDropExports(mapRef(mainHeldIdx));
  validateDropExports(v, mainHeldIdx, '1');

  // LeRV -> leRV  Drop in-memory reference
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp, '1', 's');

  // leRV -> lerV  Retire the export
  await dispatchRetireExports(mapRef(mainHeldIdx));
  validateRetireExports(v, mainHeldIdx);

  // lerV -> lerv  Drop stored reference (gc and retire)
  rp = await dispatchMessage('dropStored');
  validateDropStored(v, rp, true, '0', NONE, true);
});

// test 4: lerv -> Lerv -> LERv -> LeRv -> lerv
test.serial('store lifecycle 4', async t => {
  const { v, dispatchMessage, dispatchDropExports } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    true,
  );

  // lerv -> Lerv  Create store
  let rp = await dispatchMessage('makeAndHold');
  validateInit(v);
  validateMakeAndHold(v, rp);

  // Lerv -> LERv  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld');
  validateExportHeld(v, rp, mainHeldIdx);

  // LERv -> LeRv  Drop the export
  await dispatchDropExports(mapRef(mainHeldIdx));
  validateDropExports(v, mainHeldIdx, NONE);

  // LeRv -> lerv  Drop in-memory reference (gc and retire)
  rp = await dispatchMessage('dropHeld');
  validateDropHeldWithGCAndRetire(v, rp);
});

// test 5: lerv -> Lerv -> LERv -> LeRv -> Lerv -> lerv
test.serial('store lifecycle 5', async t => {
  const { v, dispatchMessage, dispatchDropExports, dispatchRetireExports } =
    await setupTestLiveslots(t, buildRootObject, 'bob', true);

  // lerv -> Lerv  Create store
  let rp = await dispatchMessage('makeAndHold');
  validateInit(v);
  validateMakeAndHold(v, rp);

  // Lerv -> LERv  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld');
  validateExportHeld(v, rp, mainHeldIdx);

  // LERv -> LeRv  Drop the export
  await dispatchDropExports(mapRef(mainHeldIdx));
  validateDropExports(v, mainHeldIdx, NONE);

  // LeRv -> Lerv  Retire the export
  await dispatchRetireExports(mapRef(mainHeldIdx));
  validateRetireExports(v, mainHeldIdx);

  // Lerv -> lerv  Drop in-memory reference, unreferenced store gets GC'd
  rp = await dispatchMessage('dropHeld');
  validateDropHeldWithGC(v, rp, NONE, NONE);
});

// test 6: lerv -> Lerv -> LERv -> LeRv -> LeRV -> LeRv -> LeRV -> leRV -> lerv
test.serial('store lifecycle 6', async t => {
  const { v, dispatchMessage, dispatchDropExports } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    true,
  );

  // lerv -> Lerv  Create store
  let rp = await dispatchMessage('makeAndHold');
  validateInit(v);
  validateMakeAndHold(v, rp);

  // Lerv -> LERv  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld');
  validateExportHeld(v, rp, mainHeldIdx);

  // LERv -> LeRv  Drop the export
  await dispatchDropExports(mapRef(mainHeldIdx));
  validateDropExports(v, mainHeldIdx, NONE);

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
  validateDropHeld(v, rp, '1', 's');

  // leRV -> lerv  Drop stored reference (gc and retire)
  rp = await dispatchMessage('dropStored');
  validateDropStoredWithGCAndRetire(v, rp, true, '0', 's');
});

// test 7: lerv -> Lerv -> LERv -> lERv -> LERv -> lERv -> lerv
test.serial('store lifecycle 7', async t => {
  const { v, dispatchMessage, dispatchDropExports } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    true,
  );

  // lerv -> Lerv  Create store
  let rp = await dispatchMessage('makeAndHold');
  validateInit(v);
  validateMakeAndHold(v, rp);

  // Lerv -> LERv  Export the reference, now all three legs hold it
  rp = await dispatchMessage('exportHeld');
  validateExportHeld(v, rp, mainHeldIdx);

  // LERv -> lERv  Drop in-memory reference, no GC because exported
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp, NONE, 'r');

  // lERv -> LERv  Reintroduce the in-memory reference via message
  rp = await dispatchMessage('importAndHold', mapRefArg(mainHeldIdx));
  validateImportAndHold(v, rp, mainHeldIdx);

  // LERv -> lERv  Drop in-memory reference again, still no GC because exported
  rp = await dispatchMessage('dropHeld');
  validateDropHeld(v, rp, NONE, 'r');

  // lERv -> lerv  Drop the export (gc and retire)
  rp = await dispatchDropExports(mapRef(mainHeldIdx));
  validateDropExportsWithGCAndRetire(v, mainHeldIdx, NONE);
});

// test 8: lerv -> Lerv -> LERv -> LERV -> LERv -> LERV -> lERV -> lERv -> lerv
test.serial('store lifecycle 8', async t => {
  const { v, dispatchMessage, dispatchDropExports } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    true,
  );

  // lerv -> Lerv  Create store
  let rp = await dispatchMessage('makeAndHold');
  validateInit(v);
  validateMakeAndHold(v, rp);

  // Lerv -> LERv  Export the reference
  rp = await dispatchMessage('exportHeld');
  validateExportHeld(v, rp, mainHeldIdx);

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
  validateDropHeld(v, rp, '1', 'r');

  // lERV -> lERv  Overwrite virtual reference
  rp = await dispatchMessage('dropStored');
  validateDropStored(v, rp, true, '0', 'r');

  // lERv -> lerv  Drop the export (gc and retire)
  rp = await dispatchDropExports(mapRef(mainHeldIdx));
  validateDropExportsWithGCAndRetire(v, mainHeldIdx, '0');
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
  validate(v, matchVatstoreSet('idCounters'));
  if (!nonVirtual) {
    validateRefCountCheck(v, contentRef, '3');
    if (checkES) {
      validateExportStatusCheck(v, contentRef, NONE);
    }
  }
  validateDone(v);
}

// prettier-ignore
test.serial('store refcount management 1', async t => {
  const { v, dispatchMessage } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    true,
  );

  let rp = await dispatchMessage('makeAndHold');
  validateInit(v);
  validateMakeAndHold(v, rp);

  rp = await dispatchMessage('prepareStore3');
  const base = mainHeldIdx + 1;
  validatePrepareStore3(v, rp, base, mapRef(mainHeldIdx), mapRefValString(mainHeldIdx), true);

  rp = await dispatchMessage('finishClearHolders');
  validate(v, matchVatstoreGet(`vc.${base}.sfoo`, mapRefValString(mainHeldIdx)));
  validateUpdate(v, `vom.rc.${mapRef(mainHeldIdx)}`, '3', '2');
  validate(v, matchVatstoreSet(`vc.${base}.sfoo`, nullValString));

  validate(v, matchVatstoreGet(`vc.${base + 1}.sfoo`, mapRefValString(mainHeldIdx)));
  validateUpdate(v, `vom.rc.${mapRef(mainHeldIdx)}`, '2', '1');
  validate(v, matchVatstoreSet(`vc.${base + 1}.sfoo`, nullValString));

  validate(v, matchVatstoreGet(`vc.${base + 2}.sfoo`, mapRefValString(mainHeldIdx)));
  validateUpdate(v, `vom.rc.${mapRef(mainHeldIdx)}`, '1', '0');
  validate(v, matchVatstoreSet(`vc.${base + 2}.sfoo`, nullValString));

  validateReturned(v, rp);
  validateRefCountCheck(v, mapRef(mainHeldIdx), '0');
  validateDeleteMetadata(v, NONE, mainHeldIdx, 0);
  validateDone(v);
});

// prettier-ignore
test.serial('store refcount management 2', async t => {
  const { v, dispatchMessage } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    true,
  );

  let rp = await dispatchMessage('makeAndHold');
  validateInit(v);
  validateMakeAndHold(v, rp);

  rp = await dispatchMessage('prepareStore3');
  const base = mainHeldIdx + 1;
  validatePrepareStore3(v, rp, base, mapRef(mainHeldIdx), mapRefValString(mainHeldIdx), true);

  rp = await dispatchMessage('finishDropHolders');
  validateReturned(v, rp);
  validateRefCountCheck(v, mapRef(base), NONE);
  validateDeleteMetadata(v, NONE, base, 1, mapRef(mainHeldIdx), 'mapStore', 3);

  validateRefCountCheck(v, mapRef(base + 1), NONE);
  validateDeleteMetadata(v, NONE, base + 1, 1, mapRef(mainHeldIdx), 'mapStore', 2);

  validateRefCountCheck(v, mapRef(base + 2), NONE);
  validateDeleteMetadata(v, NONE, base + 2, 1, mapRef(mainHeldIdx), 'mapStore', 1);

  validateRefCountCheck(v, mapRef(mainHeldIdx), '0', NONE);
  validateDeleteMetadata(v, NONE, mainHeldIdx, 0, NONE, NONE, 1);

  validateDone(v);
});

// prettier-ignore
test.serial('store refcount management 3', async t => {
  const { v, dispatchMessage } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    true,
  );

  let rp = await dispatchMessage('makeAndHold');
  validateInit(v);
  validateMakeAndHold(v, rp);

  rp = await dispatchMessage('prepareStoreLinked');
  const base = mainHeldIdx + 1;
  validateCreate(v, base);
  validate(v, matchVatstoreGet(`vc.${base}.sfoo`, NONE));
  validateUpdate(v, `vom.rc.${mapRef(3)}`, NONE, '1');
  validate(v, matchVatstoreSet(`vc.${base}.sfoo`, mapRefValString(3)));
  validate(v, matchVatstoreGet(`vc.${base}.|entryCount`, '0'));
  validate(v, matchVatstoreSet(`vc.${base}.|entryCount`, '1'));
  validateCreate(v, base + 1);
  validate(v, matchVatstoreGet(`vc.${base + 1}.sfoo`, NONE));
  validateUpdate(v, `vom.rc.${mapRef(base)}`, NONE, '1');
  validate(v, matchVatstoreSet(`vc.${base + 1}.sfoo`, mapRefValString(base)));
  validate(v, matchVatstoreGet(`vc.${base + 1}.|entryCount`, '0'));
  validate(v, matchVatstoreSet(`vc.${base + 1}.|entryCount`, '1'));
  validateCreate(v, base + 2);
  validate(v, matchVatstoreGet(`vc.${base + 2}.sfoo`, NONE));
  validateUpdate(v, `vom.rc.${mapRef(base + 1)}`, NONE, '1');
  validate(v, matchVatstoreSet(`vc.${base + 2}.sfoo`, mapRefValString(base + 1)));
  validate(v, matchVatstoreGet(`vc.${base + 2}.|entryCount`, '0'));
  validate(v, matchVatstoreSet(`vc.${base + 2}.|entryCount`, '1'));
  validateReturned(v, rp);
  validate(v, matchVatstoreSet('idCounters'));
  validateStatusCheck(v, mapRef(mainHeldIdx), '1', NONE);
  validateStatusCheck(v, mapRef(base), '1', NONE);
  validateStatusCheck(v, mapRef(base + 1), '1', NONE);
  validateDone(v);

  rp = await dispatchMessage('finishDropHolders');
  validateReturned(v, rp);
  validateRefCountCheck(v, mapRef(base + 2), NONE);
  validateDeleteMetadata(v, NONE, base + 2, 1, mapRef(base + 1), 'mapStore', 1);
  validateRefCountCheck(v, mapRef(base + 1), '0');
  validateDeleteMetadata(v, NONE, base + 1, 1, mapRef(base), 'mapStore', 1);
  validateRefCountCheck(v, mapRef(base), '0');
  validateDeleteMetadata(v, NONE, base, 1, mapRef(mainHeldIdx), 'mapStore', 1);
  validateRefCountCheck(v, mapRef(mainHeldIdx), '0');
  validateDeleteMetadata(v, NONE, mainHeldIdx, 0, NONE, NONE, 1);
  validateDone(v);
});

// prettier-ignore
test.serial('presence refcount management 1', async t => {
  const { v, dispatchMessage } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    true,
  );

  const base = mainHeldIdx;
  const presenceRef = 'o-5';

  let rp = await dispatchMessage('importAndHold', thingArg(presenceRef));
  validateInit(v);
  validateImportAndHold(v, rp);

  rp = await dispatchMessage('prepareStore3');
  validatePrepareStore3(v, rp, base, presenceRef, thingRefValString(presenceRef), false);

  rp = await dispatchMessage('finishClearHolders');
  validate(v, matchVatstoreGet(`vc.${base}.sfoo`, thingRefValString(presenceRef)));
  validateUpdate(v, `vom.rc.${presenceRef}`, '3', '2');
  validate(v, matchVatstoreSet(`vc.${base}.sfoo`, nullValString));

  validate(v, matchVatstoreGet(`vc.${base + 1}.sfoo`, thingRefValString(presenceRef)));
  validateUpdate(v, `vom.rc.${presenceRef}`, '2', '1');
  validate(v, matchVatstoreSet(`vc.${base + 1}.sfoo`, nullValString));

  validate(v, matchVatstoreGet(`vc.${base + 2}.sfoo`, thingRefValString(presenceRef)));
  validateUpdate(v, `vom.rc.${presenceRef}`, '1', '0');
  validate(v, matchVatstoreDelete(`vom.rc.${presenceRef}`));
  validate(v, matchVatstoreSet(`vc.${base + 2}.sfoo`, nullValString));

  validateReturned(v, rp);
  validateRefCountCheck(v, presenceRef, NONE);
  validate(v, matchDropImports(presenceRef));
  validate(v, matchRetireImports(presenceRef));
  validateDone(v);
});

// prettier-ignore
test.serial('presence refcount management 2', async t => {
  const { v, dispatchMessage } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    true,
  );

  const base = mainHeldIdx;
  const presenceRef = 'o-5';

  let rp = await dispatchMessage('importAndHold', thingArg(presenceRef));
  validateInit(v);
  validateImportAndHold(v, rp);

  rp = await dispatchMessage('prepareStore3');
  validatePrepareStore3(v, rp, 3, presenceRef, thingRefValString(presenceRef), false);

  rp = await dispatchMessage('finishDropHolders');
  validateReturned(v, rp);
  validateRefCountCheck(v, mapRef(base), NONE);
  validateDeleteMetadata(v, NONE, base, 1, presenceRef, 'thing', 3);
  validateRefCountCheck(v, mapRef(base + 1), NONE);
  validateDeleteMetadata(v, NONE, base + 1, 1, presenceRef, 'thing', 2);
  validateRefCountCheck(v, mapRef(base + 2), NONE);
  validateDeleteMetadata(v, NONE, base + 2, 1, presenceRef, 'thing', 1);

  validate(v, matchVatstoreGet(`vom.rc.${presenceRef}`, NONE));
  validate(v, matchDropImports(presenceRef));
  validate(v, matchRetireImports(presenceRef));
  validateDone(v);
});

// prettier-ignore
test.serial('remotable refcount management 1', async t => {
  const { v, dispatchMessage } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    true,
  );

  const base = mainHeldIdx;
  const remotableRef = 'o+9';

  let rp = await dispatchMessage('makeAndHoldRemotable');
  validateInit(v);
  validateReturned(v, rp);
  validate(v, matchVatstoreSet('idCounters'));
  validateDone(v);

  rp = await dispatchMessage('prepareStore3');
  validatePrepareStore3(v, rp, base, remotableRef, thingRefValString(remotableRef), false, true);

  rp = await dispatchMessage('finishClearHolders');
  validate(v, matchVatstoreGet(`vc.${base}.sfoo`, refValString(remotableRef, 'thing')));
  validate(v, matchVatstoreSet(`vc.${base}.sfoo`, nullValString));
  validate(v, matchVatstoreGet(`vc.${base + 1}.sfoo`, refValString(remotableRef, 'thing')));
  validate(v, matchVatstoreSet(`vc.${base + 1}.sfoo`, nullValString));
  validate(v, matchVatstoreGet(`vc.${base + 2}.sfoo`, refValString(remotableRef, 'thing')));
  validate(v, matchVatstoreSet(`vc.${base + 2}.sfoo`, nullValString));
  validateReturned(v, rp);
  validateDone(v);
});

// prettier-ignore
test.serial('remotable refcount management 2', async t => {
  const { v, dispatchMessage } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    true,
  );

  const base = mainHeldIdx;
  const remotableRef = 'o+9';

  let rp = await dispatchMessage('makeAndHoldRemotable');
  validateInit(v);
  validateReturned(v, rp);
  validate(v, matchVatstoreSet('idCounters'));
  validateDone(v);

  rp = await dispatchMessage('prepareStore3');
  validatePrepareStore3(v, rp, base, remotableRef, thingRefValString(remotableRef), false, true);

  rp = await dispatchMessage('finishDropHolders');
  validateReturned(v, rp);
  validateRefCountCheck(v, mapRef(base), NONE);
  validateDeleteMetadata(v, NONE, base, 1, remotableRef, 'thing', 3, true);
  validateRefCountCheck(v, mapRef(base + 1), NONE);
  validateDeleteMetadata(v, NONE, base + 1, 1, remotableRef, 'thing', 2, true);
  validateRefCountCheck(v, mapRef(base + 2), NONE);
  validateDeleteMetadata(v, NONE, base + 2, 1, remotableRef, 'thing', 1, true);
  validateDone(v);
});

// prettier-ignore
test.serial('verify store weak key GC', async t => {
  const { v, dispatchMessage, testHooks } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    true,
  );

  // Create a store to use as a key and hold onto it weakly
  let rp = await dispatchMessage('makeAndHoldAndKey');
  validateInit(v);
  const mapID = 3;
  validateCreateStore(v, mapID, true); // map
  const setID = 4;
  validateCreateStore(v, setID, true); // set
  const keyID = 5;
  validateCreateStore(v, keyID); // key

  const ordinalKey = `r0000000001:${mapRef(keyID)}`;

  validate(v, matchVatstoreGet(`vc.${mapID}.|${mapRef(keyID)}`, NONE));
  validate(v, matchVatstoreGet(`vc.${mapID}.|nextOrdinal`, '1'));
  validate(v, matchVatstoreSet(`vc.${mapID}.|${mapRef(keyID)}`, '1'));
  validate(v, matchVatstoreSet(`vc.${mapID}.|nextOrdinal`, '2'));
  validate(v, matchVatstoreGet(`vc.${mapID}.|${mapRef(keyID)}`, '1'));
  validate(
    v,
    matchVatstoreSet(`vc.${mapID}.${ordinalKey}`, stringValString('arbitrary')),
  );

  validate(v, matchVatstoreGet(`vc.${setID}.|${mapRef(keyID)}`, NONE));
  validate(v, matchVatstoreGet(`vc.${setID}.|nextOrdinal`, '1'));
  validate(v, matchVatstoreSet(`vc.${setID}.|${mapRef(keyID)}`, '1'));
  validate(v, matchVatstoreSet(`vc.${setID}.|nextOrdinal`, '2'));
  validate(v, matchVatstoreGet(`vc.${setID}.|${mapRef(keyID)}`, '1'));
  validate(v, matchVatstoreSet(`vc.${setID}.${ordinalKey}`, nullValString));
  validateReturned(v, rp);
  validate(v, matchVatstoreSet('idCounters'));
  validateDone(v);

  t.is(testHooks.countCollectionsForWeakKey(mapRef(keyID)), 2);
  t.is(testHooks.storeSizeInternal(mapRef(mapID)), 1);
  validate(
    v,
    matchVatstoreGetAfter('', `vc.${mapID}.`, `vc.${mapID}.{`, [
      `vc.${mapID}.${ordinalKey}`,
      stringValString('arbitrary'),
    ]),
  );
  validate(
    v,
    matchVatstoreGetAfter(`vc.${mapID}.${ordinalKey}`, `vc.${mapID}.`, `vc.${mapID}.{`, DONE),
  );
  t.is(testHooks.storeSizeInternal(mapRef(setID)), 1);
  validate(
    v,
    matchVatstoreGetAfter('', `vc.${setID}.`, `vc.${setID}.{`, [
      `vc.${setID}.${ordinalKey}`,
      nullValString,
    ]),
  );
  validate(
    v,
    matchVatstoreGetAfter(`vc.${setID}.${ordinalKey}`, `vc.${setID}.`, `vc.${setID}.{`, DONE),
  );
  validateDone(v);

  // Drop in-memory reference, GC should cause weak entries to disappear
  rp = await dispatchMessage('dropHeld');
  validateReturned(v, rp);
  validateStatusCheck(v, mapRef(keyID), NONE, NONE);
  validateDeleteMetadataOnly(v, keyID, 0, NONE, NONE, 47, false);
  validate(v, matchVatstoreGet(`vc.${mapID}.|${mapRef(keyID)}`, '1'));
  validate(v, matchVatstoreDelete(`vc.${mapID}.|${mapRef(keyID)}`));
  validate(v, matchVatstoreDelete(`vc.${mapID}.${ordinalKey}`));
  validate(v, matchVatstoreGet(`vc.${setID}.|${mapRef(keyID)}`, '1'));
  validate(v, matchVatstoreDelete(`vc.${setID}.|${mapRef(keyID)}`));
  validate(v, matchVatstoreDelete(`vc.${setID}.${ordinalKey}`));

  t.is(testHooks.countCollectionsForWeakKey(mapRef(keyID)), 0);
  t.is(testHooks.storeSizeInternal(mapRef(mapID)), 0);
  validate(v, matchVatstoreGetAfter('', `vc.${mapID}.`, `vc.${mapID}.{`, DONE));
  t.is(testHooks.storeSizeInternal(mapRef(setID)), 0);
  validate(v, matchVatstoreGetAfter('', `vc.${setID}.`, `vc.${setID}.{`, DONE));
  validateDone(v);
});

// prettier-ignore
test.serial('verify presence weak key GC', async t => {
  const { v, dispatchMessage, dispatchRetireImports, testHooks } =
    await setupTestLiveslots(t, buildRootObject, 'bob', true);

  const presenceRef = 'o-5';

  // Import a presence to use as a key and hold onto it weakly
  let rp = await dispatchMessage('importAndHoldAndKey', thingArg(presenceRef));
  validateInit(v);
  const mapID = 3;
  validateCreateStore(v, mapID, true); // map
  const setID = 4;
  validateCreateStore(v, setID, true); // set

  const ordinalKey = `r0000000001:${presenceRef}`;

  validate(v, matchVatstoreGet(`vc.${mapID}.|${presenceRef}`, NONE));
  validate(v, matchVatstoreGet(`vc.${mapID}.|nextOrdinal`, '1'));
  validate(v, matchVatstoreSet(`vc.${mapID}.|${presenceRef}`, '1'));
  validate(v, matchVatstoreSet(`vc.${mapID}.|nextOrdinal`, '2'));
  validate(v, matchVatstoreGet(`vc.${mapID}.|${presenceRef}`, '1'));
  validate(
    v,
    matchVatstoreSet(`vc.${mapID}.${ordinalKey}`, stringValString('arbitrary')),
  );

  validate(v, matchVatstoreGet(`vc.${setID}.|${presenceRef}`, NONE));
  validate(v, matchVatstoreGet(`vc.${setID}.|nextOrdinal`, '1'));
  validate(v, matchVatstoreSet(`vc.${setID}.|${presenceRef}`, '1'));
  validate(v, matchVatstoreSet(`vc.${setID}.|nextOrdinal`, '2'));
  validate(v, matchVatstoreGet(`vc.${setID}.|${presenceRef}`, '1'));
  validate(v, matchVatstoreSet(`vc.${setID}.${ordinalKey}`, nullValString));
  validateReturned(v, rp);
  validate(v, matchVatstoreSet('idCounters'));

  t.is(testHooks.countCollectionsForWeakKey(presenceRef), 2);
  t.is(testHooks.storeSizeInternal(mapRef(mapID)), 1);
  validate(
    v,
    matchVatstoreGetAfter('', `vc.${mapID}.`, `vc.${mapID}.{`, [
      `vc.${mapID}.${ordinalKey}`,
      stringValString('arbitrary'),
    ]),
  );
  validate(
    v,
    matchVatstoreGetAfter(`vc.${mapID}.${ordinalKey}`, `vc.${mapID}.`, `vc.${mapID}.{`, DONE),
  );
  t.is(testHooks.storeSizeInternal(mapRef(setID)), 1);
  validate(
    v,
    matchVatstoreGetAfter('', `vc.${setID}.`, `vc.${setID}.{`, [
      `vc.${setID}.${ordinalKey}`,
      nullValString,
    ]),
  );
  validate(
    v,
    matchVatstoreGetAfter(`vc.${setID}.${ordinalKey}`, `vc.${setID}.`, `vc.${setID}.{`, DONE),
  );
  validateDone(v);

  rp = await dispatchMessage('dropHeld');
  validateReturned(v, rp);
  validate(v, matchVatstoreGet(`vom.rc.${presenceRef}`));
  validate(v, matchDropImports(presenceRef));
  t.is(testHooks.countCollectionsForWeakKey(presenceRef), 2);
  t.is(testHooks.storeSizeInternal(mapRef(mapID)), 1);
  validate(
    v,
    matchVatstoreGetAfter('', `vc.${mapID}.`, `vc.${mapID}.{`, [
      `vc.${mapID}.${ordinalKey}`,
      stringValString('arbitrary'),
    ]),
  );
  validate(
    v,
    matchVatstoreGetAfter(`vc.${mapID}.${ordinalKey}`, `vc.${mapID}.`, `vc.${mapID}.{`, DONE),
  );
  t.is(testHooks.storeSizeInternal(mapRef(setID)), 1);
  validate(
    v,
    matchVatstoreGetAfter('', `vc.${setID}.`, `vc.${setID}.{`, [
      `vc.${setID}.${ordinalKey}`,
      nullValString,
    ]),
  );
  validate(
    v,
    matchVatstoreGetAfter(`vc.${setID}.${ordinalKey}`, `vc.${setID}.`, `vc.${setID}.{`, DONE),
  );
  validateDone(v);

  await dispatchRetireImports(presenceRef);
  validate(v, matchVatstoreGet(`vc.${mapID}.|${presenceRef}`, '1'));
  validate(v, matchVatstoreDelete(`vc.${mapID}.|${presenceRef}`));
  validate(v, matchVatstoreDelete(`vc.${mapID}.${ordinalKey}`));
  validate(v, matchVatstoreGet(`vc.${setID}.|${presenceRef}`, '1'));
  validate(v, matchVatstoreDelete(`vc.${setID}.|${presenceRef}`));
  validate(v, matchVatstoreDelete(`vc.${setID}.${ordinalKey}`));
  validateRefCountCheck(v, presenceRef, NONE);
  validate(v, matchDropImports(presenceRef));
  validate(v, matchRetireImports(presenceRef));
  validateDone(v);

  t.is(testHooks.countCollectionsForWeakKey(presenceRef), 0);
  t.is(testHooks.storeSizeInternal(mapRef(mapID)), 0);
  validate(v, matchVatstoreGetAfter('', `vc.${mapID}.`, `vc.${mapID}.{`, DONE));
  t.is(testHooks.storeSizeInternal(mapRef(setID)), 0);
  validate(v, matchVatstoreGetAfter('', `vc.${setID}.`, `vc.${setID}.{`, DONE));
  validateDone(v);
});
