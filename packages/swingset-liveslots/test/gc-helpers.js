import { Far } from '@endo/marshal';
import { M } from '@agoric/store';
import { kslot, kser } from '@agoric/kmarshal';
import { parseVatSlot } from '../src/parseVatSlots.js';

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
      keyShape: M.any(),
    });
    nextStoreNumber += 1;
    return result;
  }

  function makeWeakMapStore() {
    const result = makeScalarBigWeakMapStore(`store #${nextStoreNumber}`, {
      keyShape: M.any(),
    });
    nextStoreNumber += 1;
    return result;
  }

  function makeWeakSetStore() {
    const result = makeScalarBigWeakSetStore(`store #${nextStoreNumber}`, {
      keyShape: M.any(),
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
      let holder = makeHolder(heldStore); // Map7->Map6
      holder = makeHolder(holder); // Map8->Map7
      holder = makeHolder(holder); // Map9->Map8
      holders.push(holder); // RAM->Map9
      heldStore = null; // remove RAM->Map6
    },
    noOp() {
      // used when an extra cycle is needed to pump GC
    },
  });
}

export function deduceCollectionID(fakestore, ctype, offset) {
  const kindIDs = JSON.parse(fakestore.get('storeKindIDTable'));
  const nextCollectionID = JSON.parse(fakestore.get(`idCounters`)).collectionID;
  const kindID = kindIDs[ctype];
  assert(kindID);
  const collectionID = nextCollectionID - offset;
  const vref = `o+v${kindID}/${collectionID}`;
  return [collectionID, vref];
}

export function refVal(vref, type) {
  return kser(kslot(vref, type));
}

export function refValString(vref, type) {
  return JSON.stringify(refVal(vref, type));
}

export function mapRef(idx) {
  return `o+v2/${idx}`; // see 'assert known scalarMapStore ID' below
}

// return an iterator of all existing keys that start with 'prefix'
// (excluding the prefix itself)

export function* enumerateKeysWithPrefix(fakestore, prefix) {
  const keys = [...fakestore.keys()];
  keys.sort();
  for (const key of keys) {
    if (key.startsWith(prefix)) {
      yield key;
    }
  }
}
harden(enumerateKeysWithPrefix);

export function recognizersOf(v, baseref) {
  // the | is followed by the collectionID that can recognize baseref
  const keys = [...enumerateKeysWithPrefix(v.fakestore, `vom.ir.${baseref}|`)];
  const collections = keys.map(key => key.split('|')[1]);
  return collections;
}

export function assertCollectionDeleted(v, baseref) {
  // baseref is like o+2/8 , where o+2 is a type (BigWeakMapStore),
  // and 8 is the collectionID
  const { subid: cID } = parseVatSlot(baseref);
  const { t, fakestore } = v;
  t.is(fakestore.get(`vom.rc.${baseref}`), undefined);
  t.is(fakestore.get(`vc.${cID}.|schemata`), undefined);
  t.is(fakestore.get(`vc.${cID}.|nextOrdinal`), undefined);
  // there should be no ordinal mappings: vc.${cid}.|${vref}
  t.deepEqual([...enumerateKeysWithPrefix(fakestore, `vc.${cID}.|`)], []);
  // in fact there should be no entries at all
  t.deepEqual([...enumerateKeysWithPrefix(fakestore, `vc.${cID}.`)], []);

  // and there should be no recognizers of the baseref left
  t.deepEqual(
    [...enumerateKeysWithPrefix(fakestore, `vom.ir.${baseref}|`)],
    [],
  );
}
