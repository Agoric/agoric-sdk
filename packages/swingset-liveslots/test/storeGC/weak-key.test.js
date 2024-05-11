import test from 'ava';

import { kslot } from '@agoric/kmarshal';
import { setupTestLiveslots } from '../liveslots-helpers.js';
import {
  buildRootObject,
  refValString,
  assertCollectionDeleted,
  deduceCollectionID,
} from '../gc-helpers.js';
import { vstr } from '../util.js';

// These tests follow the model described in test-virtualObjectGC.js

// NOTE: these tests must be run serially, since they share a heap and garbage
// collection during one test can interfere with the deterministic behavior of a
// different test.

// prettier-ignore
test.serial('verify store weak key GC', async t => {
  const { v, dispatchMessage, testHooks } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    { forceGC: true },
  );
  const { fakestore } = v;

  // Create a store to use as a key and hold onto it weakly. We
  // inspect the syscalls to make sure we're getting the right vrefs
  // for later.
  await dispatchMessage('makeAndHoldAndKey');
  // the new store is the last one created, and it's a scalarMapStore
  // (not durable, not weak)
  const [ _storeID, vref ] = deduceCollectionID(fakestore, 'scalarMapStore', 1);

  // the WeakSet is the previous one created, and the WeakMap just before it
  const [ setID, setVref ] = deduceCollectionID(fakestore, 'scalarWeakSetStore', 2);
  const [ mapID, mapVref ] = deduceCollectionID(fakestore, 'scalarWeakMapStore', 3);

  // WeakMap6[Map8] = 'arbitrary' , WeakSet7[Map8] exists

  // weakmap.init(held, 'arbitrary')
  // weakset.add(held)

  // confirm that Map8 was assigned the first ordinal in WeakMap6/WeakSet7
  t.is(fakestore.get(`vc.${mapID}.|${vref}`), '1');
  t.is(fakestore.get(`vc.${mapID}.|nextOrdinal`), '2');
  t.is(fakestore.get(`vc.${setID}.|${vref}`), '1');
  t.is(fakestore.get(`vc.${setID}.|nextOrdinal`), '2');
  // which means the dbKey will be:
  const ordinalKey = `r0000000001:${vref}`;
  t.is(fakestore.get(`vc.${mapID}.${ordinalKey}`), vstr('arbitrary'));
  t.is(fakestore.get(`vc.${setID}.${ordinalKey}`), vstr(null));

  // and there should be recognizer links
  t.is(fakestore.get(`vom.ir.${vref}|${mapID}`), '1');
  t.is(fakestore.get(`vom.ir.${vref}|${setID}`), '1');

  // at this point, 'held' should be referenced by two collections
  t.is(testHooks.countCollectionsForWeakKey(vref), 2);
  // and both collections should have a single entry ('held')
  t.is(testHooks.storeSizeInternal(mapVref), 1); // WeakMap6
  t.is(testHooks.storeSizeInternal(setVref), 1); // WeakSet7

  // Drop in-memory reference, GC should cause weak entries to disappear
  await dispatchMessage('dropHeld'); // drops Map8 Representative

  // the full sequence is:
  // * finalizer(held) pushes vref onto possiblyDeadSet
  // * BOYD calls vrm.isVirtualObjectReachable
  // * that checks vdata refcount and export status (vstore reads)
  // * concludes no pillars are remaining, initiates deletion
  // * BOYD calls vrm.deleteVirtualObject
  //   * dVO uses deleteStoredRepresentation() to delete vobj data
  //     * 'held' is empty, so has no vobj data to delete
  //   * vom.(rc.es).${baseRef} keys deleted (refcount/export-status trackers)
  //   * ceaseRecognition() is called, then dVO returns
  // * cR removes from all voAwareWeakMap/Sets (none)
  // * cR walks vom.ir.${vref}|XX to find weak-store recognizers
  //   * this finds both our WeakSet and our WeakMap
  //   * for each, first delete vom.ir.${vref}|XX
  //   * then call deleteCollectionEntry() to remove entry from weak store
  //     * dCE is in collectionManager.js
  //     * dCE does 'get' to convert vref into per-collection ordinal
  //     * then deletes that mapping (vatstoreDelete)
  //     * then uses the ordinal to fetch the weak store's value
  //     * then calls vrm.removeReachableVref on each slot in the value
  //       * rRV does decRefCount on the slot
  //       * that does a vatstoreGet, then either a Set or Delete
  //       * when the refcount hits zero: addToPossiblyDeadSet
  //     * dCE finally calls vatstoreDelete on the weak store's entry

  // but all we really care about is that the WeakMap/WeakSet entries
  // are deleted

  // nothing still references the dead 'held'
  t.is(testHooks.countCollectionsForWeakKey(vref), 0); // Map8
  // both the WeakMap and WeakSet have zero entries
  t.is(testHooks.storeSizeInternal(mapVref), 0); // WeakMap6
  t.is(testHooks.storeSizeInternal(setVref), 0); // WeakSet7
  assertCollectionDeleted(v, vref);
});

// prettier-ignore
test.serial('verify weakly held value GC', async t => {
  const { v, dispatchMessage, testHooks } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    { forceGC: true },
  );
  const { fakestore } = v;

  // Create a weak store, and put a weakly held object into it
  await dispatchMessage('makeAndHoldWeakly');
  // aWeakMapStore[heldStore] = indirValue

  // 'indirValue' is the last one created, and it's a scalarMapStore
  // (not durable, not weak)
  const [ _, indirVref ] = deduceCollectionID(fakestore, 'scalarMapStore', 1);
  // 'heldStore' was just before that, and `aWeakMapStore` before it
  const [ _heldID, heldVref ] = deduceCollectionID(fakestore, 'scalarMapStore', 2);
  const [ weakmapID, weakmapVref ] = deduceCollectionID(fakestore, 'scalarWeakMapStore', 3);

  // confirm that 'heldStore' is given the first ordinal in aWeakMapStore
  t.is(fakestore.get(`vc.${weakmapID}.|${heldVref}`), '1');
  t.is(fakestore.get(`vc.${weakmapID}.|nextOrdinal`), '2');
  // which means the dbKey will be:
  const ordinalKey = `r0000000001:${heldVref}`;
  t.is(fakestore.get(`vc.${weakmapID}.${ordinalKey}`),
       refValString(indirVref, 'mapStore'));

  // Drop in-memory reference to heldStore, GC should cause the
  // heldStore->indirValue entry to disappear
  await dispatchMessage('dropHeld');

  // now heldStore should be dropped, and nothing should reference it
  assertCollectionDeleted(v, heldVref);
  t.is(testHooks.countCollectionsForWeakKey(heldVref), 0);

  // aWeakMapStore should be empty, and indirValue should be dropped
  t.is(testHooks.storeSizeInternal(weakmapVref), 0);
  assertCollectionDeleted(v, indirVref);
});

// prettier-ignore
test.serial('verify presence weak key GC', async t => {
  const { v, dispatchMessage, dispatchRetireImports, testHooks } =
    await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const { fakestore } = v;

  const presenceRef = 'o-5'; // Presence5
  const presence = kslot(presenceRef, 'thing');

  // Import a presence to use as a key and hold onto it weakly
  await dispatchMessage('importAndHoldAndKey', presence);
  // aWeakMapStore[presence] = 'arbitrary'; aWeakSetStore[presence] exists

  const [ weaksetID, weaksetVref ] = deduceCollectionID(fakestore, 'scalarWeakSetStore', 1);
  const [ weakmapID, weakmapVref ] = deduceCollectionID(fakestore, 'scalarWeakMapStore', 2);

  // confirm that Presence5 was given the first ordinal in aWeakMapStore
  t.is(fakestore.get(`vc.${weakmapID}.|${presenceRef}`), '1');
  t.is(fakestore.get(`vc.${weakmapID}.|nextOrdinal`), '2');
  // which means the dbKey will be
  const ordinalKey = `r0000000001:${presenceRef}`;
  t.is(fakestore.get(`vc.${weakmapID}.${ordinalKey}`), vstr('arbitrary'));

  // same for aWeakSetStore
  t.is(fakestore.get(`vc.${weaksetID}.|${presenceRef}`), '1');
  t.is(fakestore.get(`vc.${weaksetID}.|nextOrdinal`), '2');
  t.is(fakestore.get(`vc.${weaksetID}.${ordinalKey}`), vstr(null));

  // so both weakmap and weakset can recognize Presence5
  t.is(testHooks.countCollectionsForWeakKey(presenceRef), 2);
  t.is(testHooks.storeSizeInternal(weakmapVref), 1);
  t.is(testHooks.storeSizeInternal(weaksetVref), 1);

  // and there are two vom.ir recognizer links
  t.is(fakestore.get(`vom.ir.${presenceRef}|${weakmapID}`), '1');
  t.is(fakestore.get(`vom.ir.${presenceRef}|${weaksetID}`), '1');

  // now drop Presence5 from RAM, it becomes unreachable however the
  // vref remains recognizable until the kernel does retireImport
  await dispatchMessage('dropHeld');

  t.is(testHooks.countCollectionsForWeakKey(presenceRef), 2);
  t.is(testHooks.storeSizeInternal(weakmapVref), 1);
  t.is(testHooks.storeSizeInternal(weaksetVref), 1);
  t.is(fakestore.get(`vom.ir.${presenceRef}|${weakmapID}`), '1');
  t.is(fakestore.get(`vom.ir.${presenceRef}|${weaksetID}`), '1');

  // have the kernel our vat that the upstream vat has retired
  // Presence5, so any remaining recognizers (WeakMaps/Sets) should
  // drop their entries
  await dispatchRetireImports(presenceRef);

  // Presence5 should be forgotten
  // nothing should recognize it
  // size of WeakMap6 and WeakSet7 should be 0

  t.is(testHooks.countCollectionsForWeakKey(presenceRef), 0);
  t.is(testHooks.storeSizeInternal(weakmapVref), 0);
  t.is(testHooks.storeSizeInternal(weaksetVref), 0);
  t.is(fakestore.get(`vom.ir.${presenceRef}|${weakmapID}`), undefined);
  t.is(fakestore.get(`vom.ir.${presenceRef}|${weaksetID}`), undefined);
});
