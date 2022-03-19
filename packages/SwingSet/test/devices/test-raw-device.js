// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import bundleSource from '@endo/bundle-source';
import { parse } from '@endo/marshal';
import { provideHostStorage } from '../../src/controller/hostStorage.js';

import {
  initializeSwingset,
  makeSwingsetController,
  buildKernelBundles,
} from '../../src/index.js';
import { capargs } from '../util.js';

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
  const deviceEndowments = {
    dr: {
      shared: sharedArray,
    },
  };

  const hostStorage = provideHostStorage();
  await initializeSwingset(config, [], hostStorage, t.context.data);
  const c = await makeSwingsetController(hostStorage, deviceEndowments);
  c.pinVatRoot('bootstrap');
  await c.run();

  // first, exercise plain arguments and return values
  const r1 = c.queueToVatRoot('bootstrap', 'step1', capargs([]));
  await c.run();
  t.deepEqual(JSON.parse(c.kpResolution(r1).body), { a: 4, b: [5, 6] });
  t.deepEqual(sharedArray, ['pushed']);
  sharedArray.length = 0;

  // exercise giving objects to devices, getting them back, and the device's
  // ability to do sendOnly to those objects
  const r2 = c.queueToVatRoot('bootstrap', 'step2', capargs([]));
  await c.run();
  const expected2 = ['got', true, 'hi ping1', true, 'hi ping2', true];
  t.deepEqual(JSON.parse(c.kpResolution(r2).body), expected2);

  // create and pass around new device nodes
  const r3 = c.queueToVatRoot('bootstrap', 'step3', capargs([]));
  await c.run();
  const expected3 = [
    ['dn1', 21, true, true],
    ['dn2', 22, true, true],
  ];
  t.deepEqual(JSON.parse(c.kpResolution(r3).body), expected3);

  // check that devices can manage state through vatstore
  const r4 = c.queueToVatRoot('bootstrap', 'step4', capargs([]));
  await c.run();
  const expected4 = [
    [undefined, undefined],
    ['value1', undefined],
    [undefined, undefined],
  ];
  t.deepEqual(parse(c.kpResolution(r4).body), expected4);

  // check that device exceptions do not kill the device, calling vat, or kernel
  const r5 = c.queueToVatRoot('bootstrap', 'step5', capargs([]));
  await c.run();
  // body: '{"@qclass":"error","errorId":"error:liveSlots:v1#70001","message":"syscall.callNow failed: device.invoke failed, see logs for details","name":"Error"}',
  const expected5 = Error(
    'syscall.callNow failed: device.invoke failed, see logs for details',
  );
  t.deepEqual(parse(c.kpResolution(r5).body), expected5);

  // and raw devices can return an error result
  const r6 = c.queueToVatRoot('bootstrap', 'step6', capargs([]));
  await c.run();
  // body: '{"@qclass":"error","errorId":"error:liveSlots:v1#70001","message":"syscall.callNow failed: device.invoke failed, see logs for details","name":"Error"}',
  const expected6 = Error(
    'syscall.callNow failed: deliberate raw-device result error',
  );
  t.deepEqual(parse(c.kpResolution(r6).body), expected6);
});
