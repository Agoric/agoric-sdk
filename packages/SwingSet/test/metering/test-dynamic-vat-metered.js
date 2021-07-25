/* global __dirname */
/* eslint-disable no-await-in-loop */
// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import path from 'path';
import bundleSource from '@agoric/bundle-source';
import { parse } from '@agoric/marshal';
import { provideHostStorage } from '../../src/hostStorage.js';
import { buildKernelBundles, buildVatController } from '../../src/index.js';
import { capargs } from '../util.js';

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

function extractSlot(t, data) {
  const marg = JSON.parse(data.body);
  t.is(marg['@qclass'], 'slot');
  t.is(marg.index, 0);
  return { marg, meterKref: data.slots[0] };
}

test('meter objects', async t => {
  const { kernelBundles, bootstrapBundle } = t.context.data;
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: bootstrapBundle,
      },
    },
  };
  const hostStorage = provideHostStorage();
  const c = await buildVatController(config, [], {
    hostStorage,
    kernelBundles,
  });
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');

  // let the vatAdminService get wired up before we create any new vats
  await c.run();

  // create and manipulate a meter without attaching it to a vat
  const cmargs = capargs([10n, 5n]); // remaining, notify threshold
  const kp1 = c.queueToVatRoot('bootstrap', 'createMeter', cmargs);
  await c.run();
  const { marg, meterKref } = extractSlot(t, c.kpResolution(kp1));
  async function doMeter(method, ...args) {
    const kp = c.queueToVatRoot(
      'bootstrap',
      method,
      capargs([marg, ...args], [meterKref]),
    );
    await c.run();
    return c.kpResolution(kp);
  }
  async function getMeter() {
    const res = await doMeter('getMeter');
    return parse(res.body);
  }

  t.deepEqual(await getMeter(), { remaining: 10n, threshold: 5n });
  await doMeter('addMeterRemaining', 8n);
  t.deepEqual(await getMeter(), { remaining: 18n, threshold: 5n });
  await doMeter('setMeterThreshold', 7n);
  t.deepEqual(await getMeter(), { remaining: 18n, threshold: 7n });
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
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');

  // let the vatAdminService get wired up before we create any new vats
  await c.run();

  // create a meter with 10M remaining
  const cmargs = capargs([10000000n, 5000000n]); // remaining, notifyThreshold
  const kp1 = c.queueToVatRoot('bootstrap', 'createMeter', cmargs);
  await c.run();
  const { marg, meterKref } = extractSlot(t, c.kpResolution(kp1));

  // 'createVat' will import the bundle
  const cvopts = { managerType, meter: marg };
  const cvargs = capargs([dynamicVatBundle, cvopts], [meterKref]);
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

test('meter decrements', async t => {
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
  const c = await buildVatController(config, [], {
    hostStorage,
    kernelBundles,
  });
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');

  // let the vatAdminService get wired up before we create any new vats
  await c.run();

  // create a meter with 200k remaining and a 100K notification threshold
  const cmargs = capargs([200000n, 100000n]); // remaining, notifyThreshold
  const kp1 = c.queueToVatRoot('bootstrap', 'createMeter', cmargs);
  await c.run();
  const { marg, meterKref } = extractSlot(t, c.kpResolution(kp1));
  // and watch for its notifyThreshold to fire
  const notifyKPID = c.queueToVatRoot(
    'bootstrap',
    'whenMeterNotifiesNext',
    capargs([marg], [meterKref]),
  );

  // 'createVat' will import the bundle
  const cvargs = capargs(
    [dynamicVatBundle, { managerType, meter: marg }],
    [meterKref],
  );
  const kp2 = c.queueToVatRoot('bootstrap', 'createVat', cvargs);
  await c.run();
  const res2 = c.kpResolution(kp2);
  t.is(JSON.parse(res2.body)[0], 'created', res2.body);
  const doneKPID = res2.slots[0];

  async function getMeter() {
    const args = capargs([marg], [meterKref]);
    const kp = c.queueToVatRoot('bootstrap', 'getMeter', args);
    await c.run();
    const res = c.kpResolution(kp);
    const { remaining } = parse(res.body);
    return remaining;
  }

  async function consume(shouldComplete) {
    const kp = c.queueToVatRoot('bootstrap', 'run', capargs([]));
    await c.run();
    if (shouldComplete) {
      t.is(c.kpStatus(kp), 'fulfilled');
      t.deepEqual(c.kpResolution(kp), capargs(42));
    } else {
      t.is(c.kpStatus(kp), 'rejected');
      kpidRejected(t, c, kp, 'vat terminated');
    }
  }

  let remaining = await getMeter();
  t.is(remaining, 200000n);

  // messages to the metered vat should decrement the meter
  await consume(true);
  remaining = await getMeter();
  console.log(remaining);
  t.not(remaining, 200000n);

  // experiments show a simple 'run()' currently uses 36918 computrons the
  // first time, 36504 the subsequent times, so two more calls ought to
  // trigger the notification threshold
  await consume(true);
  remaining = await getMeter();
  console.log(remaining);
  t.is(c.kpStatus(notifyKPID), 'unresolved');
  // this one will trigger notification
  await consume(true);
  remaining = await getMeter();
  console.log(remaining);
  t.is(c.kpStatus(notifyKPID), 'fulfilled');
  const notification = c.kpResolution(notifyKPID);
  t.is(parse(notification.body).value, remaining);

  // doneP should still be unresolved
  t.is(c.kpStatus(doneKPID), 'unresolved');

  // three more calls should cause the meter to underflow, killing the vat
  await consume(true);
  remaining = await getMeter();
  console.log(remaining);
  // It looks like #3499 reduces this to two
  //  await consume(true);
  //  remaining = await getMeter();
  //  console.log(remaining);
  console.log(`consume() about to underflow`);
  await consume(false);
  remaining = await getMeter();
  console.log(remaining);
  t.is(remaining, 0n); // this checks postAbortActions.deductMeter

  // TODO: we currently provide a different .done error message for 1: a
  // single crank exceeds the fixed per-crank limit, and 2: the cumulative
  // usage caused the meterID to underflow. Should these be the same?
  kpidRejected(t, c, doneKPID, 'meter underflow, vat terminated');
});

test('unlimited meter', async t => {
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
  const c = await buildVatController(config, [], {
    hostStorage,
    kernelBundles,
  });
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');

  // let the vatAdminService get wired up before we create any new vats
  await c.run();

  // create an unlimited meter
  const cmargs = capargs([]);
  const kp1 = c.queueToVatRoot('bootstrap', 'createUnlimitedMeter', cmargs);
  await c.run();
  const { marg, meterKref } = extractSlot(t, c.kpResolution(kp1));

  // 'createVat' will import the bundle
  const cvargs = capargs(
    [dynamicVatBundle, { managerType, meter: marg }],
    [meterKref],
  );
  const kp2 = c.queueToVatRoot('bootstrap', 'createVat', cvargs);
  await c.run();
  const res2 = c.kpResolution(kp2);
  t.is(JSON.parse(res2.body)[0], 'created', res2.body);
  const doneKPID = res2.slots[0];

  async function getMeter() {
    const args = capargs([marg], [meterKref]);
    const kp = c.queueToVatRoot('bootstrap', 'getMeter', args);
    await c.run();
    const res = c.kpResolution(kp);
    const { remaining } = parse(res.body);
    return remaining;
  }

  async function consume(shouldComplete) {
    const kp = c.queueToVatRoot('bootstrap', 'run', capargs([]));
    await c.run();
    if (shouldComplete) {
      t.is(c.kpStatus(kp), 'fulfilled');
      t.deepEqual(c.kpResolution(kp), capargs(42));
    } else {
      t.is(c.kpStatus(kp), 'rejected');
      kpidRejected(t, c, kp, 'vat terminated');
    }
  }

  let remaining = await getMeter();
  t.is(remaining, 'unlimited');

  // messages to the vat do not decrement the meter
  await consume(true);
  remaining = await getMeter();
  t.is(remaining, 'unlimited');

  // but each crank is still limited, so an infinite loop will kill the vat
  const kp4 = c.queueToVatRoot('bootstrap', 'explode', capargs(['compute']));
  await c.run();
  kpidRejected(t, c, kp4, 'vat terminated');
  kpidRejected(t, c, doneKPID, 'Compute meter exceeded');
});

// Cause both a notify and an underflow in the same delivery. Without
// postAbortActions, the notify would get unwound by the vat termination, and
// would never be delivered.
test('notify and underflow', async t => {
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
  const c = await buildVatController(config, [], {
    hostStorage,
    kernelBundles,
  });
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');

  // let the vatAdminService get wired up before we create any new vats
  await c.run();

  // create a meter with 200k remaining and a notification threshold of 1
  const cmargs = capargs([200000n, 1n]); // remaining, notifyThreshold
  const kp1 = c.queueToVatRoot('bootstrap', 'createMeter', cmargs);
  await c.run();
  const { marg, meterKref } = extractSlot(t, c.kpResolution(kp1));
  // and watch for its notifyThreshold to fire
  const notifyKPID = c.queueToVatRoot(
    'bootstrap',
    'whenMeterNotifiesNext',
    capargs([marg], [meterKref]),
  );

  // 'createVat' will import the bundle
  const cvargs = capargs(
    [dynamicVatBundle, { managerType, meter: marg }],
    [meterKref],
  );
  const kp2 = c.queueToVatRoot('bootstrap', 'createVat', cvargs);
  await c.run();
  const res2 = c.kpResolution(kp2);
  t.is(JSON.parse(res2.body)[0], 'created', res2.body);
  const doneKPID = res2.slots[0];

  async function getMeter() {
    const args = capargs([marg], [meterKref]);
    const kp = c.queueToVatRoot('bootstrap', 'getMeter', args);
    await c.run();
    const res = c.kpResolution(kp);
    const { remaining } = parse(res.body);
    return remaining;
  }

  async function consume(shouldComplete) {
    const kp = c.queueToVatRoot('bootstrap', 'run', capargs([]));
    await c.run();
    if (shouldComplete) {
      t.is(c.kpStatus(kp), 'fulfilled');
      t.deepEqual(c.kpResolution(kp), capargs(42));
    } else {
      t.is(c.kpStatus(kp), 'rejected');
      kpidRejected(t, c, kp, 'vat terminated');
    }
  }

  // run three consume() calls to measure the usage of the last
  await consume(true);
  await consume(true);
  const remaining1 = await getMeter();
  await consume(true);
  let remaining = await getMeter();
  const oneCycle = remaining1 - remaining;
  // console.log(`one cycle appears to use ${oneCycle} computrons`);

  // keep consuming until there is less than oneCycle remaining
  while (remaining > oneCycle) {
    await consume(true);
    remaining = await getMeter();
    // console.log(` now ${remaining}`);
  }

  // the next cycle should underflow *and* trip the absurdly low notification
  // threshold
  // console.log(`-- doing last consume()`);
  await consume(false);
  remaining = await getMeter();
  t.is(remaining, 0n); // this checks postAbortActions.deductMeter
  t.is(c.kpStatus(notifyKPID), 'fulfilled'); // and pAA.meterNotifications
  const notification = c.kpResolution(notifyKPID);
  t.is(parse(notification.body).value, 0n);
  kpidRejected(t, c, doneKPID, 'meter underflow, vat terminated');
});
