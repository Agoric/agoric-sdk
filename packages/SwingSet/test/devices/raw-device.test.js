// @ts-nocheck
// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import bundleSource from '@endo/bundle-source';
import { initSwingStore } from '@agoric/swing-store';
import { kunser } from '@agoric/kmarshal';

import {
  initializeSwingset,
  makeSwingsetController,
  buildKernelBundles,
} from '../../src/index.js';
import { bundleOpts } from '../util.js';

function dfile(name) {
  return new URL(`./${name}`, import.meta.url).pathname;
}

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  const bootstrapRaw = await bundleSource(dfile('bootstrap-raw.js'));
  t.context.data = {
    kernelBundles,
    bootstrapRaw,
  };
});

test('d1', async t => {
  const sharedArray = [];
  const config = {
    bootstrap: 'bootstrap',
    defaultReapInterval: 'never',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrapRaw,
      },
    },
    devices: {
      dr: {
        sourceSpec: dfile('device-raw-0'),
      },
    },
  };
  const devEndows = {
    dr: {
      shared: sharedArray,
    },
  };

  const { initOpts, runtimeOpts } = bundleOpts(t.context.data);
  const kernelStorage = initSwingStore().kernelStorage;
  await initializeSwingset(config, [], kernelStorage, initOpts);
  const c = await makeSwingsetController(kernelStorage, devEndows, runtimeOpts);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  await c.run();

  // first, exercise plain arguments and return values
  const r1 = c.queueToVatRoot('bootstrap', 'step1', []);
  await c.run();
  t.deepEqual(kunser(c.kpResolution(r1)), { a: 4, b: [5, 6] });
  t.deepEqual(sharedArray, ['pushed']);
  sharedArray.length = 0;

  // exercise giving objects to devices, getting them back, and the device's
  // ability to do sendOnly to those objects
  const r2 = c.queueToVatRoot('bootstrap', 'step2', []);
  await c.run();
  const expected2 = ['got', true, 'hi ping1', true, 'hi ping2', true];
  t.deepEqual(kunser(c.kpResolution(r2)), expected2);

  // create and pass around new device nodes
  const r3 = c.queueToVatRoot('bootstrap', 'step3', []);
  await c.run();
  const expected3 = [
    ['dn1', 21, true, true],
    ['dn2', 22, true, true],
  ];
  t.deepEqual(kunser(c.kpResolution(r3)), expected3);

  // check that devices can manage state through vatstore
  const r4 = c.queueToVatRoot('bootstrap', 'step4', []);
  await c.run();
  const expected4 = [
    [undefined, undefined],
    ['value1', undefined],
    [undefined, undefined],
  ];
  t.deepEqual(kunser(c.kpResolution(r4)), expected4);

  // check that device exceptions do not kill the device, calling vat, or kernel
  const r5 = c.queueToVatRoot('bootstrap', 'step5', []);
  await c.run();
  const expected5 = Error(
    'syscall.callNow failed: device.invoke failed, see logs for details',
  );
  t.deepEqual(kunser(c.kpResolution(r5)), expected5);

  // and raw devices can return an error result
  const r6 = c.queueToVatRoot('bootstrap', 'step6', []);
  await c.run();
  const expected6 = Error(
    'syscall.callNow failed: deliberate raw-device result error',
  );
  t.deepEqual(kunser(c.kpResolution(r6)), expected6);
});
