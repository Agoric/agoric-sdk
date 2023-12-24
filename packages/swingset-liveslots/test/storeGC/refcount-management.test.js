import test from 'ava';

import { kslot } from '@agoric/kmarshal';
import {
  findSyscallsByType,
  setupTestLiveslots,
} from '../liveslots-helpers.js';
import {
  buildRootObject,
  deduceCollectionID,
  recognizersOf,
  refValString,
  assertCollectionDeleted,
} from '../gc-helpers.js';
import { vstr } from '../util.js';

// These tests follow the model described in
// ../virtualObjects/test-virtualObjectGC.js

// NOTE: these tests must be run serially, since they share a heap and garbage
// collection during one test can interfere with the deterministic behavior of a
// different test.

// prettier-ignore
test.serial('store refcount management 1', async t => {
  const { v, dispatchMessageSuccessfully } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    { forceGC: true },
  );
  const { fakestore } = v;

  // `mainHolder` is created during startup
  const [ mainID ] = deduceCollectionID(fakestore, 'scalarMapStore', 1)
  t.is(fakestore.get(`vc.${mainID}.|entryCount`), '1');
  t.is(fakestore.get(`vc.${mainID}.sfoo`), vstr(null));

  await dispatchMessageSuccessfully('makeAndHold'); // creates Map6, holds in RAM[heldStore]
  // `heldStore` is the most recent one created
  const [ heldID, heldVref ] = deduceCollectionID(fakestore, 'scalarMapStore', 1);

  t.is(fakestore.get(`vc.${heldID}.|entryCount`), '0'); // heldStore is empty
  t.is(fakestore.get(`vom.rc.${heldVref}`), undefined); // no vdata references
  t.deepEqual(recognizersOf(v, heldVref), []); // no only-recognizers

  await dispatchMessageSuccessfully('prepareStore3');
  // creates Map7,8,9, all hold heldVref, all held by RAM[holders]
  const [ map7ID, _map7Vref ] = deduceCollectionID(fakestore, 'scalarMapStore', 3);
  const [ map8ID, _map8Vref ] = deduceCollectionID(fakestore, 'scalarMapStore', 2);
  const [ map9ID, _map9Vref ] = deduceCollectionID(fakestore, 'scalarMapStore', 1);

  t.is(fakestore.get(`vom.rc.${heldVref}`), '3'); // heldVref referenced by all of Map7,8,9
  t.deepEqual(recognizersOf(v, heldVref), []); // no only-recognizers (7/8/9 are not weak)
  t.is(fakestore.get(`vc.${map7ID}.|entryCount`), '1'); // one entry
  t.is(fakestore.get(`vc.${map8ID}.|entryCount`), '1'); // one entry
  t.is(fakestore.get(`vc.${map9ID}.|entryCount`), '1'); // one entry
  t.is(fakestore.get(`vc.${map7ID}.sfoo`), refValString(heldVref, 'mapStore'));
  t.is(fakestore.get(`vc.${map8ID}.sfoo`), refValString(heldVref, 'mapStore'));
  t.is(fakestore.get(`vc.${map9ID}.sfoo`), refValString(heldVref, 'mapStore'));

  await dispatchMessageSuccessfully('finishClearHolders'); // replaces Map7,8,9 with null, also RAM.heldStore
  assertCollectionDeleted(v, heldVref); // heldVref is gone
  t.is(fakestore.get(`vom.rc.${heldVref}`), undefined); // heldVref not referenced
  t.deepEqual(recognizersOf(v, heldVref), []); // no only-recognizers (7/8/9 are not weak)
  t.is(fakestore.get(`vc.${map7ID}.|entryCount`), '1');
  t.is(fakestore.get(`vc.${map8ID}.|entryCount`), '1');
  t.is(fakestore.get(`vc.${map9ID}.|entryCount`), '1');
  t.is(fakestore.get(`vc.${map7ID}.sfoo`), vstr(null));
  t.is(fakestore.get(`vc.${map8ID}.sfoo`), vstr(null));
  t.is(fakestore.get(`vc.${map9ID}.sfoo`), vstr(null));
});

function checkAllDropped(v, refs) {
  const { t, fakestore } = v;
  const { heldVref, map7ID, map7Vref, map8ID, map8Vref, map9ID, map9Vref } =
    refs;
  assertCollectionDeleted(v, heldVref); // Map6 is gone
  assertCollectionDeleted(v, map7Vref); // Map7 is gone
  assertCollectionDeleted(v, map8Vref); // Map8 is gone
  assertCollectionDeleted(v, map9Vref); // Map9 is gone
  // Map6/7/8/9 are not referenced
  t.is(fakestore.get(`vom.rc.${heldVref}`), undefined);
  t.is(fakestore.get(`vom.rc.${map7Vref}`), undefined);
  t.is(fakestore.get(`vom.rc.${map8Vref}`), undefined);
  t.is(fakestore.get(`vom.rc.${map9Vref}`), undefined);
  t.deepEqual(recognizersOf(v, `${heldVref}`), []); // no only-recognizers (7/8/9 are not weak)
  t.deepEqual(recognizersOf(v, map7Vref), []);
  t.deepEqual(recognizersOf(v, map8Vref), []);
  t.deepEqual(recognizersOf(v, map9Vref), []);
  t.is(fakestore.get(`vc.${map7ID}.|entryCount`), undefined);
  t.is(fakestore.get(`vc.${map8ID}.|entryCount`), undefined);
  t.is(fakestore.get(`vc.${map9ID}.|entryCount`), undefined);
}

// prettier-ignore
test.serial('store refcount management 2', async t => {
  const { v, dispatchMessageSuccessfully } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    { forceGC: true },
  );
  const { fakestore } = v;

  await dispatchMessageSuccessfully('makeAndHold');
  const [ heldID, heldVref ] = deduceCollectionID(fakestore, 'scalarMapStore', 1);

  t.is(fakestore.get(`vc.${heldID}.|entryCount`), '0'); // heldVref is empty
  t.is(fakestore.get(`vom.rc.o+2/6`), undefined); // no vdata references
  t.deepEqual(recognizersOf(v, heldVref), []); // no only-recognizers

  await dispatchMessageSuccessfully('prepareStore3');
  const [ map7ID, map7Vref ] = deduceCollectionID(fakestore, 'scalarMapStore', 3);
  const [ map8ID, map8Vref ] = deduceCollectionID(fakestore, 'scalarMapStore', 2);
  const [ map9ID, map9Vref ] = deduceCollectionID(fakestore, 'scalarMapStore', 1);

  t.is(fakestore.get(`vom.rc.${heldVref}`), '3'); // heldVref referenced by all of Map7,8,9
  t.deepEqual(recognizersOf(v, heldVref), []); // no only-recognizers (7/8/9 are not weak)
  t.is(fakestore.get(`vc.${map7ID}.|entryCount`), '1'); // one entry
  t.is(fakestore.get(`vc.${map8ID}.|entryCount`), '1'); // one entry
  t.is(fakestore.get(`vc.${map9ID}.|entryCount`), '1'); // one entry
  t.is(fakestore.get(`vc.${map7ID}.sfoo`), refValString(heldVref, 'mapStore'));
  t.is(fakestore.get(`vc.${map8ID}.sfoo`), refValString(heldVref, 'mapStore'));
  t.is(fakestore.get(`vc.${map9ID}.sfoo`), refValString(heldVref, 'mapStore'));

  await dispatchMessageSuccessfully('finishDropHolders'); // drop Map7,8,9
  const refs = { heldVref, map7ID, map7Vref, map8ID, map8Vref, map9ID, map9Vref };
  checkAllDropped(v, refs);
});

// prettier-ignore
test.serial('store refcount management 3', async t => {
  const { v, dispatchMessageSuccessfully } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    { forceGC: true },
  );
  const { fakestore } = v;

  await dispatchMessageSuccessfully('makeAndHold');
  const [ heldID, heldVref ] = deduceCollectionID(fakestore, 'scalarMapStore', 1);
  t.is(fakestore.get(`vc.${heldID}.|entryCount`), '0'); // heldVref is empty
  t.is(fakestore.get(`vom.rc.${heldVref}`), undefined); // no vdata references
  t.deepEqual(recognizersOf(v, heldVref), []); // no only-recognizers

  // make a linked list with Maps: RAM->Map9->Map8->Map7->heldVref
  await dispatchMessageSuccessfully('prepareStoreLinked');
  const [ map7ID, map7Vref ] = deduceCollectionID(fakestore, 'scalarMapStore', 3);
  const [ map8ID, map8Vref ] = deduceCollectionID(fakestore, 'scalarMapStore', 2);
  const [ map9ID, map9Vref ] = deduceCollectionID(fakestore, 'scalarMapStore', 1);

  t.is(fakestore.get(`vom.rc.${heldVref}`), '1'); // heldVref, from Map7
  t.is(fakestore.get(`vom.rc.${map7Vref}`), '1'); // Map7, from Map8
  t.is(fakestore.get(`vom.rc.${map8Vref}`), '1'); // Map8, from Map9
  t.is(fakestore.get(`vom.rc.${map9Vref}`), undefined); // Map9 has no vdata ref, only RAM
  t.is(fakestore.get(`vc.${heldID}.|entryCount`), '0'); // heldVref always empty
  t.is(fakestore.get(`vc.${map7ID}.|entryCount`), '1'); // one entry
  t.is(fakestore.get(`vc.${map8ID}.|entryCount`), '1'); // one entry
  t.is(fakestore.get(`vc.${map9ID}.|entryCount`), '1'); // one entry
  t.is(fakestore.get(`vc.${map7ID}.sfoo`), refValString(heldVref, 'mapStore'));
  t.is(fakestore.get(`vc.${map8ID}.sfoo`), refValString(map7Vref, 'mapStore'));
  t.is(fakestore.get(`vc.${map9ID}.sfoo`), refValString(map8Vref, 'mapStore'));

  // drop RAM->Map9, so everything should disappear
  await dispatchMessageSuccessfully('finishDropHolders');
  const refs = { heldVref, map7ID, map7Vref, map8ID, map8Vref, map9ID, map9Vref };
  checkAllDropped(v, refs);
});

// prettier-ignore
test.serial('presence refcount management 1', async t => {
  const { v, dispatchMessageSuccessfully } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    { forceGC: true },
  );
  const { fakestore } = v;

  const held = 'o-5';
  const presence = kslot(held, 'thing');

  await dispatchMessageSuccessfully('importAndHold', presence);
  // RAM->o-5

  t.is(fakestore.get(`vom.rc.${held}`), undefined);
  await dispatchMessageSuccessfully('prepareStore3');
  const [ map6ID, _map6Vref ] = deduceCollectionID(fakestore, 'scalarMapStore', 3);
  const [ map7ID, _map7Vref ] = deduceCollectionID(fakestore, 'scalarMapStore', 2);
  const [ map8ID, _map8Vref ] = deduceCollectionID(fakestore, 'scalarMapStore', 1);

  // Map6,7,8 all hold o-5
  t.is(fakestore.get(`vom.rc.${held}`), '3'); // o-5 referenced by all of Map6,7,8
  t.deepEqual(recognizersOf(v, held), []); // no only-recognizers (6/7/8 are not weak)
  t.is(fakestore.get(`vc.${map6ID}.|entryCount`), '1'); // one entry
  t.is(fakestore.get(`vc.${map7ID}.|entryCount`), '1'); // one entry
  t.is(fakestore.get(`vc.${map8ID}.|entryCount`), '1'); // one entry
  t.is(fakestore.get(`vc.${map6ID}.sfoo`), refValString(held, 'thing'));
  t.is(fakestore.get(`vc.${map7ID}.sfoo`), refValString(held, 'thing'));
  t.is(fakestore.get(`vc.${map8ID}.sfoo`), refValString(held, 'thing'));

  t.is(fakestore.get(`vom.rc.${held}`), '3');

  await dispatchMessageSuccessfully('finishClearHolders');
  // Map6,7,8 all hold null, o-5 is unreferenced
  t.is(fakestore.get(`vom.rc.${held}`), undefined);
  t.is(fakestore.get(`vc.${map6ID}.sfoo`), vstr(null));
  t.is(fakestore.get(`vc.${map7ID}.sfoo`), vstr(null));
  t.is(fakestore.get(`vc.${map8ID}.sfoo`), vstr(null));

  // we should observe a dropImport and a retireImport for o-5
  const drops = findSyscallsByType(v.log, 'dropImports');
  t.deepEqual(drops, [ { type: 'dropImports', slots: [ held ] } ]);
  const retires = findSyscallsByType(v.log, 'retireImports');
  t.deepEqual(retires, [ { type: 'retireImports', slots: [ held ] } ]);
});

// prettier-ignore
test.serial('presence refcount management 2', async t => {
  const { v, dispatchMessageSuccessfully } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    { forceGC: true },
  );
  const { fakestore } = v;

  const held = 'o-5';
  const presence = kslot(held, 'thing');
  await dispatchMessageSuccessfully('importAndHold', presence);

  await dispatchMessageSuccessfully('prepareStore3');
  const [ map6ID, map6Vref ] = deduceCollectionID(fakestore, 'scalarMapStore', 3);
  const [ map7ID, map7Vref ] = deduceCollectionID(fakestore, 'scalarMapStore', 2);
  const [ map8ID, map8Vref ] = deduceCollectionID(fakestore, 'scalarMapStore', 1);

  // Map6,7,8 all hold o-5
  t.is(fakestore.get(`vom.rc.${held}`), '3'); // o-5 referenced by all of Map6,7,8
  t.deepEqual(recognizersOf(v, held), []); // no only-recognizers (6/7/8 are not weak)
  t.is(fakestore.get(`vc.${map6ID}.|entryCount`), '1'); // one entry
  t.is(fakestore.get(`vc.${map7ID}.|entryCount`), '1'); // one entry
  t.is(fakestore.get(`vc.${map8ID}.|entryCount`), '1'); // one entry
  t.is(fakestore.get(`vc.${map6ID}.sfoo`), refValString(held, 'thing'));
  t.is(fakestore.get(`vc.${map7ID}.sfoo`), refValString(held, 'thing'));
  t.is(fakestore.get(`vc.${map8ID}.sfoo`), refValString(held, 'thing'));

  await dispatchMessageSuccessfully('finishDropHolders'); // drop Map6,7,8

  // Map6,7,8 are gone
  assertCollectionDeleted(v, map6Vref); // Map6 is gone
  assertCollectionDeleted(v, map7Vref); // Map7 is gone
  assertCollectionDeleted(v, map8Vref); // Map8 is gone
  // Map6/7/8 are not referenced
  t.is(fakestore.get(`vom.rc.${map6Vref}`), undefined);
  t.is(fakestore.get(`vom.rc.${map7Vref}`), undefined);
  t.is(fakestore.get(`vom.rc.${map8Vref}`), undefined);
  t.deepEqual(recognizersOf(v, map6Vref), []); // no only-recognizers
  t.deepEqual(recognizersOf(v, map7Vref), []);
  t.deepEqual(recognizersOf(v, map8Vref), []);
  t.is(fakestore.get(`vc.${map6ID}.|entryCount`), undefined);
  t.is(fakestore.get(`vc.${map7ID}.|entryCount`), undefined);
  t.is(fakestore.get(`vc.${map8ID}.|entryCount`), undefined);

  // o-5 is unreferenced
  t.is(fakestore.get(`vom.rc.${held}`), undefined);

  // we should observe a dropImport and a retireImport for o-5
  const drops = findSyscallsByType(v.log, 'dropImports');
  t.deepEqual(drops, [ { type: 'dropImports', slots: [ held ] } ]);
  const retires = findSyscallsByType(v.log, 'retireImports');
  t.deepEqual(retires, [ { type: 'retireImports', slots: [ held ] } ]);
});

// prettier-ignore
test.serial('remotable refcount management 1', async t => {
  const { v, dispatchMessageSuccessfully } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    { forceGC: true },
  );
  const { fakestore } = v;

  const held = 'o+10';
  await dispatchMessageSuccessfully('makeAndHoldRemotable');
  // RAM->o+10

  await dispatchMessageSuccessfully('prepareStore3');
  const [ map6ID, _map6Vref ] = deduceCollectionID(fakestore, 'scalarMapStore', 3);
  const [ map7ID, _map7Vref ] = deduceCollectionID(fakestore, 'scalarMapStore', 2);
  const [ map8ID, _map8Vref ] = deduceCollectionID(fakestore, 'scalarMapStore', 1);

  // Map6,7,8 -> o+10, remove RAM->o+10
  // we track vdata refcounts to (non-virtual) Remotables in RAM, not the DB
  t.is(fakestore.get(`vom.rc.${held}`), undefined);
  t.is(fakestore.get(`vc.${map6ID}.|entryCount`), '1'); // one entry
  t.is(fakestore.get(`vc.${map7ID}.|entryCount`), '1'); // one entry
  t.is(fakestore.get(`vc.${map8ID}.|entryCount`), '1'); // one entry
  t.is(fakestore.get(`vc.${map6ID}.sfoo`), refValString(held, 'thing'));
  t.is(fakestore.get(`vc.${map7ID}.sfoo`), refValString(held, 'thing'));
  t.is(fakestore.get(`vc.${map8ID}.sfoo`), refValString(held, 'thing'));

  await dispatchMessageSuccessfully('finishClearHolders');
  // Map6,7,8 all hold null, o+10 is unreferenced
  t.is(fakestore.get(`vc.${map6ID}.sfoo`), vstr(null));
  t.is(fakestore.get(`vc.${map7ID}.sfoo`), vstr(null));
  t.is(fakestore.get(`vc.${map8ID}.sfoo`), vstr(null));
});

// prettier-ignore
test.serial('remotable refcount management 2', async t => {
  const { v, dispatchMessageSuccessfully } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    { forceGC: true },
  );
  const { fakestore } = v;

  const held = 'o+10';
  await dispatchMessageSuccessfully('makeAndHoldRemotable');
  // RAM->o+10

  await dispatchMessageSuccessfully('prepareStore3');
  const [ map6ID, map6Vref ] = deduceCollectionID(fakestore, 'scalarMapStore', 3);
  const [ map7ID, map7Vref ] = deduceCollectionID(fakestore, 'scalarMapStore', 2);
  const [ map8ID, map8Vref ] = deduceCollectionID(fakestore, 'scalarMapStore', 1);

  // Map6,7,8 -> o+10, remove RAM->o+10
  // we track vdata refcounts to (non-virtual) Remotables in RAM, not the DB
  t.is(fakestore.get(`vom.rc.${held}`), undefined);
  t.is(fakestore.get(`vc.${map6ID}.|entryCount`), '1'); // one entry
  t.is(fakestore.get(`vc.${map7ID}.|entryCount`), '1'); // one entry
  t.is(fakestore.get(`vc.${map8ID}.|entryCount`), '1'); // one entry
  t.is(fakestore.get(`vc.${map6ID}.sfoo`), refValString(held, 'thing'));
  t.is(fakestore.get(`vc.${map7ID}.sfoo`), refValString(held, 'thing'));
  t.is(fakestore.get(`vc.${map8ID}.sfoo`), refValString(held, 'thing'));

  await dispatchMessageSuccessfully('finishDropHolders');
  // Map6,7,8 are gone
  assertCollectionDeleted(v, map6Vref); // Map6 is gone
  assertCollectionDeleted(v, map7Vref); // Map7 is gone
  assertCollectionDeleted(v, map8Vref); // Map8 is gone
  // Map6/7/8 are not referenced
  t.is(fakestore.get(`vom.rc.${map6Vref}`), undefined);
  t.is(fakestore.get(`vom.rc.${map7Vref}`), undefined);
  t.is(fakestore.get(`vom.rc.${map8Vref}`), undefined);
  t.deepEqual(recognizersOf(v, map6Vref), []); // no only-recognizers
  t.deepEqual(recognizersOf(v, map7Vref), []);
  t.deepEqual(recognizersOf(v, map8Vref), []);
  t.is(fakestore.get(`vc.${map6ID}.|entryCount`), undefined);
  t.is(fakestore.get(`vc.${map7ID}.|entryCount`), undefined);
  t.is(fakestore.get(`vc.${map8ID}.|entryCount`), undefined);
});
