// eslint-disable-next-line import/order
import { test } from '../../../tools/prepare-test-env-ava.js';

import { setupTestLiveslots } from '../../liveslots-helpers.js';
import {
  buildRootObject,
  mainHeldIdx,
  mapRef,
  mapRefArg,
  NONE,
  validateDropExports,
  validateDropExportsWithGCAndRetire,
  validateDropHeld,
  validateDropHeldWithGC,
  validateDropHeldWithGCAndRetire,
  validateDropStored,
  validateDropStoredWithGCAndRetire,
  validateExportHeld,
  validateFetchAndHold,
  validateImportAndHold,
  validateInit,
  validateMakeAndHold,
  validateRetireExports,
  validateStoreHeld,
} from '../../gc-helpers.js';

// These tests follow the model described in
// ../virtualObjects/test-virtualObjectGC.js

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
  const [marg, mslot] = mapRefArg(mainHeldIdx);
  rp = await dispatchMessage('importAndHold', [marg], [mslot]);
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
  const [marg, mslot] = mapRefArg(mainHeldIdx);
  rp = await dispatchMessage('importAndHold', [marg], [mslot]);
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
