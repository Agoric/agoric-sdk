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

test('VO property deletion is not short-circuited', async t => {
  const config = {
    includeDevDependencies: true, // for vat-data
    bootstrap: 'bootstrap',
    // defaultReapInterval: 'never',
    // defaultReapInterval: 1,
    vats: {
      bootstrap: { sourceSpec: bfile('bootstrap-delete-stored-vo.js') },
      target: {
        sourceSpec: bfile('vat-delete-stored-vo.js'),
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
  const [impstatus, impcapdata] = await run('getImportSensors', []);
  t.is(impstatus, 'fulfilled');
  const imp1kref = getImportSensorKref(impcapdata, 0)[1];

  // at this point, vat-target has not yet seen the sensors
  t.is(has(imp1kref), undefined);

  // step1() creates vc1 -> vo1 -> [rem1, imp1]

  const [step1status] = await run('step1', []);
  t.is(step1status, 'fulfilled');

  // now vat-target should be importing the sensor
  t.true(has(imp1kref).isReachable);

  // step2() deletes vo1 from vc1. This walks all properties of vo1's
  // state, and for each one, it walks all slots of the values. For
  // each slot, it uses vrm.removeReachableVref(vref) to decref the
  // now-unreferenced object, and pays attention to the doMoreGC
  // return value of removeReachableVref (which is 'true' if the
  // object was a Remotable, requiring another gcAndFinalize pass).

  // The bug (#5044) was that this loop short-circuited the decref if
  // doMoreGC was true. That is, it did:
  //
  // propValue.slots.forEach(
  //   vref => (doMoreGC = doMoreGC || vrm.removeReachableVref(vref)),
  // );
  //
  // instead of:
  //
  // propValue.slots.forEach(
  //   vref => (doMoreGC = vrm.removeReachableVref(vref) || doMoreGC),
  // );
  //
  // as a result, the removeReachableVref() would not be called on any
  // slot after a Remotable.

  const [step2status] = await run('step2', []);
  t.is(step2status, 'fulfilled');

  // If the bug is happening, 'rem1' is released not 'imp1'. If the
  // bug is fixed, we call removeReachableVref(imp1), and we can see
  // 'imp1' get removed from the c-list.

  t.is(has(imp1kref), undefined);
});
