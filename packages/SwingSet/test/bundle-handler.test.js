import test from 'ava';

import {
  getLockdownBundleSHA256,
  getLockdownBundle,
} from '@agoric/xsnap-lockdown';
import {
  getSupervisorBundleSHA256,
  getSupervisorBundle,
} from '@agoric/swingset-xsnap-supervisor';
import {
  makeXsnapBundleData,
  makeWorkerBundleHandler,
} from '../src/controller/bundle-handler.js';

test('bundle handler', async t => {
  const log = [];
  const bundleData = {
    getLockdownBundleSHA256: async () => {
      log.push('getLockdownBundleSHA256');
      return 'lockdown.sha';
    },
    getLockdownBundle: async () => {
      log.push('getLockdownBundle');
      return 'lockdown';
    },
    getSupervisorBundleSHA256: async () => {
      log.push('getSupervisorBundleSHA256');
      return 'supervisor.sha';
    },
    getSupervisorBundle: async () => {
      log.push('getSupervisorBundle');
      return 'supervisor';
    },
  };

  const store = new Map();
  const bundleStore = {
    addBundle: (id, bundle) => store.set(id, bundle),
    hasBundle: id => store.has(id),
    getBundle: id => store.get(id),
  };

  const handler = makeWorkerBundleHandler(bundleStore, bundleData);

  t.is(store.size, 0);
  const ids = await handler.getCurrentBundleIDs();
  t.deepEqual(log, [
    'getLockdownBundleSHA256',
    'getLockdownBundle',
    'getSupervisorBundleSHA256',
    'getSupervisorBundle',
  ]);
  log.length = 0;
  t.is(store.size, 2);
  t.deepEqual(ids, ['b0-lockdown.sha', 'b0-supervisor.sha']);
  // contents were fetched from bundleData
  t.is(await handler.getBundle('b0-lockdown.sha'), 'lockdown');
  t.is(await handler.getBundle('b0-supervisor.sha'), 'supervisor');

  // subsequent queries should check hashes/ids but not re-read bundles
  const ids2 = await handler.getCurrentBundleIDs();
  t.deepEqual(log, ['getLockdownBundleSHA256', 'getSupervisorBundleSHA256']);
  log.length = 0;
  t.deepEqual(ids, ids2);

  // getBundle is served from bundleStore, not elsewhere
  store.set('b0-lockdown.sha', 'other');
  t.is(await handler.getBundle('b0-lockdown.sha'), 'other');
});

test('bundle data', async t => {
  const bundleData = makeXsnapBundleData();
  const store = new Map();
  const bundleStore = {
    addBundle: (id, bundle) => store.set(id, bundle),
    hasBundle: id => store.has(id),
    getBundle: id => store.get(id),
  };

  const lockdownSHA = await getLockdownBundleSHA256();
  const lockdownID = `b0-${lockdownSHA}`;
  const supervisorSHA = await getSupervisorBundleSHA256();
  const supervisorID = `b0-${supervisorSHA}`;
  const handler = makeWorkerBundleHandler(bundleStore, bundleData);

  const ids = await handler.getCurrentBundleIDs();
  t.deepEqual(ids, [lockdownID, supervisorID]);
  t.deepEqual(store.get(lockdownID), await getLockdownBundle());
  t.deepEqual(store.get(supervisorID), await getSupervisorBundle());
});
