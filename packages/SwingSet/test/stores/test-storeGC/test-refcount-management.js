// eslint-disable-next-line import/order
import { test } from '../../../tools/prepare-test-env-ava.js';

import {
  setupTestLiveslots,
  matchVatstoreGet,
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
  mainHeldIdx,
  mapRef,
  mapRefValString,
  NONE,
  nullValString,
  refValString,
  thingArg,
  thingRefValString,
  validateCreate,
  validateDeleteMetadata,
  validateExportStatusCheck,
  validateImportAndHold,
  validateInit,
  validateMakeAndHold,
  validateRefCountCheck,
  validateStatusCheck,
  validateUpdate,
  validateWeakCheckEmpty,
} from './gc-helpers.js';

// These tests follow the model described in
// ../virtualObjects/test-virtualObjectGC.js

// NOTE: these tests must be run serially, since they share a heap and garbage
// collection during one test can interfere with the deterministic behavior of a
// different test.

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
  validateUpdate(v, `vom.rc.${mapRef(mainHeldIdx)}`, NONE, '1');
  validate(v, matchVatstoreSet(`vc.${base}.sfoo`, mapRefValString(mainHeldIdx)));
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

  const [targ, tslot] = thingArg(presenceRef);
  let rp = await dispatchMessage('importAndHold', [targ], [tslot]);
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
  validateWeakCheckEmpty(v, presenceRef);
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

  const [targ, tslot] = thingArg(presenceRef);
  let rp = await dispatchMessage('importAndHold', [targ], [tslot]);
  validateInit(v);
  validateImportAndHold(v, rp);

  rp = await dispatchMessage('prepareStore3');
  validatePrepareStore3(v, rp, mainHeldIdx, presenceRef, thingRefValString(presenceRef), false);

  rp = await dispatchMessage('finishDropHolders');
  validateReturned(v, rp);
  validateRefCountCheck(v, mapRef(base), NONE);
  validateDeleteMetadata(v, NONE, base, 1, presenceRef, 'thing', 3);
  validateRefCountCheck(v, mapRef(base + 1), NONE);
  validateDeleteMetadata(v, NONE, base + 1, 1, presenceRef, 'thing', 2);
  validateRefCountCheck(v, mapRef(base + 2), NONE);
  validateDeleteMetadata(v, NONE, base + 2, 1, presenceRef, 'thing', 1);

  validate(v, matchVatstoreGet(`vom.rc.${presenceRef}`, NONE));
  validateWeakCheckEmpty(v, presenceRef);
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
  const remotableRef = 'o+10';

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
  const remotableRef = 'o+10';

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
