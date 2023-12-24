// eslint-disable-next-line import/order
import { test } from '../../../tools/prepare-test-env-ava.js';

import { kunser } from '@agoric/kmarshal';
import { initSwingStore } from '@agoric/swing-store';
import { parseReachableAndVatSlot } from '../../../src/kernel/state/reachable.js';
import {
  initializeSwingset,
  makeSwingsetController,
} from '../../../src/index.js';

function bfile(name) {
  return new URL(name, import.meta.url).pathname;
}

const config = {
  includeDevDependencies: true, // for vat-data
  bootstrap: 'bootstrap',
  // defaultReapInterval: 'never',
  // defaultReapInterval: 1,
  vats: {
    bootstrap: { sourceSpec: bfile('bootstrap-vdata-promises.js') },
    target: {
      sourceSpec: bfile('vat-vdata-promises.js'),
    },
  },
};

test('imported promises in vdata', async t => {
  const kernelStorage = initSwingStore().kernelStorage;
  const { kvStore } = kernelStorage;
  await initializeSwingset(config, [], kernelStorage);
  const c = await makeSwingsetController(kernelStorage);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  c.pinVatRoot('target');
  const vatID = c.vatNameToID('target');
  await c.run();

  const kpid1 = c.queueToVatRoot('bootstrap', 'doImportTest1', []);
  await c.run();
  t.is(c.kpStatus(kpid1), 'fulfilled');
  const res1 = c.kpResolution(kpid1);
  // console.log(res1); // [p1, p2, p3]
  const res1Val = kunser(res1);
  t.is(res1Val.length, 3);
  const [p1kref, p2kref, p3kref] = res1Val;

  c.queueToVatRoot('bootstrap', 'doImportTest2', [], 'panic');
  await c.run();

  const kpid2 = c.queueToVatRoot('bootstrap', 'doImportTest3', []);
  await c.run();
  t.is(c.kpStatus(kpid2), 'fulfilled');
  const res2 = c.kpResolution(kpid2);
  const res2Val = kunser(res2);
  t.deepEqual(res2Val, [1, 2, 2, 3, 3]);

  // check clist for promise retirement

  function has(kref) {
    const s = kvStore.get(`${vatID}.c.${kref}`);
    // returns undefined, or { vatSlot, isReachable }
    return s && parseReachableAndVatSlot(s);
  }
  t.falsy(has(`${p1kref}`));
  t.falsy(has(`${p2kref}`));
  t.falsy(has(`${p3kref}`));
});

test('result promises in vdata', async t => {
  const kernelStorage = initSwingStore().kernelStorage;
  const { kvStore } = kernelStorage;
  await initializeSwingset(config, [], kernelStorage);
  const c = await makeSwingsetController(kernelStorage);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  c.pinVatRoot('target');
  const vatID = c.vatNameToID('target');
  await c.run();

  const kpid1 = c.queueToVatRoot('bootstrap', 'doResultTest1', []);
  await c.run();
  t.is(c.kpStatus(kpid1), 'fulfilled');
  const res1 = c.kpResolution(kpid1);
  // console.log(res1); // [p4, p5, p6]
  const res1Val = kunser(res1);
  t.is(res1Val.length, 3);
  const [p4kref, p5kref, p6kref] = res1Val;

  c.queueToVatRoot('bootstrap', 'doResultTest2', [], 'panic');
  await c.run();

  const kpid2 = c.queueToVatRoot('bootstrap', 'doResultTest3', []);
  await c.run();
  t.is(c.kpStatus(kpid2), 'fulfilled');
  const res2 = c.kpResolution(kpid2);
  const res2Val = kunser(res2);
  t.deepEqual(res2Val, [4, 5, 5, 6, 6]);

  // check clist for promise retirement

  function has(kref) {
    const s = kvStore.get(`${vatID}.c.${kref}`);
    // returns undefined, or { vatSlot, isReachable }
    return s && parseReachableAndVatSlot(s);
  }
  t.falsy(has(`${p4kref}`));
  t.falsy(has(`${p5kref}`));
  t.falsy(has(`${p6kref}`));
});

test('exported promises in vdata', async t => {
  const kernelStorage = initSwingStore().kernelStorage;
  const { kvStore } = kernelStorage;
  await initializeSwingset(config, [], kernelStorage);
  const c = await makeSwingsetController(kernelStorage);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  c.pinVatRoot('target');
  const vatID = c.vatNameToID('target');
  await c.run();

  const kpid1 = c.queueToVatRoot('bootstrap', 'doStoreTest1', []);
  await c.run();
  t.is(c.kpStatus(kpid1), 'fulfilled');
  const res1 = c.kpResolution(kpid1);
  // console.log(res1); // { data, resolutions }
  const res1Val = kunser(res1);
  t.deepEqual(res1Val.data.is, {
    p7is: true,
    p8is: true,
    p9is: true,
    p10is: true,
    p14is: true,
  });
  t.deepEqual(res1Val.resolutions, {
    p9: 9,
    p10: 10,
    p11: 11,
    p12: 12,
    p13: 13,
    p14: 14,
  });

  function has(kref) {
    const s = kvStore.get(`${vatID}.c.${kref}`);
    // returns undefined, or { vatSlot, isReachable }
    return s && parseReachableAndVatSlot(s);
  }

  // all these promises should be resolved by now, and retired from
  // the clist
  const promises = res1Val.data.ret;
  for (const pname of Object.keys(promises)) {
    t.falsy(has(`${promises[pname]}`));
  }
});
