// @ts-nocheck
// eslint-disable-next-line import/order
import { test } from '../../../tools/prepare-test-env-ava.js';

import { assert } from '@endo/errors';
import { kunser, krefOf } from '@agoric/kmarshal';
import { initSwingStore } from '@agoric/swing-store';
import { parseReachableAndVatSlot } from '../../../src/kernel/state/reachable.js';
import {
  initializeSwingset,
  makeSwingsetController,
} from '../../../src/index.js';

function bfile(name) {
  return new URL(name, import.meta.url).pathname;
}

function getImportSensorKref(impcapdata, i) {
  return ['slot', krefOf(kunser(impcapdata)[i])];
}

test('collection entry slots trigger doMoreGC', async t => {
  const config = {
    includeDevDependencies: true, // for vat-data
    bootstrap: 'bootstrap',
    // defaultReapInterval: 'never',
    // defaultReapInterval: 1,
    vats: {
      bootstrap: { sourceSpec: bfile('bootstrap-collection-slots.js') },
      target: {
        sourceSpec: bfile('vat-collection-slots.js'),
      },
    },
  };

  const kernelStorage = initSwingStore().kernelStorage;
  const { kvStore } = kernelStorage;
  await initializeSwingset(config, [], kernelStorage);
  const c = await makeSwingsetController(kernelStorage);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  c.pinVatRoot('target');
  const vatID = c.vatNameToID('target');
  await c.run();

  async function run(method, args = []) {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', method, args);
    await c.run();
    const status = c.kpStatus(kpid);
    const result = c.kpResolution(kpid);
    return [status, result];
  }

  function has(kref) {
    const s = kvStore.get(`${vatID}.c.${kref}`);
    // returns undefined, or { vatSlot, isReachable }
    return s && parseReachableAndVatSlot(s);
  }

  // fetch the "importSensor": exported by bootstrap, imported by the
  // other vat. We'll determine its kref and later query the other vat
  // to see if it's still importing one or not
  const [impstatus, impresult] = await run('getImportSensors', []);
  t.is(impstatus, 'fulfilled');
  const imp1kref = getImportSensorKref(impresult, 0)[1];

  // at this point, vat-target has not yet seen the sensors
  t.is(has(imp1kref), undefined);

  // step1() creates vc1 -> vc2 -> rem1 -> imp1 . That is, it makes a
  // virtual collection (vc1) with an entry whose value is a second
  // virtual collection (vc2). "vc2" has an entry whose value is a
  // Remotable (rem1). The Remotable closes over the imported Presence
  // imp1.

  const [step1status] = await run('step1', []);
  t.is(step1status, 'fulfilled');

  // now vat-target should be importing the sensor
  t.true(has(imp1kref).isReachable);

  // step2() deletes vc2 from vc1. This adds vc2 to `possiblyDeadSet`,
  // so the subsequent bringOutYourDead() and scanForDeadObjects()
  // checks its refcounts (now zero) and deletes it. While deleting
  // vc2, it deletes the entry whose value is rem1 by calling
  // removeReachableVref(). As this was the only vdata reference to
  // rem1, it removes rem1 from `remotableRefCounts` (removing the
  // last RAM reference to the Remotable) and is thus supposed to
  // return `doMoreGC = true` to inform scanForDeadObjects() that it
  // needs to run `gcAndFinalize` again (and repeat the
  // `scanForDeadObjects loop). It needs to do this because if the
  // Remotable is really gone, it's no longer closing over anything,
  // and the only way to sense that is to force GC and let the
  // finalizers run.

  // The bug (#5044) was that the collection's deleteInternal() was
  // not reporting the doMoreGC returned by removeReachableVref(): it
  // did value.slots.forEach(vrm.removeReachableVref) and didn't pay
  // attention to the return value.
  const [step2status] = await run('step2', []);
  t.is(step2status, 'fulfilled');

  // If the bug is happening, 'rem1' is released but we don't repeat
  // the loop, so we don't run `gcAndFinalize` in that crank, and
  // neither 'rem1' nor 'imp1' get released. If the bug is fixed, the
  // finalizer sees both 'rem1' and 'imp1' released, and we can see
  // 'imp1' get removed from the c-list.

  t.is(has(imp1kref), undefined);

  const [step3status] = await run('step3', []);
  t.is(step3status, 'fulfilled');

  // even with the bug, a subsequent BOYD should let rem1/imp1 drop
  t.is(has(imp1kref), undefined);
});
