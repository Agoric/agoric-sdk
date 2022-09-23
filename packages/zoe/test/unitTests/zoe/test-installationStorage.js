// @ts-nocheck

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeHandle } from '../../../src/makeHandle.js';
import { makeInstallationStorage } from '../../../src/zoeService/installationStorage.js';

test('install, unwrap installations', async t => {
  const installationStorage = makeInstallationStorage();
  const fakeBundle = {};

  const installation = await installationStorage.installBundle(fakeBundle);
  const unwrapped = await installationStorage.unwrapInstallation(installation);
  t.is(unwrapped.installation, installation);
  t.deepEqual(unwrapped.bundle, fakeBundle);
});

test('install, unwrap installation of bundlecap', async t => {
  const bundleCaps = { id: makeHandle('BundleCap') };
  const getBundleCapFromID = id => bundleCaps[id];

  const installationStorage = makeInstallationStorage(getBundleCapFromID);

  const installation = await installationStorage.installBundleID('id');
  const unwrapped = await installationStorage.unwrapInstallation(installation);
  t.is(unwrapped.installation, installation);
  t.is(unwrapped.bundleID, 'id');
  t.is(unwrapped.bundleCap, bundleCaps.id);
});

test('unwrap promise for installation', async t => {
  const installationStorage = makeInstallationStorage();
  const fakeBundle = {};

  const installation = await installationStorage.installBundle(fakeBundle);
  const unwrapped = await installationStorage.unwrapInstallation(
    harden(Promise.resolve(installation)),
  );
  t.is(unwrapped.installation, installation);
  t.deepEqual(unwrapped.bundle, fakeBundle);
});

test('install several', async t => {
  const installationStorage = makeInstallationStorage();
  const fakeBundle1 = {};
  const fakeBundle2 = {};

  const installation1 = await installationStorage.installBundle(fakeBundle1);
  const unwrapped1 = await installationStorage.unwrapInstallation(
    installation1,
  );
  t.is(unwrapped1.installation, installation1);
  t.deepEqual(unwrapped1.bundle, fakeBundle1);

  const installation2 = await installationStorage.installBundle(fakeBundle2);
  const unwrapped2 = await installationStorage.unwrapInstallation(
    installation2,
  );
  t.is(unwrapped2.installation, installation2);
  t.deepEqual(unwrapped2.bundle, fakeBundle2);
});

test('install same twice', async t => {
  const bundleCaps = { id: makeHandle('BundleCap') };
  const getBundleCapFromID = id => bundleCaps[id];
  const installationStorage = makeInstallationStorage(getBundleCapFromID);
  const fakeBundle1 = {};

  const installation1 = await installationStorage.installBundle(fakeBundle1);
  const unwrapped1 = await installationStorage.unwrapInstallation(
    installation1,
  );
  t.is(unwrapped1.installation, installation1);
  t.deepEqual(unwrapped1.bundle, fakeBundle1);

  // If the same bundle is installed twice, the bundle is the same,
  // but the installation is different. Zoe does not currently care about
  // duplicate bundles.
  const installation2 = await installationStorage.installBundle(fakeBundle1);
  const unwrapped2 = await installationStorage.unwrapInstallation(
    installation2,
  );
  t.is(unwrapped2.installation, installation2);
  t.not(installation2, installation1);
  t.deepEqual(unwrapped2.bundle, fakeBundle1);

  // same for bundleIDs
  const installation3 = await installationStorage.installBundleID('id');
  const installation4 = await installationStorage.installBundleID('id');
  t.not(installation3, installation4);
  const unwrapped3 = await installationStorage.unwrapInstallation(
    installation3,
  );
  t.is(unwrapped3.installation, installation3);
  t.is(unwrapped3.bundleID, 'id');
  t.is(unwrapped3.bundleCap, bundleCaps.id);
  const unwrapped4 = await installationStorage.unwrapInstallation(
    installation4,
  );
  t.is(unwrapped4.installation, installation4);
  t.is(unwrapped4.bundleID, 'id');
  t.is(unwrapped4.bundleCap, bundleCaps.id);
});
