// eslint-disable-next-line import/order
import { test } from '../../../tools/prepare-test-env-ava.js';

import {
  setupTestLiveslots,
  matchVatstoreGet,
  matchVatstoreGetAfter,
  matchVatstoreDelete,
  matchVatstoreSet,
  matchDropImports,
  matchRetireImports,
  validate,
  validateDone,
  validateReturned,
} from '../../liveslots-helpers.js';
import {
  buildRootObject,
  DONE,
  mainHeldIdx,
  mapRef,
  NONE,
  nullValString,
  refValString,
  stringValString,
  thingArg,
  validateCreateStore,
  validateDeleteMetadataOnly,
  validateInit,
  validateRefCountCheck,
  validateStatusCheck,
  validateUpdate,
  validateWeakCheckEmpty,
} from '../../gc-helpers.js';

// These tests follow the model described in
// ../virtualObjects/test-virtualObjectGC.js

// NOTE: these tests must be run serially, since they share a heap and garbage
// collection during one test can interfere with the deterministic behavior of a
// different test.

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
  const mapID = mainHeldIdx;
  validateCreateStore(v, mapID, true); // map
  const setID = mainHeldIdx + 1;
  validateCreateStore(v, setID, true); // set
  const keyID = mainHeldIdx + 2;
  validateCreateStore(v, keyID); // key

  const ordinalKey = `r0000000001:${mapRef(keyID)}`;

  validate(v, matchVatstoreGet(`vc.${mapID}.|${mapRef(keyID)}`, NONE));
  validate(v, matchVatstoreGet(`vc.${mapID}.|nextOrdinal`, '1'));
  validate(v, matchVatstoreSet(`vc.${mapID}.|${mapRef(keyID)}`, '1'));
  validate(v, matchVatstoreSet(`vc.${mapID}.|nextOrdinal`, '2'));
  validate(v, matchVatstoreSet(`vom.ir.${mapRef(keyID)}|${mapID}`, '1'));
  validate(v, matchVatstoreGet(`vc.${mapID}.|${mapRef(keyID)}`, '1'));
  validate(
    v,
    matchVatstoreSet(`vc.${mapID}.${ordinalKey}`, stringValString('arbitrary')),
  );

  validate(v, matchVatstoreGet(`vc.${setID}.|${mapRef(keyID)}`, NONE));
  validate(v, matchVatstoreGet(`vc.${setID}.|nextOrdinal`, '1'));
  validate(v, matchVatstoreSet(`vc.${setID}.|${mapRef(keyID)}`, '1'));
  validate(v, matchVatstoreSet(`vc.${setID}.|nextOrdinal`, '2'));
  validate(v, matchVatstoreSet(`vom.ir.${mapRef(keyID)}|${setID}`, '1'));
  validate(v, matchVatstoreGet(`vc.${setID}.|${mapRef(keyID)}`, '1'));
  validate(v, matchVatstoreSet(`vc.${setID}.${ordinalKey}`, nullValString));
  validateReturned(v, rp);
  validate(v, matchVatstoreSet('idCounters'));
  validateDone(v);

  t.is(testHooks.countCollectionsForWeakKey(mapRef(keyID)), 2);
  t.is(testHooks.storeSizeInternal(mapRef(mapID)), 1);
  const prefix = `vom.ir.${mapRef(keyID)}|`;
  validate(v, matchVatstoreGetAfter('', prefix, NONE, [`${prefix}${mapID}`, '1']));
  validate(v, matchVatstoreGetAfter(`${prefix}${mapID}`, prefix, NONE, [`${prefix}${setID}`, '1']));
  validate(v, matchVatstoreGetAfter(`${prefix}${setID}`, prefix, NONE, [NONE, NONE]));
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
  validate(v, matchVatstoreGetAfter('', prefix, NONE, [`${prefix}${mapID}`, '1']));
  validate(v, matchVatstoreDelete(`${prefix}${mapID}`));
  validate(v, matchVatstoreGet(`vc.${mapID}.|${mapRef(keyID)}`, '1'));
  validate(v, matchVatstoreDelete(`vc.${mapID}.|${mapRef(keyID)}`));
  validate(v, matchVatstoreGet(`vc.${mapID}.${ordinalKey}`, stringValString('arbitrary')));
  validate(v, matchVatstoreDelete(`vc.${mapID}.${ordinalKey}`));
  validate(v, matchVatstoreGetAfter(`${prefix}${mapID}`, prefix, NONE, [`${prefix}${setID}`, '1']));
  validate(v, matchVatstoreDelete(`${prefix}${setID}`));
  validate(v, matchVatstoreGet(`vc.${setID}.|${mapRef(keyID)}`, '1'));
  validate(v, matchVatstoreDelete(`vc.${setID}.|${mapRef(keyID)}`));
  validate(v, matchVatstoreGet(`vc.${setID}.${ordinalKey}`, nullValString));
  validate(v, matchVatstoreDelete(`vc.${setID}.${ordinalKey}`));
  validate(v, matchVatstoreGetAfter(`${prefix}${setID}`, prefix, NONE, [NONE, NONE]));

  t.is(testHooks.countCollectionsForWeakKey(mapRef(keyID)), 0);
  t.is(testHooks.storeSizeInternal(mapRef(mapID)), 0);
  validateWeakCheckEmpty(v, mapRef(keyID));
  validate(v, matchVatstoreGetAfter('', `vc.${mapID}.`, `vc.${mapID}.{`, DONE));
  t.is(testHooks.storeSizeInternal(mapRef(setID)), 0);
  validate(v, matchVatstoreGetAfter('', `vc.${setID}.`, `vc.${setID}.{`, DONE));
  validateDone(v);
});

// prettier-ignore
test.serial('verify weakly held value GC', async t => {
  const { v, dispatchMessage } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    true,
  );

  // Create a weak store, and put a weakly held object into it
  let rp = await dispatchMessage('makeAndHoldWeakly');
  validateInit(v);
  const mapID = mainHeldIdx;
  validateCreateStore(v, mapID, true); // weak map
  const keyID = mainHeldIdx + 1;
  validateCreateStore(v, keyID); // key
  const valueID = mainHeldIdx + 2;
  validateCreateStore(v, valueID); // indirect value

  const ordinalKey = `r0000000001:${mapRef(keyID)}`;

  validate(v, matchVatstoreGet(`vc.${mapID}.|${mapRef(keyID)}`, NONE));
  validate(v, matchVatstoreGet(`vc.${mapID}.|nextOrdinal`, '1'));
  validate(v, matchVatstoreSet(`vc.${mapID}.|${mapRef(keyID)}`, '1'));
  validate(v, matchVatstoreSet(`vc.${mapID}.|nextOrdinal`, '2'));
  validate(v, matchVatstoreSet(`vom.ir.${mapRef(keyID)}|${mapID}`, '1'));
  validateUpdate(v, `vom.rc.${mapRef(valueID)}`, NONE, '1');
  validate(v, matchVatstoreGet(`vc.${mapID}.|${mapRef(keyID)}`, '1'));
  validate(v, matchVatstoreSet(`vc.${mapID}.${ordinalKey}`, refValString(mapRef(valueID), 'mapStore')));
  validateReturned(v, rp);
  validate(v, matchVatstoreSet('idCounters'));
  validateStatusCheck(v, mapRef(valueID), '1', NONE);
  validateDone(v);

  // Drop in-memory reference to holder, GC should cause held entry to disappear
  rp = await dispatchMessage('dropHeld');
  validateReturned(v, rp);
  validateStatusCheck(v, mapRef(keyID), NONE, NONE);
  validateDeleteMetadataOnly(v, keyID, 0, NONE, NONE, 0, false);
  const prefix = `vom.ir.${mapRef(keyID)}|`;
  validate(v, matchVatstoreGetAfter('', prefix, NONE, [`${prefix}${mapID}`, '1']));
  validate(v, matchVatstoreDelete(`${prefix}${mapID}`));
  validate(v, matchVatstoreGet(`vc.${mapID}.|${mapRef(keyID)}`, '1'));
  validate(v, matchVatstoreDelete(`vc.${mapID}.|${mapRef(keyID)}`));

  validate(v, matchVatstoreGet(`vc.${mapID}.${ordinalKey}`, refValString(mapRef(valueID), 'mapStore')));
  validateUpdate(v, `vom.rc.${mapRef(valueID)}`, `1`, `0`);
  validate(v, matchVatstoreDelete(`vc.${mapID}.${ordinalKey}`));
  validate(v, matchVatstoreGetAfter(`${prefix}${mapID}`, prefix, NONE, [NONE, NONE]));
  validateStatusCheck(v, mapRef(valueID), '0', NONE);
  validateDeleteMetadataOnly(v, valueID, 0, NONE, NONE, 0, false);
  validateWeakCheckEmpty(v, mapRef(valueID));
  validateDone(v);
});

// prettier-ignore
test.serial('verify presence weak key GC', async t => {
  const { v, dispatchMessage, dispatchRetireImports, testHooks } =
    await setupTestLiveslots(t, buildRootObject, 'bob', true);

  const presenceRef = 'o-5';

  // Import a presence to use as a key and hold onto it weakly
  const [targ, tslot] = thingArg(presenceRef);
  let rp = await dispatchMessage('importAndHoldAndKey', [targ], [tslot]);
  validateInit(v);
  const mapID = mainHeldIdx;
  validateCreateStore(v, mapID, true); // map
  const setID = mainHeldIdx + 1;
  validateCreateStore(v, setID, true); // set

  const ordinalKey = `r0000000001:${presenceRef}`;

  validate(v, matchVatstoreGet(`vc.${mapID}.|${presenceRef}`, NONE));
  validate(v, matchVatstoreGet(`vc.${mapID}.|nextOrdinal`, '1'));
  validate(v, matchVatstoreSet(`vc.${mapID}.|${presenceRef}`, '1'));
  validate(v, matchVatstoreSet(`vc.${mapID}.|nextOrdinal`, '2'));
  validate(v, matchVatstoreSet(`vom.ir.${presenceRef}|${mapID}`, '1'));
  validate(v, matchVatstoreGet(`vc.${mapID}.|${presenceRef}`, '1'));
  validate(
    v,
    matchVatstoreSet(`vc.${mapID}.${ordinalKey}`, stringValString('arbitrary')),
  );

  validate(v, matchVatstoreGet(`vc.${setID}.|${presenceRef}`, NONE));
  validate(v, matchVatstoreGet(`vc.${setID}.|nextOrdinal`, '1'));
  validate(v, matchVatstoreSet(`vc.${setID}.|${presenceRef}`, '1'));
  validate(v, matchVatstoreSet(`vc.${setID}.|nextOrdinal`, '2'));
  validate(v, matchVatstoreSet(`vom.ir.${presenceRef}|${setID}`, '1'));
  validate(v, matchVatstoreGet(`vc.${setID}.|${presenceRef}`, '1'));
  validate(v, matchVatstoreSet(`vc.${setID}.${ordinalKey}`, nullValString));
  validateReturned(v, rp);
  validate(v, matchVatstoreSet('idCounters'));

  t.is(testHooks.countCollectionsForWeakKey(presenceRef), 2);
  t.is(testHooks.storeSizeInternal(mapRef(mapID)), 1);
  const prefix = `vom.ir.${presenceRef}|`;
  validate(v, matchVatstoreGetAfter('', prefix, NONE, [`${prefix}${mapID}`, '1']));
  validate(v, matchVatstoreGetAfter(`${prefix}${mapID}`, prefix, NONE, [`${prefix}${setID}`, '1']));
  validate(v, matchVatstoreGetAfter(`${prefix}${setID}`, prefix, NONE, [NONE, NONE]));
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
  validate(v, matchVatstoreGetAfter('', prefix, NONE, [`${prefix}${mapID}`, '1']));
  validate(v, matchDropImports(presenceRef));
  t.is(testHooks.countCollectionsForWeakKey(presenceRef), 2);
  t.is(testHooks.storeSizeInternal(mapRef(mapID)), 1);
  validate(v, matchVatstoreGetAfter('', prefix, NONE, [`${prefix}${mapID}`, '1']));
  validate(v, matchVatstoreGetAfter(`${prefix}${mapID}`, prefix, NONE, [`${prefix}${setID}`, '1']));
  validate(v, matchVatstoreGetAfter(`${prefix}${setID}`, prefix, NONE, [NONE, NONE]));
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
  validate(v, matchVatstoreGetAfter('', prefix, NONE, [`${prefix}${mapID}`, '1']));
  validate(v, matchVatstoreDelete(`${prefix}${mapID}`));
  validate(v, matchVatstoreGet(`vc.${mapID}.|${presenceRef}`, '1'));
  validate(v, matchVatstoreDelete(`vc.${mapID}.|${presenceRef}`));
  validate(v, matchVatstoreGet(`vc.${mapID}.${ordinalKey}`, stringValString('arbitrary')));
  validate(v, matchVatstoreDelete(`vc.${mapID}.${ordinalKey}`));
  validate(v, matchVatstoreGetAfter(`${prefix}${mapID}`, prefix, NONE, [`${prefix}${setID}`, '1']));
  validate(v, matchVatstoreDelete(`${prefix}${setID}`));
  validate(v, matchVatstoreGet(`vc.${setID}.|${presenceRef}`, '1'));
  validate(v, matchVatstoreDelete(`vc.${setID}.|${presenceRef}`));
  validate(v, matchVatstoreGet(`vc.${setID}.${ordinalKey}`, nullValString));
  validate(v, matchVatstoreDelete(`vc.${setID}.${ordinalKey}`));
  validate(v, matchVatstoreGetAfter(`${prefix}${setID}`, prefix, NONE, [NONE, NONE]));
  validateRefCountCheck(v, presenceRef, NONE);
  validateWeakCheckEmpty(v, presenceRef);
  validate(v, matchDropImports(presenceRef));
  validate(v, matchRetireImports(presenceRef));
  validateDone(v);

  t.is(testHooks.countCollectionsForWeakKey(presenceRef), 0);
  t.is(testHooks.storeSizeInternal(mapRef(mapID)), 0);
  validateWeakCheckEmpty(v, presenceRef);
  validate(v, matchVatstoreGetAfter('', `vc.${mapID}.`, `vc.${mapID}.{`, DONE));
  t.is(testHooks.storeSizeInternal(mapRef(setID)), 0);
  validate(v, matchVatstoreGetAfter('', `vc.${setID}.`, `vc.${setID}.{`, DONE));
  validateDone(v);
});
