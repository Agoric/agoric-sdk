// @ts-nocheck
import test from 'ava';

import { kslot, kunser } from '@agoric/kmarshal';
import {
  setupTestLiveslots,
  findSyscallsByType,
} from '../liveslots-helpers.js';
import { buildRootObject, mainHeldIdx, mapRef } from '../gc-helpers.js';
import { parseVatSlot } from '../../src/parseVatSlots.js';

// These tests follow the model described in
// ../virtualObjects/test-virtualObjectGC.js

function getLastCollection(v) {
  // makeAndHold() uses makeScalarBigMapStore, and since we call it
  // early, it always gets "store #6", in vref o+2/6 (o+2 means
  // scalarMapStore, non-durable, and /6 means collectionID=6)
  const vref = 'o+v2/6';
  // double-check that at least the collectionID is right
  const { t, fakestore } = v;
  t.is(JSON.parse(fakestore.get('idCounters')).collectionID, 7); // last was 6
  return vref;
}

function assertState(v, vref, reachable, erv) {
  assert(erv[0] === 'E' || erv[0] === 'e');
  assert(erv[1] === 'R' || erv[1] === 'r');
  assert(erv[2] === 'V' || erv[2] === 'v');
  let exported = false;
  if (erv[1] === 'R') {
    exported = erv[0] === 'E' ? 'reachable' : 'recognizable';
  }
  const vdata = erv[2] === 'V';
  const { t, fakestore } = v;
  const get = key => fakestore.get(key);
  const getLabel = key => kunser(JSON.parse(get(key))).label;
  const { subid: cID } = parseVatSlot(vref);
  if (reachable) {
    t.is(getLabel(`vc.${cID}.|schemata`), 'store #6');
    t.truthy(fakestore.get(`vc.${cID}.|entryCount`)); // exists even if 0
    t.truthy(fakestore.get(`vc.${cID}.|nextOrdinal`));
    if (vdata) {
      t.is(fakestore.get(`vom.rc.${vref}`), `1`);
    } else {
      t.is(fakestore.get(`vom.rc.${vref}`), undefined);
    }
    if (exported === 'reachable') {
      t.is(fakestore.get(`vom.es.${vref}`), 'r');
    } else if (exported === 'recognizable') {
      t.is(fakestore.get(`vom.es.${vref}`), 's');
    } else {
      t.is(fakestore.get(`vom.es.${vref}`), undefined);
    }
  } else {
    t.is(fakestore.get(`vc.${cID}.|schemata`), undefined);
    t.is(fakestore.get(`vc.${cID}.|entryCount`), undefined);
    t.is(fakestore.get(`vc.${cID}.|nextOrdinal`), undefined);
    t.is(fakestore.get(`vom.rc.${vref}`), undefined);
    t.is(fakestore.get(`vom.es.${vref}`), undefined);
  }
}

// NOTE: these tests must be run serially, since they share a heap and garbage
// collection during one test can interfere with the deterministic behavior of a
// different test.

// test 1: lerv -> Lerv -> LerV -> Lerv -> lerv
test.serial('store lifecycle 1', async t => {
  const { v, dispatchMessageSuccessfully } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    { forceGC: true },
  );

  // lerv -> Lerv  Create store
  await dispatchMessageSuccessfully('makeAndHold');
  const vref = getLastCollection(v);
  assertState(v, vref, true, 'erv');

  // Lerv -> LerV  Store store reference virtually (in another store)
  await dispatchMessageSuccessfully('storeHeld');
  assertState(v, vref, true, 'erV');

  // LerV -> Lerv  Overwrite virtual reference
  await dispatchMessageSuccessfully('dropStored');
  assertState(v, vref, true, 'erv');

  // Lerv -> lerv  Drop in-memory reference, unreferenced store gets GC'd
  await dispatchMessageSuccessfully('dropHeld');
  assertState(v, vref, false, 'erv');
});

// test 2: lerv -> Lerv -> LerV -> lerV -> LerV -> LERV -> lERV -> LERV ->
//   lERV -> LERV -> lERV -> leRV -> LeRV -> leRV -> LeRV -> LerV
test.serial('store lifecycle 2', async t => {
  const {
    v,
    dispatchMessageSuccessfully,
    dispatchDropExports,
    dispatchRetireExports,
  } = await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });

  // lerv -> Lerv  Create store
  await dispatchMessageSuccessfully('makeAndHold');
  const vref = getLastCollection(v);
  assertState(v, vref, true, 'erv');

  // Lerv -> LerV  Store store reference virtually (in another store)
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
  await dispatchMessageSuccessfully(
    'importAndHold',
    kslot(mapRef(mainHeldIdx)),
  );
  assertState(v, vref, true, 'ERV');

  // LERV -> lERV  Drop in-memory reference
  await dispatchMessageSuccessfully('dropHeld');
  assertState(v, vref, true, 'ERV');

  // lERV -> leRV  Drop the export
  await dispatchDropExports(mapRef(mainHeldIdx));
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
  await dispatchRetireExports(mapRef(mainHeldIdx));
  assertState(v, vref, true, 'erV');
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), []);
});

// test 3: lerv -> Lerv -> LerV -> LERV -> LeRV -> leRV -> lerV -> lerv
test.serial('store lifecycle 3', async t => {
  const {
    v,
    dispatchMessageSuccessfully,
    dispatchDropExports,
    dispatchRetireExports,
  } = await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });

  // lerv -> Lerv  Create store
  await dispatchMessageSuccessfully('makeAndHold');
  const vref = getLastCollection(v);
  assertState(v, vref, true, 'erv');

  // Lerv -> LerV  Store store reference virtually (permanent for now)
  await dispatchMessageSuccessfully('storeHeld');
  assertState(v, vref, true, 'erV');

  // LerV -> LERV  Export the reference, now all three legs hold it
  await dispatchMessageSuccessfully('exportHeld');
  assertState(v, vref, true, 'ERV');

  // LERV -> LeRV  Drop the export
  await dispatchDropExports(mapRef(mainHeldIdx));
  assertState(v, vref, true, 'eRV');

  // LeRV -> leRV  Drop in-memory reference
  await dispatchMessageSuccessfully('dropHeld');
  assertState(v, vref, true, 'eRV');

  // leRV -> lerV  Retire the export
  await dispatchRetireExports(mapRef(mainHeldIdx));
  assertState(v, vref, true, 'erV');

  // lerV -> lerv  Drop stored reference (gc and retire)
  await dispatchMessageSuccessfully('dropStored');
  assertState(v, vref, false, 'erv');
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), []);
});

// test 4: lerv -> Lerv -> LERv -> LeRv -> lerv
test.serial('store lifecycle 4', async t => {
  const { v, dispatchMessageSuccessfully, dispatchDropExports } =
    await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });

  // lerv -> Lerv  Create store
  await dispatchMessageSuccessfully('makeAndHold');
  const vref = getLastCollection(v);
  assertState(v, vref, true, 'erv');

  // Lerv -> LERv  Export the reference, now two legs hold it
  await dispatchMessageSuccessfully('exportHeld');
  assertState(v, vref, true, 'ERv');

  // LERv -> LeRv  Drop the export
  await dispatchDropExports(mapRef(mainHeldIdx));
  assertState(v, vref, true, 'eRv');
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), []);

  // LeRv -> lerv  Drop in-memory reference (gc and retire)
  await dispatchMessageSuccessfully('dropHeld');
  assertState(v, vref, false, 'erv');
  const expected = { type: 'retireExports', slots: [vref] };
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), [expected]);
});

// test 5: lerv -> Lerv -> LERv -> LeRv -> Lerv -> lerv
test.serial('store lifecycle 5', async t => {
  const {
    v,
    dispatchMessageSuccessfully,
    dispatchDropExports,
    dispatchRetireExports,
  } = await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });

  // lerv -> Lerv  Create store
  await dispatchMessageSuccessfully('makeAndHold');
  const vref = getLastCollection(v);
  assertState(v, vref, true, 'erv');

  // Lerv -> LERv  Export the reference, now two legs hold it
  await dispatchMessageSuccessfully('exportHeld');
  assertState(v, vref, true, 'ERv');

  // LERv -> LeRv  Drop the export
  await dispatchDropExports(mapRef(mainHeldIdx));
  assertState(v, vref, true, 'eRv');
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), []);

  // LeRv -> Lerv  Retire the export
  await dispatchRetireExports(mapRef(mainHeldIdx));
  assertState(v, vref, true, 'erv');
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), []);

  // Lerv -> lerv  Drop in-memory reference, unreferenced store gets GC'd
  await dispatchMessageSuccessfully('dropHeld');
  assertState(v, vref, false, 'erv');
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  // the kernel disavowed interest in the vref first, so vat doesn't retire
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), []);
});

// test 6: lerv -> Lerv -> LERv -> LeRv -> LeRV -> LeRv -> LeRV -> leRV -> lerv
test.serial('store lifecycle 6', async t => {
  const { v, dispatchMessageSuccessfully, dispatchDropExports } =
    await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });

  // lerv -> Lerv  Create store
  await dispatchMessageSuccessfully('makeAndHold');
  const vref = getLastCollection(v);
  assertState(v, vref, true, 'erv');

  // Lerv -> LERv  Export the reference, now all three legs hold it
  await dispatchMessageSuccessfully('exportHeld');
  assertState(v, vref, true, 'ERv');

  // LERv -> LeRv  Drop the export
  await dispatchDropExports(mapRef(mainHeldIdx));
  assertState(v, vref, true, 'eRv');
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), []);

  // LeRv -> LeRV  Store store reference virtually
  await dispatchMessageSuccessfully('storeHeld');
  assertState(v, vref, true, 'eRV');

  // LeRV -> LeRv  Overwrite virtual reference
  await dispatchMessageSuccessfully('dropStored');
  assertState(v, vref, true, 'eRv');

  // LeRv -> LeRV  Store store reference virtually again
  await dispatchMessageSuccessfully('storeHeld');
  assertState(v, vref, true, 'eRV');

  // LeRV -> leRV  Drop in-memory reference
  await dispatchMessageSuccessfully('dropHeld');
  assertState(v, vref, true, 'eRV');

  // leRV -> lerv  Drop stored reference (gc and retire)
  await dispatchMessageSuccessfully('dropStored');
  assertState(v, vref, false, 'erv');
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  // kernel did not dispatch.retireExports first, so vat must
  const expected = { type: 'retireExports', slots: [vref] };
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), [expected]);
});

// test 7: lerv -> Lerv -> LERv -> lERv -> LERv -> lERv -> lerv
test.serial('store lifecycle 7', async t => {
  const { v, dispatchMessageSuccessfully, dispatchDropExports } =
    await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });

  // lerv -> Lerv  Create store
  await dispatchMessageSuccessfully('makeAndHold');
  const vref = getLastCollection(v);
  assertState(v, vref, true, 'erv');

  // Lerv -> LERv  Export the reference, now two legs hold it
  await dispatchMessageSuccessfully('exportHeld');
  assertState(v, vref, true, 'ERv');

  // LERv -> lERv  Drop in-memory reference, no GC because exported
  await dispatchMessageSuccessfully('dropHeld');
  assertState(v, vref, true, 'ERv');

  // lERv -> LERv  Reintroduce the in-memory reference via message
  await dispatchMessageSuccessfully(
    'importAndHold',
    kslot(mapRef(mainHeldIdx)),
  );
  assertState(v, vref, true, 'ERv');

  // LERv -> lERv  Drop in-memory reference again, still no GC because exported
  await dispatchMessageSuccessfully('dropHeld');
  assertState(v, vref, true, 'ERv');

  // lERv -> leRv -> lerv  Drop the export (gc and retire)
  await dispatchDropExports(mapRef(mainHeldIdx));
  // leRv means the vat drops the vref, and then since the kernel
  // could still recognize it (R), the vat must syscall.retireExports
  assertState(v, vref, false, 'erv');
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  const expected = { type: 'retireExports', slots: [vref] };
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), [expected]);
});

// test 8: lerv -> Lerv -> LERv -> LERV -> LERv -> LERV -> lERV -> lERv -> lerv
test.serial('store lifecycle 8', async t => {
  const { v, dispatchMessageSuccessfully, dispatchDropExports } =
    await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });

  // lerv -> Lerv  Create store
  await dispatchMessageSuccessfully('makeAndHold');
  const vref = getLastCollection(v);
  assertState(v, vref, true, 'erv');

  // Lerv -> LERv  Export the reference
  await dispatchMessageSuccessfully('exportHeld');
  assertState(v, vref, true, 'ERv');

  // LERv -> LERV  Store store reference virtually
  await dispatchMessageSuccessfully('storeHeld');
  assertState(v, vref, true, 'ERV');

  // LERV -> LERv  Overwrite virtual reference
  await dispatchMessageSuccessfully('dropStored');
  assertState(v, vref, true, 'ERv');

  // LERv -> LERV  Store store reference virtually
  await dispatchMessageSuccessfully('storeHeld');
  assertState(v, vref, true, 'ERV');

  // LERV -> lERV  Drop the in-memory reference
  await dispatchMessageSuccessfully('dropHeld');
  assertState(v, vref, true, 'ERV');

  // lERV -> lERv  Overwrite virtual reference
  await dispatchMessageSuccessfully('dropStored');
  assertState(v, vref, true, 'ERv');

  // lERv -> leRv -> lerv  Drop the export (gc and retire)
  await dispatchDropExports(mapRef(mainHeldIdx));
  assertState(v, vref, false, 'erv');
  t.deepEqual(findSyscallsByType(v.log, 'dropExports'), []);
  const expected = { type: 'retireExports', slots: [vref] };
  t.deepEqual(findSyscallsByType(v.log, 'retireExports'), [expected]);
});
