// eslint-disable-next-line import/order

import { Far } from '@endo/marshal';
import { M } from '@agoric/store';
import {
  matchResolveOne,
  matchVatstoreGet,
  matchVatstoreGetAfter,
  matchVatstoreDelete,
  matchVatstoreSet,
  matchRetireExports,
  validate,
  validateDone,
  validateReturned,
} from './liveslots-helpers.js';
import { capargs } from './util.js';

// These tests follow the model described in
// ../virtualObjects/test-virtualObjectGC.js

let aWeakMapStore;
let aWeakSetStore;

export const mainHolderIdx = 5;
export const mainHeldIdx = 6;

export function buildRootObject(vatPowers) {
  const { VatData } = vatPowers;
  const {
    makeScalarBigMapStore,
    makeScalarBigWeakMapStore,
    makeScalarBigWeakSetStore,
  } = VatData;

  let nextStoreNumber = 5;
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
    makeAndHoldWeakly() {
      aWeakMapStore = makeWeakMapStore();
      heldStore = makeMapStore();
      const indirValue = makeMapStore();
      aWeakMapStore.init(heldStore, indirValue);
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

export const NONE = undefined;
export const DONE = [undefined, undefined];
export const anySchema = JSON.stringify(
  capargs([
    {
      '@qclass': 'tagged',
      tag: 'match:any',
      payload: { '@qclass': 'undefined' },
    },
  ]),
);

export const stringSchema = JSON.stringify(
  capargs([{ '@qclass': 'tagged', tag: 'match:kind', payload: 'string' }]),
);

export const anyScalarSchema = JSON.stringify(
  capargs([
    {
      '@qclass': 'tagged',
      tag: 'match:scalar',
      payload: { '@qclass': 'undefined' },
    },
  ]),
);

export function stringVal(str) {
  return {
    body: JSON.stringify(str),
    slots: [],
  };
}

export function stringValString(str) {
  return JSON.stringify(stringVal(str));
}

export function refVal(vref, type) {
  return {
    body: JSON.stringify({
      '@qclass': 'slot',
      iface: `Alleged: ${type}`,
      index: 0,
    }),
    slots: [vref],
  };
}

export function refValString(vref, type) {
  return JSON.stringify(refVal(vref, type));
}

export function refArg(vref, type) {
  return [{ '@qclass': 'slot', iface: `Alleged: ${type}`, index: 0 }, vref];
}

export function thingArg(vref) {
  return refArg(vref, 'thing');
}

export function thingRefValString(vref) {
  return refValString(vref, 'thing');
}

export const nullValString = JSON.stringify({ body: 'null', slots: [] });

export function mapRef(idx) {
  return `o+2/${idx}`; // see 'assert known scalarMapStore ID' below
}

export function mapRefArg(idx) {
  return refArg(mapRef(idx), 'mapStore');
}

export function mapRefVal(idx) {
  return refVal(mapRef(idx), 'mapStore');
}

export function mapRefValString(idx) {
  return refValString(mapRef(idx), 'mapStore');
}

export function validateRefCountCheck(v, vref, rc) {
  validate(v, matchVatstoreGet(`vom.rc.${vref}`, rc));
}

export function validateExportStatusCheck(v, vref, es) {
  validate(v, matchVatstoreGet(`vom.es.${vref}`, es));
}

export function validateStatusCheck(v, vref, rc, es) {
  validateRefCountCheck(v, vref, rc);
  validateExportStatusCheck(v, vref, es);
}

function validateCreateBuiltInNonDurableTable(v, idx, schema, label) {
  validate(v, matchVatstoreSet(`vc.${idx}.|nextOrdinal`, `1`));
  validate(v, matchVatstoreSet(`vc.${idx}.|entryCount`, `0`));
  validate(v, matchVatstoreSet(`vc.${idx}.|schemata`, schema));
  validate(v, matchVatstoreSet(`vc.${idx}.|label`, label));
}

function validateCreatePromiseRegistrationTable(v, idx) {
  validateCreateBuiltInNonDurableTable(
    v,
    idx,
    anyScalarSchema,
    'promiseRegistrations',
  );
}

export function validateCreateBuiltInTable(v, idx, idKey, schema, label) {
  validate(v, matchVatstoreGet(idKey, NONE));
  validate(v, matchVatstoreSet(`vc.${idx}.|nextOrdinal`, `1`));
  validate(v, matchVatstoreSet(`vc.${idx}.|entryCount`, `0`));
  validate(v, matchVatstoreSet(`vc.${idx}.|schemata`, schema));
  validate(v, matchVatstoreSet(`vc.${idx}.|label`, label));
  validate(v, matchVatstoreSet(idKey, `o+6/${idx}`));
  validate(v, matchVatstoreGet(`vom.rc.o+6/${idx}`, NONE));
  validate(v, matchVatstoreSet(`vom.rc.o+6/${idx}`, '1'));
}

export function validateCreatePromiseWatcherKindTable(v, idx) {
  validateCreateBuiltInTable(
    v,
    idx,
    'watcherTableID',
    anyScalarSchema,
    'promiseWatcherByKind',
  );
}

export function validateCreateWatchedPromiseTable(v, idx) {
  validateCreateBuiltInTable(
    v,
    idx,
    'watchedPromiseTableID',
    stringSchema,
    'watchedPromises',
  );
}

export function validateCreateBaggage(v, idx) {
  validateCreateBuiltInTable(v, idx, 'baggageID', stringSchema, 'baggage');
}

export function validateCreateBuiltInTables(v) {
  validateCreateBaggage(v, 1);
  validateCreatePromiseRegistrationTable(v, 2);
  validateCreatePromiseWatcherKindTable(v, 3);
  validateCreateWatchedPromiseTable(v, 4);
}

export function validateCreate(v, idx, isWeak = false) {
  validate(v, matchVatstoreSet(`vc.${idx}.|nextOrdinal`, `1`));
  if (!isWeak) {
    validate(v, matchVatstoreSet(`vc.${idx}.|entryCount`, `0`));
  }
  validate(v, matchVatstoreSet(`vc.${idx}.|schemata`, anySchema));
  validate(v, matchVatstoreSet(`vc.${idx}.|label`, `store #${idx}`));
}

export function validateCreateStore(v, idx, isWeak) {
  validateCreate(v, idx, isWeak);
}

export function validateUpdate(v, key, before, after) {
  validate(v, matchVatstoreGet(key, before));
  validate(v, matchVatstoreSet(key, after));
}

export function validateMakeAndHold(v, rp) {
  validateCreateStore(v, mainHeldIdx);
  validateReturned(v, rp);
  validate(v, matchVatstoreSet('idCounters'));
  validateDone(v);
}

export function validateStoreHeld(v, rp, rcBefore, rcAfter) {
  validate(v, matchVatstoreGet(`vc.${mainHolderIdx}.sfoo`, nullValString));
  validateUpdate(v, `vom.rc.${mapRef(mainHeldIdx)}`, rcBefore, rcAfter);
  validate(
    v,
    matchVatstoreSet(`vc.${mainHolderIdx}.sfoo`, mapRefValString(mainHeldIdx)),
  );
  validateReturned(v, rp);
  validateDone(v);
}

export function validateDeleteMetadataOnly(
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

export function validateWeakCheckEmpty(v, ref) {
  validate(v, matchVatstoreGetAfter('', `vom.ir.${ref}|`, NONE, [NONE, NONE]));
}

export function validateDeleteMetadata(
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
  validateWeakCheckEmpty(v, mapRef(idx));
}

export function validateDropStored(v, rp, postCheck, rc, es, deleteMetadata) {
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

export function validateDropStoredWithGCAndRetire(v, rp, postCheck, rc, es) {
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

export function validateFetchAndHold(v, rp, idx) {
  validate(
    v,
    matchVatstoreGet(`vc.${mainHolderIdx}.sfoo`, mapRefValString(idx)),
  );
  validate(v, matchVatstoreGet(`vc.${idx}.|schemata`, anySchema));
  validate(v, matchVatstoreGet(`vc.${idx}.|label`, `store #${idx}`));
  validateReturned(v, rp);
  validateDone(v);
}

export function validateExportHeld(v, rp, idx) {
  validate(v, matchVatstoreGet(`vom.es.${mapRef(idx)}`, NONE));
  validate(v, matchVatstoreSet(`vom.es.${mapRef(idx)}`, 'r'));
  validate(v, matchResolveOne(rp, mapRefVal(idx)));
  validateDone(v);
}

export function validateImportAndHold(v, rp, idx) {
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

export function validateDropHeldWithGC(v, rp, rc, es) {
  validateReturned(v, rp);
  validateRefCountCheck(v, mapRef(mainHeldIdx), rc);
  validateDeleteMetadata(v, es, mainHeldIdx, 0);
  validateDone(v);
}

export function validateCreateHolder(v, idx) {
  validateCreate(v, idx);
  validate(v, matchVatstoreGet(`vc.${idx}.sfoo`));
  validate(v, matchVatstoreSet(`vc.${idx}.sfoo`, nullValString));
  validate(v, matchVatstoreGet(`vc.${idx}.|entryCount`, '0'));
  validate(v, matchVatstoreSet(`vc.${idx}.|entryCount`, '1'));
}

export function validateInit(v) {
  validate(v, matchVatstoreGet('idCounters', NONE));
  validate(v, matchVatstoreGet('kindIDID', NONE));
  validate(v, matchVatstoreSet('kindIDID', '1'));
  validate(v, matchVatstoreGet('storeKindIDTable', NONE));
  validate(
    v,
    matchVatstoreSet(
      'storeKindIDTable',
      '{"scalarMapStore":2,"scalarWeakMapStore":3,"scalarSetStore":4,"scalarWeakSetStore":5,"scalarDurableMapStore":6,"scalarDurableWeakMapStore":7,"scalarDurableSetStore":8,"scalarDurableWeakSetStore":9}',
    ),
  );
  validateCreateBuiltInTables(v);
  validateCreateHolder(v, 5);

  validate(v, matchVatstoreGet('deadPromises', NONE));
  validate(v, matchVatstoreDelete('deadPromises'));
  validate(v, matchVatstoreGetAfter('', 'vc.4.', 'vc.4.{', [NONE, NONE]));
  validate(v, matchVatstoreGetAfter('', 'vom.dkind.', NONE, [NONE, NONE]));
}

export function validateDropHeld(v, rp, rc, es) {
  validateReturned(v, rp);
  validate(v, matchVatstoreGet(`vom.rc.${mapRef(mainHeldIdx)}`, rc));
  validate(v, matchVatstoreGet(`vom.es.${mapRef(mainHeldIdx)}`, es));
  validateDone(v);
}

export function validateDropHeldWithGCAndRetire(v, rp) {
  validateReturned(v, rp);
  validateRefCountCheck(v, mapRef(mainHeldIdx), NONE);
  validateDeleteMetadata(v, 's', mainHeldIdx, 0);
  validate(v, matchRetireExports(mapRef(mainHeldIdx)));
  validateDone(v);
}

export function validateDropExports(v, idx, rc) {
  validate(v, matchVatstoreGet(`vom.es.${mapRef(idx)}`, 'r'));
  validate(v, matchVatstoreSet(`vom.es.${mapRef(idx)}`, 's'));
  validate(v, matchVatstoreGet(`vom.rc.${mapRef(idx)}`, rc));
  validateDone(v);
}

export function validateDropExportsWithGCAndRetire(v, idx, rc) {
  validate(v, matchVatstoreGet(`vom.es.${mapRef(idx)}`, 'r'));
  validate(v, matchVatstoreSet(`vom.es.${mapRef(idx)}`, 's'));
  validate(v, matchVatstoreGet(`vom.rc.${mapRef(idx)}`, rc));
  validateRefCountCheck(v, mapRef(mainHeldIdx), rc);
  validateDeleteMetadata(v, 's', mainHeldIdx, 0);
  validate(v, matchRetireExports(mapRef(mainHeldIdx)));
  validateDone(v);
}

export function validateRetireExports(v, idx) {
  validate(v, matchVatstoreGet(`vom.es.${mapRef(idx)}`, 's'));
  validate(v, matchVatstoreDelete(`vom.es.${mapRef(idx)}`));
  validateDone(v);
}
