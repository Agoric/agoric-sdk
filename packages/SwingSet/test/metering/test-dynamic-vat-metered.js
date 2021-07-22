/* global __dirname */
// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import path from 'path';
import bundleSource from '@agoric/bundle-source';
import { provideHostStorage } from '../../src/hostStorage.js';
import { buildKernelBundles, buildVatController } from '../../src/index.js';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

async function prepare() {
  const kernelBundles = await buildKernelBundles();
  // we'll give this bundle to the loader vat, which will use it to create a
  // new (metered) dynamic vat
  const dynamicVatBundle = await bundleSource(
    path.join(__dirname, 'metered-dynamic-vat.js'),
  );
  const bootstrapBundle = await bundleSource(
    path.join(__dirname, 'vat-load-dynamic.js'),
  );
  return { kernelBundles, dynamicVatBundle, bootstrapBundle };
}

test.before(async t => {
  t.context.data = await prepare();
});

function kpidRejected(t, c, kpid, message) {
  t.is(c.kpStatus(kpid), 'rejected');
  const resCapdata = c.kpResolution(kpid);
  t.deepEqual(resCapdata.slots, []);
  const body = JSON.parse(resCapdata.body);
  delete body.errorId;
  t.deepEqual(body, { '@qclass': 'error', name: 'Error', message });
}

async function overflowCrank(t, explosion) {
  const managerType = 'xs-worker';
  const { kernelBundles, dynamicVatBundle, bootstrapBundle } = t.context.data;
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: bootstrapBundle,
      },
    },
  };
  const hostStorage = provideHostStorage();
  const kvStore = hostStorage.kvStore;
  const c = await buildVatController(config, [], {
    hostStorage,
    kernelBundles,
  });
  c.pinVatRoot('bootstrap');

  // let the vatAdminService get wired up before we create any new vats
  await c.run();

  // 'createVat' will import the bundle
  const cvopts = { managerType, metered: true };
  const cvargs = capargs([dynamicVatBundle, cvopts]);
  const kp2 = c.queueToVatRoot('bootstrap', 'createVat', cvargs);
  await c.run();
  const res2 = c.kpResolution(kp2);
  t.is(JSON.parse(res2.body)[0], 'created', res2.body);
  const doneKPID = res2.slots[0];

  // extract the vatID for the newly-created dynamic vat
  const dynamicVatIDs = JSON.parse(kvStore.get('vat.dynamicIDs'));
  t.is(dynamicVatIDs.length, 1);
  const vatID = dynamicVatIDs[0];
  // and it's root object, by peeking into its c-list
  const root = kvStore.get(`${vatID}.c.o+0`);

  // and grab a kpid that won't be resolved until the vat dies
  const r = c.queueToVatRoot('bootstrap', 'getNever', capargs([]));
  await c.run();
  const neverArgs = c.kpResolution(r);
  const neverKPID = neverArgs.slots[0];

  // First, send a message to the dynamic vat that runs normally
  const kp3 = c.queueToVatRoot('bootstrap', 'run', capargs([]));
  await c.run();
  t.is(JSON.parse(kvStore.get('vat.dynamicIDs')).length, 1);
  t.is(kvStore.get(`${root}.owner`), vatID);
  t.true(Array.from(kvStore.getKeys(`${vatID}`, `${vatID}/`)).length > 0);
  // neverP and doneP should still be unresolved
  t.is(c.kpStatus(neverKPID), 'unresolved');
  t.is(c.kpStatus(doneKPID), 'unresolved');
  t.deepEqual(c.kpResolution(kp3), capargs(42));

  // Now send a message that makes the dynamic vat exhaust its per-crank
  // meter. The message result promise should be rejected, and the control
  // facet should report the vat's demise. Remnants of the killed vat should
  // be gone from the kernel state store.
  const kp4 = c.queueToVatRoot('bootstrap', 'explode', capargs([explosion]));
  await c.run();
  kpidRejected(t, c, kp4, 'vat terminated');
  t.is(JSON.parse(kvStore.get('vat.dynamicIDs')).length, 0);
  t.is(kvStore.get(`${root}.owner`), undefined);
  t.is(Array.from(kvStore.getKeys(`${vatID}`, `${vatID}/`)).length, 0);
  // neverP should be rejected, without revealing details
  kpidRejected(t, c, neverKPID, 'vat terminated');

  // but doneP gets more details
  const expected = {
    allocate: 'Allocate meter exceeded',
    compute: 'Compute meter exceeded',
    stack: 'Stack meter exceeded',
  };
  kpidRejected(t, c, doneKPID, expected[explosion]);

  // the dead vat should stay dead
  const kp5 = c.queueToVatRoot('bootstrap', 'run', capargs([]));
  await c.run();
  kpidRejected(t, c, kp5, 'vat terminated');
}

test('exceed allocate', t => {
  return overflowCrank(t, 'allocate');
});

test('exceed per-crank compute', t => {
  return overflowCrank(t, 'compute');
});

test('exceed stack', t => {
  return overflowCrank(t, 'stack');
});
