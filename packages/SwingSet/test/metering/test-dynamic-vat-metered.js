/* global require */
// TODO Remove babel-standalone preinitialization
// https://github.com/endojs/endo/issues/768
import '@agoric/babel-standalone';
import '@agoric/install-metering-and-ses';
import bundleSource from '@agoric/bundle-source';
import test from 'ava';
import { provideHostStorage } from '../../src/hostStorage.js';
import { buildKernelBundles, buildVatController } from '../../src/index.js';
import makeNextLog from '../make-nextlog.js';

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
    require.resolve('./metered-dynamic-vat.js'),
  );
  const bootstrapBundle = await bundleSource(
    require.resolve('./vat-load-dynamic.js'),
  );
  return { kernelBundles, dynamicVatBundle, bootstrapBundle };
}

test.before(async t => {
  t.context.data = await prepare();
});

async function runOneTest(t, explosion, managerType) {
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
  const nextLog = makeNextLog(c);

  // let the vatAdminService get wired up before we create any new vats
  await c.run();

  // 'createVat' will import the bundle
  const cvopts = { managerType, metered: true };
  const cvargs = capargs([dynamicVatBundle, cvopts]);
  c.queueToVatRoot('bootstrap', 'createVat', cvargs);
  await c.run();
  t.deepEqual(nextLog(), ['created'], 'first create');

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
  c.queueToVatRoot('bootstrap', 'run', capargs([]));
  await c.run();
  t.is(JSON.parse(kvStore.get('vat.dynamicIDs')).length, 1);
  t.is(kvStore.get(`${root}.owner`), vatID);
  t.true(Array.from(kvStore.getKeys(`${vatID}`, `${vatID}/`)).length > 0);
  // neverKPID should still be unresolved
  t.is(kvStore.get(`${neverKPID}.state`), 'unresolved');

  t.deepEqual(nextLog(), ['did run'], 'first run ok');

  // Now send a message that makes the dynamic vat exhaust its meter. The
  // message result promise should be rejected, and the control facet should
  // report the vat's demise.  Remnants of the killed vat should be gone
  // from the kernel state store.
  c.queueToVatRoot('bootstrap', 'explode', capargs([explosion]));
  await c.run();
  t.is(JSON.parse(kvStore.get('vat.dynamicIDs')).length, 0);
  t.is(kvStore.get(`${root}.owner`), undefined);
  t.is(Array.from(kvStore.getKeys(`${vatID}`, `${vatID}/`)).length, 0);
  // neverKPID should be rejected
  t.is(kvStore.get(`${neverKPID}.state`), 'rejected');
  t.is(
    kvStore.get(`${neverKPID}.data.body`),
    JSON.stringify({
      '@qclass': 'error',
      name: 'Error',
      message: 'vat terminated',
    }),
  );
  // TODO: the rejection shouldn't reveal the reason, maybe use this instead:
  // t.is(kvStore.get(`${neverKPID}.data.body`),
  //      JSON.stringify('vat terminated'));

  const expected = {
    allocate: 'Allocate meter exceeded',
    compute: 'Compute meter exceeded',
    stack: 'Stack meter exceeded',
  };

  t.deepEqual(
    nextLog(),
    [
      'did explode: Error: vat terminated',
      `terminated: Error: ${expected[explosion]}`,
    ],
    'first boom',
  );

  // the dead vat should stay dead
  c.queueToVatRoot('bootstrap', 'run', capargs([]));
  await c.run();
  t.deepEqual(nextLog(), ['run exploded: Error: vat terminated'], 'stay dead');
}

test('local vat allocate overflow', t => {
  return runOneTest(t, 'allocate', 'local');
});

test('local vat compute overflow', t => {
  return runOneTest(t, 'compute', 'local');
});

test('local vat stack overflow', t => {
  return runOneTest(t, 'stack', 'local');
});

test('xsnap vat allocate overflow', t => {
  return runOneTest(t, 'allocate', 'xs-worker');
});

test('xsnap vat compute overflow', t => {
  return runOneTest(t, 'compute', 'xs-worker');
});

test('xsnap vat stack overflow', t => {
  return runOneTest(t, 'stack', 'xs-worker');
});
