// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeHandle } from '../../../src/makeHandle.js';
import { makeInstallationStorage } from '../../../src/zoeService/installationStorage.js';

test('install, unwrap installations', async t => {
  const { install, unwrapInstallation } = makeInstallationStorage();
  const fakeBundle = {};

  const installation = await install(fakeBundle);
  const unwrapped = await unwrapInstallation(installation);
  t.is(unwrapped.installation, installation);
  t.is(unwrapped.bundleOrBundlecap, fakeBundle);
});

test('install, unwrap installation of bundlecap', async t => {
  const bundlecaps = { id: makeHandle('Bundlecap') };
  const getBundlecapFromID = id => bundlecaps[id];

  const { install, unwrapInstallation } =
    makeInstallationStorage(getBundlecapFromID);

  const installation = await install('id');
  const unwrapped = await unwrapInstallation(installation);
  t.is(unwrapped.installation, installation);
  t.is(unwrapped.bundleOrBundlecap, bundlecaps.id);
  t.is(installation.getBundleID(), 'id');
});

test('unwrap promise for installation', async t => {
  const { install, unwrapInstallation } = makeInstallationStorage();
  const fakeBundle = {};

  const installation = await install(fakeBundle);
  const unwrapped = await unwrapInstallation(Promise.resolve(installation));
  t.is(unwrapped.installation, installation);
  t.is(unwrapped.bundleOrBundlecap, fakeBundle);
});

test('install several', async t => {
  const { install, unwrapInstallation } = makeInstallationStorage();
  const fakeBundle1 = {};
  const fakeBundle2 = {};

  const installation1 = await install(fakeBundle1);
  const unwrapped1 = await unwrapInstallation(installation1);
  t.is(unwrapped1.installation, installation1);
  t.is(unwrapped1.bundleOrBundlecap, fakeBundle1);

  const installation2 = await install(fakeBundle2);
  const unwrapped2 = await unwrapInstallation(installation2);
  t.is(unwrapped2.installation, installation2);
  t.is(unwrapped2.bundleOrBundlecap, fakeBundle2);
});

test('install same twice', async t => {
  const bundlecaps = { id: makeHandle('Bundlecap') };
  const getBundlecapFromID = id => bundlecaps[id];
  const { install, unwrapInstallation } =
    makeInstallationStorage(getBundlecapFromID);
  const fakeBundle1 = {};

  const installation1 = await install(fakeBundle1);
  const unwrapped1 = await unwrapInstallation(installation1);
  t.is(unwrapped1.installation, installation1);
  t.is(unwrapped1.bundleOrBundlecap, fakeBundle1);

  // If the same bundle is installed twice, the bundle is the same,
  // but the installation is different. Zoe does not currently care about
  // duplicate bundles.
  const installation2 = await install(fakeBundle1);
  const unwrapped2 = await unwrapInstallation(installation2);
  t.is(unwrapped2.installation, installation2);
  t.not(installation2, installation1);
  t.is(unwrapped2.bundleOrBundlecap, fakeBundle1);

  const installation3 = await install('id');
  const installation4 = await install('id');
  t.not(installation3, installation4);
  const unwrapped3 = await unwrapInstallation(installation3);
  t.is(unwrapped3.installation, installation3);
  t.is(unwrapped3.bundleOrBundlecap, bundlecaps.id);
  const unwrapped4 = await unwrapInstallation(installation4);
  t.is(unwrapped4.installation, installation4);
  t.is(unwrapped4.bundleOrBundlecap, bundlecaps.id);

  t.is(installation3.getBundleID(), 'id');
  t.is(installation4.getBundleID(), 'id');
});
