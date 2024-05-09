// @ts-nocheck
import test from 'ava';
import { createHash } from 'crypto';

import { initSwingStore } from '@agoric/swing-store';
import {
  getLockdownBundleSHA256,
  getLockdownBundle,
} from '@agoric/xsnap-lockdown';
import {
  getSupervisorBundleSHA256,
  getSupervisorBundle,
} from '@agoric/swingset-xsnap-supervisor';
import {
  initializeSwingset,
  makeSwingsetController,
  buildKernelBundles,
} from '../../src/index.js';

function sha256(s) {
  const h = createHash('sha256');
  h.update(s);
  return h.digest('hex');
}

function modifyBundle(origBundle) {
  // add whitespace to the .source property, which won't affect the
  // behavior, but will change the ID, to simulate new versions
  const { moduleFormat, source, sourceMap } = origBundle;
  const bundle = { moduleFormat, source: `${source} `, sourceMap };
  const hash = sha256(JSON.stringify(bundle));
  const id = `b0-${hash}`;
  return { bundle, id, hash };
}

async function getOrigBundles() {
  const lockdownSHA = await getLockdownBundleSHA256();
  const lockdownID = `b0-${lockdownSHA}`;
  const lockdownBundle = await getLockdownBundle();
  const lockdownV1 = {
    bundle: lockdownBundle,
    id: lockdownID,
    hash: lockdownSHA,
  };

  const supervisorSHA = await getSupervisorBundleSHA256();
  const supervisorID = `b0-${supervisorSHA}`;
  const supervisorBundle = await getSupervisorBundle();
  const supervisorV1 = {
    bundle: supervisorBundle,
    id: supervisorID,
    hash: supervisorSHA,
  };

  return { lockdownV1, supervisorV1 };
}

test('xsnap bundles are stable', async t => {
  const { lockdownV1, supervisorV1 } = await getOrigBundles();
  let current = { lockdown: lockdownV1, supervisor: supervisorV1 };

  const log = [];
  const bundleMap = new Map();
  const bundleHandler = {
    getCurrentBundleIDs: async () => {
      log.push('current');
      return [current.lockdown.id, current.supervisor.id];
    },
    getBundle: async id => {
      log.push(`get-${id}`);
      return bundleMap.get(id);
    },
  };

  bundleMap.set(lockdownV1.id, lockdownV1.bundle);
  bundleMap.set(supervisorV1.id, supervisorV1.bundle);

  // We test the kernel's use of BundleHandler by watching calls to
  // it. To minimize interference, we disable as many built-in vats as
  // we can, and configure the remainder (vat-vattp) to use
  // managerType='local'. We must do this with config.vats and
  // creationOptions.managerType, because the global
  // defaultManagerType is overridden by
  // env.SWINGSET_WORKER_TYPE=xs-worker, as set by some CI tests

  const kernelBundles = await buildKernelBundles();
  const config = {
    includeDevDependencies: true, // for @endo/far
    defaultManagerType: 'local',
    snapshotInitial: 2,
    bootstrap: 'bootstrap',
    bundles: {
      bootstrap: {
        sourceSpec: new URL(`vat-stable.js`, import.meta.url).pathname,
      },
    },
    vats: {
      bootstrap: {
        bundleName: 'bootstrap',
        creationOptions: { managerType: 'xs-worker' },
      },
      vatAdmin: {
        bundle: kernelBundles.adminVat,
        creationOptions: { managerType: 'local' },
      },
    },
    devices: {
      vatAdmin: {
        bundle: kernelBundles.adminDevice,
      },
    },
  };
  const { kernelStorage } = initSwingStore();
  const { snapStore } = kernelStorage;
  const rtopts = { bundleHandler };
  // disable built-in vats, to avoid overriding our vats.vatAdmin above
  const initOpts = {
    addComms: false,
    addVattp: false,
    addTimer: false,
    addVatAdmin: false,
    kernelBundles,
  };
  await initializeSwingset(config, [], kernelStorage, initOpts, rtopts);

  // the config includes one xsnap-based vat (bootstrap), so
  // initializeSwingset must sample the current IDs, and store them
  // into the vat options

  t.deepEqual(log, ['current']);
  log.length = 0;
  const { kvStore } = kernelStorage;
  const options1 = JSON.parse(kvStore.get('v1.options'));
  t.deepEqual(options1.workerOptions.bundleIDs, [
    lockdownV1.id,
    supervisorV1.id,
  ]);

  const c1 = await makeSwingsetController(kernelStorage, {}, rtopts);
  c1.pinVatRoot('bootstrap');
  t.teardown(c1.shutdown);

  // pre-loading the static vats should pull the bundles, without
  // re-sampling the current IDs
  const preloadV1 = [`get-${lockdownV1.id}`, `get-${supervisorV1.id}`];
  t.deepEqual(log, preloadV1);
  log.length = 0;

  // we shut down before making any deliveries, so the worker has not
  // yet made a snapshot
  await c1.shutdown();
  t.is(snapStore.getSnapshotInfo('v1'), undefined);

  const lockdownV2 = modifyBundle(lockdownV1.bundle);
  const supervisorV2 = modifyBundle(supervisorV1.bundle);
  t.not(lockdownV1.id, lockdownV2.id); // confirm modifyBundle works as needed
  bundleMap.set(lockdownV2.id, lockdownV2.bundle);
  bundleMap.set(supervisorV2.id, supervisorV2.bundle);
  current = { lockdown: lockdownV2, supervisor: supervisorV2 };

  const c2 = await makeSwingsetController(kernelStorage, {}, rtopts);
  t.teardown(c2.shutdown);

  // vat should be pre-loaded, from new xsnap (no snapshot), from the
  // recorded bundles, even though the current IDs are different. No
  // vats are created here (only preload/replay), so no sampling of
  // current bundles, but a fetch of the old bundles
  t.deepEqual(log, preloadV1);
  log.length = 0;

  // the preload pushes an initialize-worker to the transcript, which
  // counts as the first delivery (deliveryNum=0), towards our
  // snapshotInitial: 2

  // now allow the bootstrap message to be delivered as deliveryNum=1,
  // which should trigger a snapshot, which first performs a BOYD in
  // deliveryNum=2, then the snapshot is recorded in a save-snapshot
  // as deliveryNum=3
  t.is(snapStore.getSnapshotInfo('v1'), undefined);
  await c2.run();
  t.is(snapStore.getSnapshotInfo('v1')?.snapPos, 3);
  await c2.shutdown;

  // now that the worker has a snapshot, the vat preload won't fetch
  // any bundles at all
  const c3 = await makeSwingsetController(kernelStorage, {}, rtopts);
  t.teardown(c3.shutdown);
  await c3.run(); // nothing to do

  t.deepEqual(log, []);
  log.length = 0;

  // now tell vat-bootstrap to create a new vat, which will sample,
  // record, and launch with the current bundles
  const preloadV2 = [`get-${lockdownV2.id}`, `get-${supervisorV2.id}`];

  c3.queueToVatRoot('bootstrap', 'create', []);
  await c3.run();

  t.is(log.shift(), 'current');
  t.deepEqual(log, preloadV2);
  log.length = 0;

  // upgrading the vat will re-sample the bundles (which are still at
  // V2), and launch a new worker (re-fetching the bundles)
  c3.queueToVatRoot('bootstrap', 'upgrade', []);
  await c3.run();
  t.is(log.shift(), 'current');
  t.deepEqual(log, preloadV2);
  log.length = 0;

  // Technically, the bundles can change at runtime, although a normal
  // deployment will only ever change the bundle-supplying packages
  // (@agoric/xsnap-lockdown and @agoric/swingset-xsnap-supervisor)
  // when changing the kernel too.

  const lockdownV3 = modifyBundle(lockdownV1.bundle);
  const supervisorV3 = modifyBundle(supervisorV1.bundle);
  bundleMap.set(lockdownV3.id, lockdownV3.bundle);
  bundleMap.set(supervisorV3.id, supervisorV3.bundle);
  current = { lockdown: lockdownV3, supervisor: supervisorV3 };
  const preloadV3 = [`get-${lockdownV3.id}`, `get-${supervisorV3.id}`];

  // upgrade will re-sample the bundles and start using V3
  c3.queueToVatRoot('bootstrap', 'upgrade', []);
  await c3.run();
  t.is(log.shift(), 'current');
  t.deepEqual(log, preloadV3);
  log.length = 0;
});
