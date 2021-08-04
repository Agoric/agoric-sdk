// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeInstallationStorage } from '../../../src/zoeService/installationStorage.js';

test('install, unwrap installations', async t => {
  const { install, unwrapInstallation } = makeInstallationStorage();
  const fakeBundle = {};

  const installation = install(fakeBundle);
  const unwrapped = await unwrapInstallation(installation);
  t.is(unwrapped.installation, installation);
  t.is(unwrapped.bundle, fakeBundle);
});

test('unwrap promise for installation', async t => {
  const { install, unwrapInstallation } = makeInstallationStorage();
  const fakeBundle = {};

  const installation = install(fakeBundle);
  const unwrapped = await unwrapInstallation(Promise.resolve(installation));
  t.is(unwrapped.installation, installation);
  t.is(unwrapped.bundle, fakeBundle);
});

test('install several', async t => {
  const { install, unwrapInstallation } = makeInstallationStorage();
  const fakeBundle1 = {};
  const fakeBundle2 = {};

  const installation1 = install(fakeBundle1);
  const unwrapped1 = await unwrapInstallation(installation1);
  t.is(unwrapped1.installation, installation1);
  t.is(unwrapped1.bundle, fakeBundle1);

  const installation2 = install(fakeBundle2);
  const unwrapped2 = await unwrapInstallation(installation2);
  t.is(unwrapped2.installation, installation2);
  t.is(unwrapped2.bundle, fakeBundle2);
});

test('install same twice', async t => {
  const { install, unwrapInstallation } = makeInstallationStorage();
  const fakeBundle1 = {};

  const installation1 = install(fakeBundle1);
  const unwrapped1 = await unwrapInstallation(installation1);
  t.is(unwrapped1.installation, installation1);
  t.is(unwrapped1.bundle, fakeBundle1);

  // If the same bundle is installed twice, the bundle is the same,
  // but the installation is different. Zoe does not currently care about
  // duplicate bundles.
  const installation2 = install(fakeBundle1);
  const unwrapped2 = await unwrapInstallation(installation2);
  t.is(unwrapped2.installation, installation2);
  t.not(installation2, installation1);
  t.is(unwrapped2.bundle, fakeBundle1);
});
