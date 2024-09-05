/* eslint-disable no-underscore-dangle */
// @ts-nocheck

import { initSwingStore } from '@agoric/swing-store';
import { test } from '../tools/prepare-test-env-ava.js';

import {
  initializeSwingset,
  makeSwingsetController,
  upgradeSwingset,
  buildKernelBundles,
} from '../src/index.js';

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  t.context.data = { kernelBundles };
});

test('kernel refuses to run with out-of-date DB - v0', async t => {
  const { hostStorage, kernelStorage } = initSwingStore();
  const { commit } = hostStorage;
  const { kvStore } = kernelStorage;
  const config = {};
  await initializeSwingset(config, [], kernelStorage, t.context.data);
  await commit();

  // now doctor the initial state to make it look like the
  // kernelkeeper v0 schema, just deleting the version key and adding
  // 'initialized'

  t.is(kvStore.get('version'), '2');
  kvStore.delete(`version`);
  kvStore.set('initialized', 'true');
  await commit();

  // Now build a controller around this modified state, which should fail.
  await t.throwsAsync(() => makeSwingsetController(kernelStorage), {
    message: /kernel DB is too old/,
  });
});

test('kernel refuses to run with out-of-date DB - v1', async t => {
  const { hostStorage, kernelStorage } = initSwingStore();
  const { commit } = hostStorage;
  const { kvStore } = kernelStorage;
  const config = {};
  await initializeSwingset(config, [], kernelStorage, t.context.data);
  await commit();

  // now doctor the initial state to make it look like the
  // kernelkeeper v1 schema, by reducing the version key and removing
  // vats.terminated

  t.is(kvStore.get('version'), '2');
  kvStore.set(`version`, '1');
  kvStore.delete('vats.terminated');
  await commit();

  // Now build a controller around this modified state, which should fail.
  await t.throwsAsync(() => makeSwingsetController(kernelStorage), {
    message: /kernel DB is too old/,
  });
});

test('upgrade kernel state', async t => {
  const { hostStorage, kernelStorage } = initSwingStore();
  const { commit } = hostStorage;
  const { kvStore } = kernelStorage;
  const config = {
    vats: {
      one: {
        sourceSpec: new URL(
          'files-vattp/bootstrap-test-vattp.js',
          import.meta.url,
        ).pathname,
      },
    },
  };
  await initializeSwingset(config, [], kernelStorage, t.context.data);
  await commit();

  // now doctor the initial state to make it look like the
  // kernelkeeper v0 schema, with 'kernel.defaultReapInterval' instead
  // of 'kernel.defaultReapDirtThreshold', and
  // 'v1.reapCountdown`/`.reapInterval` . This is cribbed from "dirt
  // upgrade" in test-state.js.
  //
  // our mainnet vats have data like:
  // v5.options|{"workerOptions":{"type":"xsnap","bundleIDs":["b0-5c790a966210b78de758fb442af542714ed96da09db76e0b31d6a237e555fd62","b0-e0d2dafc7e981947b42118e8c950837109683bae56f7b4f5bffa1b67e5c1e768"]},"name":"timer","enableSetup":false,"enablePipelining":false,"enableDisavow":false,"useTranscript":true,"reapInterval":1000,"critical":false}
  // v5.reapCountdown|181
  // v5.reapInterval|1000
  //
  // This is a bit fragile.. there are probably ways to refactor
  // kernelKeeper to make this better, or at least put all the
  // manipulation/simulation code in the same place.

  t.true(kvStore.has('kernel.defaultReapDirtThreshold'));

  t.is(kvStore.get('version'), '2');
  kvStore.delete('version'); // i.e. revert to v0
  kvStore.set('initialized', 'true');
  kvStore.delete('vats.terminated');
  kvStore.delete(`kernel.defaultReapDirtThreshold`);
  kvStore.set(`kernel.defaultReapInterval`, '300');

  const vatIDs = {};
  for (const name of JSON.parse(kvStore.get('vat.names'))) {
    const vatID = kvStore.get(`vat.name.${name}`);
    t.truthy(vatID, name);
    vatIDs[name] = vatID;
    t.true(kvStore.has(`${vatID}.reapDirt`));
    kvStore.delete(`${vatID}.reapDirt`);
    const options = JSON.parse(kvStore.get(`${vatID}.options`));
    t.truthy(options);
    t.truthy(options.reapDirtThreshold);
    delete options.reapDirtThreshold;
    options.reapInterval = 55; // ignored by upgrader, so make it bogus
    kvStore.set(`${vatID}.options`, JSON.stringify(options));
    if (name === 'comms') {
      kvStore.set(`${vatID}.reapInterval`, 'never');
      kvStore.set(`${vatID}.reapCountdown`, 'never');
    } else {
      kvStore.set(`${vatID}.reapInterval`, '100');
      kvStore.set(`${vatID}.reapCountdown`, '70');
      // 100-70 means the new state's dirt.deliveries should be 30
    }
  }

  await commit();

  // confirm that this state is too old for the kernel to use
  await t.throwsAsync(() => makeSwingsetController(kernelStorage), {
    message: /kernel DB is too old/,
  });

  // upgrade it
  upgradeSwingset(kernelStorage);

  // now we should be good to go
  const _controller = await makeSwingsetController(kernelStorage);

  t.true(kvStore.has('kernel.defaultReapDirtThreshold'));
  // the kernel-wide threshold gets a .gcKrefs (to meet our upcoming
  // slow-deletion goals)
  t.deepEqual(JSON.parse(kvStore.get('kernel.defaultReapDirtThreshold')), {
    computrons: 'never',
    deliveries: 300,
    gcKrefs: 20,
  });

  // normal vat has some (computed) accumulated dirt
  t.deepEqual(JSON.parse(kvStore.get(`${vatIDs.one}.reapDirt`)), {
    deliveries: 30,
  });
  // anywhere the vat's upgraded threshold differs from the
  // kernel-wide threshold, .options gets an override value, in this
  // case on deliveries (since 100 !== 300)
  t.deepEqual(
    JSON.parse(kvStore.get(`${vatIDs.one}.options`)).reapDirtThreshold,
    { deliveries: 100 },
  );

  // comms doesn't reap, and doesn't count dirt, and gets a special
  // 'never' marker
  t.deepEqual(JSON.parse(kvStore.get(`${vatIDs.comms}.reapDirt`)), {});
  t.deepEqual(
    JSON.parse(kvStore.get(`${vatIDs.comms}.options`)).reapDirtThreshold,
    { never: true },
  );

  // TODO examine the state, use it

  // TODO check the export-data callbacks
});

test('upgrade non-reaping kernel state', async t => {
  const { hostStorage, kernelStorage } = initSwingStore();
  const { commit } = hostStorage;
  const { kvStore } = kernelStorage;
  const config = {};
  await initializeSwingset(config, [], kernelStorage, t.context.data);
  await commit();

  // now doctor the initial state to make it look like the
  // kernelkeeper v0 schema, with 'kernel.defaultReapInterval' of 'never'

  t.true(kvStore.has('kernel.defaultReapDirtThreshold'));

  t.is(kvStore.get('version'), '2');
  kvStore.delete('version'); // i.e. revert to v0
  kvStore.set('initialized', 'true');
  kvStore.delete('vats.terminated');
  kvStore.delete(`kernel.defaultReapDirtThreshold`);
  kvStore.set(`kernel.defaultReapInterval`, 'never');

  const vatIDs = {};
  for (const name of JSON.parse(kvStore.get('vat.names'))) {
    const vatID = kvStore.get(`vat.name.${name}`);
    t.truthy(vatID, name);
    vatIDs[name] = vatID;
    t.true(kvStore.has(`${vatID}.reapDirt`));
    kvStore.delete(`${vatID}.reapDirt`);
    const options = JSON.parse(kvStore.get(`${vatID}.options`));
    t.truthy(options);
    t.truthy(options.reapDirtThreshold);
    delete options.reapDirtThreshold;
    options.reapInterval = 'never';
    kvStore.set(`${vatID}.options`, JSON.stringify(options));
    kvStore.set(`${vatID}.reapInterval`, 'never');
    kvStore.set(`${vatID}.reapCountdown`, 'never');
  }
  await commit();

  // confirm that this state is too old for the kernel to use
  await t.throwsAsync(() => makeSwingsetController(kernelStorage), {
    message: /kernel DB is too old/,
  });

  // upgrade it
  upgradeSwingset(kernelStorage);

  // now we should be good to go
  const _controller = await makeSwingsetController(kernelStorage);

  t.true(kvStore.has('kernel.defaultReapDirtThreshold'));
  t.deepEqual(JSON.parse(kvStore.get('kernel.defaultReapDirtThreshold')), {
    computrons: 'never',
    deliveries: 'never',
    gcKrefs: 'never',
  });
});
