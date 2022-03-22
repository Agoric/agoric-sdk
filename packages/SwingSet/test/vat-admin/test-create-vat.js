// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/order
import bundleSource from '@endo/bundle-source';
import { parse } from '@endo/marshal';
import { provideHostStorage } from '../../src/controller/hostStorage.js';
import {
  buildKernelBundles,
  initializeSwingset,
  makeSwingsetController,
  loadBasedir,
} from '../../src/index.js';
import { capargs, capSlot } from '../util.js';

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
  const vatRefcountBundle = await bundleSource(
    new URL('new-vat-refcount.js', import.meta.url).pathname,
  );
  const nonBundle = `${nonBundleFunction}`;
  const bundles = {
    vat13Bundle,
    vat44Bundle,
    brokenModuleVatBundle,
    brokenRootVatBundle,
    vatRefcountBundle,
    nonBundle,
  };
  t.context.data = { kernelBundles, bundles };
});

async function doTestSetup(t, enableSlog = false) {
  const { bundles, kernelBundles } = t.context.data;
  const config = await loadBasedir(new URL('./', import.meta.url).pathname);
  config.defaultManagerType = 'xs-worker';
  config.bundles = {
    new13: { bundle: bundles.vat13Bundle },
    brokenModule: { bundle: bundles.brokenModuleVatBundle },
    brokenRoot: { bundle: bundles.brokenRootVatBundle },
  };
  const hostStorage = provideHostStorage();
  await initializeSwingset(config, [], hostStorage, { kernelBundles });
  let doSlog = false;
  function slogSender(_, s) {
    if (!doSlog) return;
    const o = JSON.parse(s);
    delete o.time;
    delete o.replay;
    delete o.crankNum;
    delete o.deliveryNum;
    if (['crank-start', 'deliver', 'syscall'].includes(o.type)) {
      console.log(JSON.stringify(o));
    }
  }
  const c = await makeSwingsetController(hostStorage, {}, { slogSender });
  const id44 = await c.validateAndInstallBundle(bundles.vat44Bundle);
  const idRC = await c.validateAndInstallBundle(bundles.vatRefcountBundle);
  c.pinVatRoot('bootstrap');
  await c.run();
  if (enableSlog) {
    // for debugging, set enableSlog=true to start tracing after setup
    doSlog = true;
  }
  return { c, id44, idRC, vat13Bundle: bundles.vat13Bundle, hostStorage };
}

test('createVatByBundle', async t => {
  const { c, vat13Bundle } = await doTestSetup(t);
  const kpid = c.queueToVatRoot(
    'bootstrap',
    'byBundle',
    capargs([vat13Bundle]),
  );
  await c.run();
  t.deepEqual(JSON.parse(c.kpResolution(kpid).body), 13);
});

test('createVatByName', async t => {
  const { c } = await doTestSetup(t);
  const kpid = c.queueToVatRoot('bootstrap', 'byName', capargs(['new13']));
  await c.run();
  t.deepEqual(JSON.parse(c.kpResolution(kpid).body), 13);
});

test('createVat by named bundlecap', async t => {
  const { c } = await doTestSetup(t);
  const kpid = c.queueToVatRoot(
    'bootstrap',
    'byNamedBundleCap',
    capargs(['new13']),
  );
  await c.run();
  t.deepEqual(JSON.parse(c.kpResolution(kpid).body), 13);
});

test('createVat by ID', async t => {
  const { c, id44 } = await doTestSetup(t);
  const kpid = c.queueToVatRoot('bootstrap', 'byID', capargs([id44]));
  await c.run();
  t.deepEqual(JSON.parse(c.kpResolution(kpid).body), 44);
});

test('counter test', async t => {
  const { c } = await doTestSetup(t);
  const kpid = c.queueToVatRoot('bootstrap', 'counters', capargs(['new13']));
  await c.run();
  t.deepEqual(JSON.parse(c.kpResolution(kpid).body), [4, 9, 2, 8]);
});

async function brokenVatTest(t, bundleName) {
  const { c } = await doTestSetup(t);
  const kpid = c.queueToVatRoot(
    'bootstrap',
    'brokenVat',
    capargs([bundleName]),
  );
  await c.run();
  t.is(c.kpStatus(kpid), 'rejected');
  const res = parse(c.kpResolution(kpid).body);
  t.truthy(res instanceof Error);
  // 'Vat Creation Error: Error: missing is not defined'
  t.regex(res.message, /Vat Creation Error/);
  t.regex(res.message, /missing/);
}

test('broken vat creation fails (bad module)', async t => {
  await brokenVatTest(t, 'brokenModule');
});

test('broken vat creation fails (bad buildRootObject)', async t => {
  await brokenVatTest(t, 'brokenRoot');
});

test('error creating vat from non-bundle', async t => {
  const { c } = await doTestSetup(t);
  const kpid = c.queueToVatRoot('bootstrap', 'nonBundleCap', capargs([]));
  await c.run();
  t.is(c.kpStatus(kpid), 'rejected');
  t.deepEqual(
    parse(c.kpResolution(kpid).body),
    Error('Vat Creation Error: createVat() requires a bundlecap'),
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
  const { c, idRC, hostStorage } = await doTestSetup(t, printSlog);
  const { kvStore } = hostStorage;

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

  // 'held' is exported by v1, which shows up in the c-lists but doesn't
  // count towards the refcount
  let expectedRefcount = 0;
  let expectedCLists = 1; // v1-export-held

  // bootstrap() imports 'held', adding it to the v2-bootstrap c-list and
  // incrementing the refcount.
  expectedRefcount += 1; // v2-bootstrap
  expectedCLists += 1; // v2-bootstrap

  // calling getHeld doesn't immediately increment the refcount
  const kpid1 = c.queueToVatRoot('bootstrap', 'getHeld', capargs([]));
  await c.run();
  const h1 = c.kpResolution(kpid1);
  t.deepEqual(JSON.parse(h1.body), capSlot(0, 'held'));
  const held = h1.slots[0];
  t.is(held, 'ko27'); // gleaned from the logs, unstable, update as needed

  // but `kpResolution()` does an incref on the results, making the refcount
  // now 2,2: imported by v2-bootstrap and pinned by kpResolution.
  expectedRefcount += 1; // kpResolution pin
  const { refcount, refs } = findRefs(kvStore, held);
  t.deepEqual(refcount, [expectedRefcount, expectedRefcount]);
  t.is(refs.length, expectedCLists);

  // console.log(`---`);

  async function stepUntil(predicate) {
    for (;;) {
      // eslint-disable-next-line no-await-in-loop
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
  const kpid = c.queueToVatRoot('bootstrap', 'refcount', capargs([idRC]));
  function seeDeliverCreateVat() {
    // console.log('rq:', JSON.stringify(c.dump().runQueue));
    return c
      .dump()
      .runQueue.filter(q => q.type === 'send' && q.msg.method === 'createVat')
      .length;
  }
  await stepUntil(seeDeliverCreateVat);

  // now we should see 3,3: v2-bootstrap, the kpResolution pin, and the
  // send(createVat) arguments. Two of these are c-lists.
  expectedRefcount += 1; // send(createVat) arguments
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

  // Allow the vat-admin bringOutYourDead to be delivered, which *ought* to
  // allow it to drop its reference to 'held'. NOTE: for some reason,
  // `createVat()` does not drop that reference right away. I *think* it
  // holds onto them until the result promise resolves, which doesn't happen
  // until `newVatCallback()` is delivered. So this -=1 is commented out
  // until we figure out how to fix that.. maybe a HandledPromise thing.

  // expectedRefcount -= 1; // vat-vat-admin retires
  // expectedCLists -= 1; // vat-vat-admin retires

  // In addition, device-vat-admin does not yet participate in GC, and holds
  // its references forever. So this -=1 remains commented out until we
  // implement that functionality.

  // expectedRefcount -= 1; // device-vat-admin retires
  // expectedCLists -= 1; // device-vat-admin retires

  t.deepEqual(c.dump().reapQueue, ['v3']);
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
  t.deepEqual(JSON.parse(c.kpResolution(kpid).body), 0);
});
