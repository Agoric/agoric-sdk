// @ts-nocheck
// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import bundleSource from '@endo/bundle-source';
import { kunser, krefOf } from '@agoric/kmarshal';
import { initSwingStore } from '@agoric/swing-store';
import {
  buildKernelBundles,
  initializeSwingset,
  makeSwingsetController,
  loadBasedir,
} from '../../src/index.js';
import { bundleOpts, restartVatAdminVat } from '../util.js';
import { extractMethod } from '../../src/lib/kdebug.js';

function nonBundleFunction(_E) {
  return {};
}

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  const vat13Bundle = await bundleSource(
    new URL('new-vat-13.js', import.meta.url).pathname,
  );
  const vat44Bundle = await bundleSource(
    new URL('new-vat-44.js', import.meta.url).pathname,
  );
  const brokenModuleVatBundle = await bundleSource(
    new URL('broken-module-vat.js', import.meta.url).pathname,
  );
  const brokenRootVatBundle = await bundleSource(
    new URL('broken-root-vat.js', import.meta.url).pathname,
  );
  const brokenHangVatBundle = await bundleSource(
    new URL('broken-hang-vat.js', import.meta.url).pathname,
  );
  const durableRootVatBundle = await bundleSource(
    new URL('durable-root-vat.js', import.meta.url).pathname,
  );
  const vatRefcountBundle = await bundleSource(
    new URL('new-vat-refcount.js', import.meta.url).pathname,
  );
  const nonBundle = `${nonBundleFunction}`;
  const bundles = {
    vat13Bundle,
    vat44Bundle,
    brokenModuleVatBundle,
    brokenRootVatBundle,
    brokenHangVatBundle,
    durableRootVatBundle,
    vatRefcountBundle,
    nonBundle,
  };
  t.context.data = { kernelBundles, bundles };
});

async function doTestSetup(t, doVatAdminRestart = false, enableSlog = false) {
  const { bundles } = t.context.data;
  const config = await loadBasedir(new URL('./', import.meta.url).pathname);
  config.defaultManagerType = 'xs-worker';
  config.bundles = {
    new13: { bundle: bundles.vat13Bundle },
    brokenModule: { bundle: bundles.brokenModuleVatBundle },
    brokenRoot: { bundle: bundles.brokenRootVatBundle },
    brokenHang: { bundle: bundles.brokenHangVatBundle },
    durableRoot: { bundle: bundles.durableRootVatBundle },
  };
  let doSlog = false;
  function slogSender(slogObj) {
    if (!doSlog) return;
    const {
      time: _1,
      replay: _2,
      crankNum: _3,
      deliveryNum: _4,
      ...o
    } = slogObj;
    if (['crank-start', 'deliver', 'syscall'].includes(o.type)) {
      console.log(JSON.stringify(o));
    }
  }
  const { initOpts, runtimeOpts } = bundleOpts(t.context.data, { slogSender });
  const kernelStorage = initSwingStore().kernelStorage;
  await initializeSwingset(config, [], kernelStorage, initOpts);
  const c = await makeSwingsetController(kernelStorage, {}, runtimeOpts);
  t.teardown(c.shutdown);
  const id44 = await c.validateAndInstallBundle(bundles.vat44Bundle);
  const idRC = await c.validateAndInstallBundle(bundles.vatRefcountBundle);
  c.pinVatRoot('bootstrap');
  await c.run();
  if (enableSlog) {
    // for debugging, set enableSlog=true to start tracing after setup
    doSlog = true;
  }
  if (doVatAdminRestart) {
    await restartVatAdminVat(c);
  }
  return { c, id44, idRC, vat13Bundle: bundles.vat13Bundle, kernelStorage };
}

async function testCreateVatByBundle(t, doVatAdminRestart) {
  const { c, vat13Bundle } = await doTestSetup(t, doVatAdminRestart);
  const kpid = c.queueToVatRoot('bootstrap', 'byBundle', [vat13Bundle]);
  await c.run();
  t.deepEqual(kunser(c.kpResolution(kpid)), 13);
}

test('createVatByBundle', async t => {
  await testCreateVatByBundle(t, false);
});

test('createVatByBundle with VA upgrade', async t => {
  await testCreateVatByBundle(t, true);
});

async function testCreateVatByName(t, doVatAdminRestart) {
  const { c } = await doTestSetup(t, doVatAdminRestart);
  const kpid = c.queueToVatRoot('bootstrap', 'byName', ['new13']);
  await c.run();
  t.deepEqual(kunser(c.kpResolution(kpid)), 13);
}

test('createVatByName', async t => {
  await testCreateVatByName(t, false);
});

test('createVatByName with VA upgrade', async t => {
  await testCreateVatByName(t, true);
});

async function testCreateVatByNamedBundleCap(t, doVatAdminRestart) {
  const { c } = await doTestSetup(t, doVatAdminRestart);
  const kpid = c.queueToVatRoot('bootstrap', 'byNamedBundleCap', ['new13']);
  await c.run();
  t.deepEqual(kunser(c.kpResolution(kpid)), 13);
}

test('createVat by named bundlecap', async t => {
  await testCreateVatByNamedBundleCap(t, false);
});

test('createVat by named bundlecap with VA upgrade', async t => {
  await testCreateVatByNamedBundleCap(t, true);
});

async function testCreateVatByID(t, doVatAdminRestart) {
  const { c, id44 } = await doTestSetup(t, doVatAdminRestart);
  const kpid = c.queueToVatRoot('bootstrap', 'byID', [id44]);
  await c.run();
  t.deepEqual(kunser(c.kpResolution(kpid)), 44);
}

test('createVat by ID', async t => {
  await testCreateVatByID(t, false);
});

test('createVat by ID with VA upgrade', async t => {
  await testCreateVatByID(t, true);
});

test('counter test', async t => {
  const { c } = await doTestSetup(t, false);
  const kpid = c.queueToVatRoot('bootstrap', 'counters', ['new13']);
  await c.run();
  t.deepEqual(kunser(c.kpResolution(kpid)), [4, 9, 2, 8]);
});

async function brokenVatTest(t, bundleName, expected) {
  const { c } = await doTestSetup(t, false);
  const kpid = c.queueToVatRoot('bootstrap', 'brokenVat', [bundleName]);
  await c.run();
  t.is(c.kpStatus(kpid), 'rejected');
  const res = kunser(c.kpResolution(kpid));
  t.truthy(res instanceof Error);
  // 'Vat Creation Error: Error: missing is not defined'
  t.regex(res.message, /Vat Creation Error/);
  t.regex(res.message, expected);
}

test('broken vat creation fails (bad module)', async t => {
  await brokenVatTest(t, 'brokenModule', /missing/);
});

test('broken vat creation fails (bad buildRootObject)', async t => {
  await brokenVatTest(t, 'brokenRoot', /missing/);
});

test('broken vat creation fails (buildRootObject hangs)', async t => {
  await brokenVatTest(t, 'brokenHang', /buildRootObject unresolved/);
});

test('broken vat creation fails (durable root object)', async t => {
  await brokenVatTest(t, 'durableRoot', /must return ephemeral, not virtual/);
});

test('error creating vat from non-bundle', async t => {
  const { c } = await doTestSetup(t, false);
  const kpid = c.queueToVatRoot('bootstrap', 'nonBundleCap', []);
  await c.run();
  t.is(c.kpStatus(kpid), 'rejected');
  t.deepEqual(
    kunser(c.kpResolution(kpid)),
    Error('Vat Creation Error: createVat() requires a bundlecap'),
  );
});

test('create vat with good-sized name', async t => {
  const { c } = await doTestSetup(t, false);
  const name = 'n'.repeat(199);
  const kpid = c.queueToVatRoot('bootstrap', 'vatName', [name]);
  await c.run();
  t.deepEqual(kunser(c.kpResolution(kpid)), 'ok');
});

test('error creating vat with oversized name', async t => {
  const { c } = await doTestSetup(t, false);
  const name = 'n'.repeat(200);
  const kpid = c.queueToVatRoot('bootstrap', 'vatName', [name]);
  await c.run();
  t.is(c.kpStatus(kpid), 'rejected');
  t.deepEqual(
    kunser(c.kpResolution(kpid)),
    Error(`CreateVatOptions: oversized vat name "${'n'.repeat(200)}"`),
  );
});

test('error creating vat with bad characters in name', async t => {
  const { c } = await doTestSetup(t, false);
  const name = 'no spaces';
  const kpid = c.queueToVatRoot('bootstrap', 'vatName', [name]);
  await c.run();
  t.is(c.kpStatus(kpid), 'rejected');
  t.deepEqual(
    kunser(c.kpResolution(kpid)),
    Error(`CreateVatOptions: bad vat name "no spaces"`),
  );
});

test('error creating vat with unknown options', async t => {
  const { c } = await doTestSetup(t, false);
  const kpid = c.queueToVatRoot('bootstrap', 'badOptions', []);
  await c.run();
  t.is(c.kpStatus(kpid), 'rejected');
  t.deepEqual(
    kunser(c.kpResolution(kpid)),
    Error('CreateVatOptions: unknown options "bogus"'),
  );
});

function findRefs(kvStore, koid) {
  const refs = [];
  const nextVatID = Number(kvStore.get('vat.nextID'));
  for (let vn = 1; vn < nextVatID; vn += 1) {
    const vatID = `v${vn}`;
    const r = kvStore.get(`${vatID}.c.${koid}`);
    if (r) {
      refs.push(`${vatID}: ${r}`);
    }
  }
  const nextDeviceID = Number(kvStore.get('device.nextID'));
  for (let dn = 1; dn < nextDeviceID; dn += 1) {
    const deviceID = `d${dn}`;
    const r = kvStore.get(`${deviceID}.c.${koid}`);
    if (r) {
      refs.push(`${deviceID}: ${r}`);
    }
  }
  const refcountString = kvStore.get(`${koid}.refCount`) || '0,0';
  const refcount = refcountString.split(',').map(Number);
  return { refs, refcount };
}

test('createVat holds refcount', async t => {
  const printSlog = false; // set true to debug this test
  const { c, idRC, kernelStorage } = await doTestSetup(t, false, printSlog);
  const { kvStore } = kernelStorage;

  // The bootstrap vat starts by fetching 'held' from vat-export-held, during
  // doTestSetup(), and retains it throughout the entire test. When we send
  // it refcount(), it will send VatAdminService.getBundleCap(), wait for the
  // response, then send VatAdminService.createVat(held). VAS will tell
  // device-vat-admin to push a create-vat event (including 'held') on the
  // run-queue. Some time later, the create-vat event reaches the front, and
  // the new vat is created, receiving 'held' in vatParametesr.

  // We want to check the refcounts during this sequence, to confirm that the
  // create-vat event holds a reference. Otherwise, 'held' might get GCed
  // after VAS has pushed the event but before the kernel has created the new
  // vat. (Currently, this is accidentally prevented by the fact that
  // deviceKeeper.mapKernelSlotToDeviceSlot does an incrementRefCount but
  // nothing ever decrements it: devices hold eternal refcounts on their
  // c-list entries, and nothing ever removes a device c-list entry. But some
  // day when we fix that, we'll rely upon the create-vat event's refcount to
  // keep these things alive.

  // We happen to know that 'held' will be allocated ko27, but we use
  // `getHeld()` to obtain the real value in case e.g. a new built-in vat is
  // added and some other koid is allocated. To remind us to review this test
  // if/when things like that change, this test also asserts ko27, but that
  // can be updated in a single place.

  // 'held' is exported by v6, which shows up in the c-lists but exports don't
  // count towards the refcount
  let expectedRefcount = 0;
  let expectedCLists = 1; // v6-export-held

  // bootstrap() imports 'held', adding it to the v1-bootstrap c-list and
  // incrementing the refcount.
  expectedRefcount += 1; // v1-bootstrap holds resolution of 'createHeld'
  expectedCLists += 1; // v1-bootstrap

  const kpid1 = c.queueToVatRoot('bootstrap', 'getHeld', []);
  await c.run();
  // We send `getHeld` to v1-bootstrap, which resolves kpid1 to
  // 'held'. It now has refCount=2,2: one from v1-bootstrap, the other
  // from kpid1's resolution value. kpid1 itself is held by a refcount
  // added by queueToVatRoot, which will be removed when we call
  // kpResolution.
  expectedRefcount += 1; // from kpid1

  const h1 = kunser(c.kpResolution(kpid1));
  // `kpResolution()` does an incref on the results, making the
  // refcount now 3,3: v1-bootstrap c-list (from 'createHeld'), kpid1
  // resolution value, and pinned by kpResolution. kpid1 has now been
  // retired (and is currently in maybeFreeKrefs), but the contents
  // won't be released until the next delivery happens (c.step) and we
  // do a processRefcounts()
  expectedRefcount += 1; // kpResolution pin

  const held = krefOf(h1);
  t.is(held, 'ko27'); // gleaned from the logs, unstable, update as needed

  const { refcount, refs } = findRefs(kvStore, held);
  t.deepEqual(refcount, [expectedRefcount, expectedRefcount]);
  t.is(refs.length, expectedCLists);

  // console.log(`---`);

  async function stepUntil(predicate) {
    for (;;) {
      const more = await c.step();
      // const { refcount, refs } = findRefs(kvStore, held);
      // const rc = kvStore.get(`${held}.refCount`);
      // console.log(`rc(${held}): ${refcount}  ${refs.join(' , ')}`);
      if (!more || predicate()) {
        return;
      }
    }
  }

  // now start refcount() and step until we see the `send(createVat)` on
  // the run-queue
  const kpid = c.queueToVatRoot('bootstrap', 'refcount', [idRC]);
  function seeDeliverCreateVat() {
    // console.log('rq:', JSON.stringify(c.dump().runQueue));
    return c
      .dump()
      .runQueue.filter(
        q => q.type === 'send' && extractMethod(q.msg.methargs) === 'createVat',
      ).length;
  }
  await stepUntil(seeDeliverCreateVat);
  // first delivery also does processRefcounts, deletes kpid1
  expectedRefcount -= 1; // kpid1 deleted, drops ref to 'held', now 2,2
  // it also does syscall.send(createVat), which holds a new reference
  expectedRefcount += 1; // arg to 'createVat'
  // now we should see 3,3: v1-bootstrap, the kpResolution pin, and the
  // send(createVat) arguments. Two of these are c-lists.
  const r1 = findRefs(kvStore, held);
  t.deepEqual(r1.refcount, [expectedRefcount, expectedRefcount]);
  t.is(r1.refs.length, expectedCLists);
  // console.log(`---`);

  // allow that to be delivered to vat-admin and step until we see the
  // 'create-vat' event on the run-queue, which means vat-admin has just
  // finished executing the createVat() message. We stop stepping before
  // delivering bringOutYourDead to vat-admin, so it should still be holding
  // the arguments.
  function seeCreateVat() {
    // console.log('rq:', JSON.stringify(c.dump().runQueue));
    return c.dump().runQueue.filter(q => q.type === 'create-vat').length;
  }
  await stepUntil(seeCreateVat);
  // console.log(`---`);

  // We should see 5,5: v2-bootstrap, the kpResolution pin, vat-vat-admin,
  // device-vat-admin, and the create-vat run-queue event. Three of these are
  // c-lists.
  expectedRefcount += 1; // vat-vat-admin c-list
  expectedCLists += 1; // vat-vat-admin c-list
  expectedRefcount += 1; // device-vat-admin c-list
  expectedCLists += 1; // device-vat-admin c-list

  const r2 = findRefs(kvStore, held);
  // console.log(`r2:`, JSON.stringify(r2));
  t.deepEqual(r2.refcount, [expectedRefcount, expectedRefcount]);
  t.is(r2.refs.length, expectedCLists);

  // Allow the vat-admin bringOutYourDead to be delivered, which
  // allows it to drop its reference to 'held'.

  expectedRefcount -= 1; // vat-vat-admin retires
  expectedCLists -= 1; // vat-vat-admin retires

  // In addition, device-vat-admin does not yet participate in GC, and holds
  // its references forever. So this -=1 remains commented out until we
  // implement that functionality.

  // expectedRefcount -= 1; // device-vat-admin retires
  // expectedCLists -= 1; // device-vat-admin retires

  t.deepEqual(c.dump().reapQueue, ['v2']);
  await c.step();
  t.deepEqual(c.dump().reapQueue, []);
  // console.log(`---`);

  // At this point we expected to see 5,5: v2-bootstrap, kpResolution pin,
  // vat-vat-admin (because of the non-dropping bug), device-vat-admin
  // (because of unimplemented GC), and the create-vat run-queue event. Two
  // are c-lists.

  const r3 = findRefs(kvStore, held);
  // console.log(`r3:`, JSON.stringify(r3));
  t.deepEqual(r3.refcount, [expectedRefcount, expectedRefcount]);
  t.is(r3.refs.length, expectedCLists);

  // Allow create-vat to be processed, removing the create-vat reference and
  // adding a reference from the new vat's c-list
  await c.step();
  expectedRefcount -= 1; // remove send(createVat) argument
  expectedRefcount += 1; // new-vat c-list
  expectedCLists += 1; // new-vat c-list
  // console.log(`---`);

  // v2-bootstrap, kpResolution pin, device-vat-admin, new-vat
  const r4 = findRefs(kvStore, held);
  // console.log(`r4:`, JSON.stringify(r4));
  t.deepEqual(r4.refcount, [expectedRefcount, expectedRefcount]);
  t.is(r4.refs.length, expectedCLists);

  // now let everything finish
  // await c.run();
  await stepUntil(() => false);
  t.deepEqual(kunser(c.kpResolution(kpid)), 0);
});

test('createVat without options', async t => {
  const printSlog = false;
  const { c, kernelStorage } = await doTestSetup(t, false, printSlog);
  const { kvStore } = kernelStorage;
  const threshold = JSON.parse(kvStore.get('kernel.defaultReapDirtThreshold'));
  t.deepEqual(threshold, { deliveries: 1, gcKrefs: 20, computrons: 'never' });

  const kpid = c.queueToVatRoot('bootstrap', 'byNameWithOptions', [
    'new13',
    {},
  ]);
  await c.run();
  const kref = kunser(c.kpResolution(kpid)).getKref();
  const vatID = kvStore.get(`${kref}.owner`);
  const options = JSON.parse(kvStore.get(`${vatID}.options`));
  t.deepEqual(options.reapDirtThreshold, {});
});

test('createVat with options', async t => {
  const printSlog = false;
  const { c, kernelStorage } = await doTestSetup(t, false, printSlog);
  const { kvStore } = kernelStorage;
  const threshold = JSON.parse(kvStore.get('kernel.defaultReapDirtThreshold'));
  t.deepEqual(threshold, { deliveries: 1, gcKrefs: 20, computrons: 'never' });

  const opts = { reapInterval: 123 };
  const kpid = c.queueToVatRoot('bootstrap', 'byNameWithOptions', [
    'new13',
    opts,
  ]);
  await c.run();
  const kref = kunser(c.kpResolution(kpid)).getKref();
  const vatID = kvStore.get(`${kref}.owner`);
  const options = JSON.parse(kvStore.get(`${vatID}.options`));
  t.deepEqual(options.reapDirtThreshold, { deliveries: 123 });
});
