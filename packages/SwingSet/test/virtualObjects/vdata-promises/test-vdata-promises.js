// eslint-disable-next-line import/order
import { test } from '../../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { provideHostStorage } from '../../../src/controller/hostStorage.js';
import { parseReachableAndVatSlot } from '../../../src/kernel/state/reachable.js';
import {
  initializeSwingset,
  makeSwingsetController,
} from '../../../src/index.js';
import { capargs } from '../../util.js';

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
      creationOptions: {
        virtualObjectCacheSize: 0,
      },
    },
  },
};

test('imported promises in vdata', async t => {
  const hostStorage = provideHostStorage();
  const { kvStore } = hostStorage;
  await initializeSwingset(config, [], hostStorage);
  const c = await makeSwingsetController(hostStorage);
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
  t.deepEqual(JSON.parse(res1.body), [
    { '@qclass': 'slot', index: 0 },
    { '@qclass': 'slot', index: 1 },
    { '@qclass': 'slot', index: 2 },
  ]);
  const [p1kref, p2kref, p3kref] = res1.slots;

  c.queueToVatRoot('bootstrap', 'doImportTest2', [], 'panic');
  await c.run();

  const kpid2 = c.queueToVatRoot('bootstrap', 'doImportTest3', []);
  await c.run();
  t.is(c.kpStatus(kpid2), 'fulfilled');
  const res2 = c.kpResolution(kpid2);
  t.deepEqual(res2, capargs([1, 2, 2, 3, 3]));

  // check clist for promise retirement

  function has(kref) {
    const s = kvStore.get(`${vatID}.c.${kref}`);
    // returns undefined, or { vatSlot, isReachable }
    return s && parseReachableAndVatSlot(s);
  }
  t.falsy(has(p1kref));
  t.falsy(has(p2kref));
  t.falsy(has(p3kref));
});

test('result promises in vdata', async t => {
  const hostStorage = provideHostStorage();
  const { kvStore } = hostStorage;
  await initializeSwingset(config, [], hostStorage);
  const c = await makeSwingsetController(hostStorage);
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
  t.deepEqual(JSON.parse(res1.body), [
    { '@qclass': 'slot', index: 0 },
    { '@qclass': 'slot', index: 1 },
    { '@qclass': 'slot', index: 2 },
  ]);
  const [p4kref, p5kref, p6kref] = res1.slots;

  c.queueToVatRoot('bootstrap', 'doResultTest2', [], 'panic');
  await c.run();

  const kpid2 = c.queueToVatRoot('bootstrap', 'doResultTest3', []);
  await c.run();
  t.is(c.kpStatus(kpid2), 'fulfilled');
  const res2 = c.kpResolution(kpid2);
  t.deepEqual(res2, capargs([4, 5, 5, 6, 6]));

  // check clist for promise retirement

  function has(kref) {
    const s = kvStore.get(`${vatID}.c.${kref}`);
    // returns undefined, or { vatSlot, isReachable }
    return s && parseReachableAndVatSlot(s);
  }
  t.falsy(has(p4kref));
  t.falsy(has(p5kref));
  t.falsy(has(p6kref));
});

test('exported promises in vdata', async t => {
  const hostStorage = provideHostStorage();
  const { kvStore } = hostStorage;
  await initializeSwingset(config, [], hostStorage);
  const c = await makeSwingsetController(hostStorage);
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
  t.deepEqual(JSON.parse(res1.body).data.is, {
    p7is: true,
    p8is: true,
    p9is: true,
    p10is: true,
    p14is: true,
  });
  t.deepEqual(JSON.parse(res1.body).resolutions, {
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
  const promises = JSON.parse(res1.body).data.ret;
  for (const pname of Object.keys(promises)) {
    const obj = promises[pname];
    t.is(obj['@qclass'], 'slot');
    const slot = obj.index;
    const kref = res1.slots[slot];
    t.falsy(has(kref));
  }
});
