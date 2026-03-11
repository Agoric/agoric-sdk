import { promises as fs } from 'node:fs';

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import {
  availableRunUtilsFixtureNames,
  getRunUtilsFixtureNameForConfig,
  isRunUtilsFixtureName,
  loadOrCreateRunUtilsFixture,
  loadRunUtilsFixture,
} from './runutils-fixtures.js';

test('runutils fixture names are exposed and validated', t => {
  const names = availableRunUtilsFixtureNames();
  t.true(names.includes('demo-base'));
  t.true(names.includes('main-vaults-base'));
  t.true(names.includes('itest-vaults-base'));
  t.true(names.includes('orchestration-base'));
  t.true(names.includes('orchestration-ready'));
  t.true(names.includes('vow-offer-results'));
  t.true(isRunUtilsFixtureName('demo-base'));
  t.true(isRunUtilsFixtureName('main-vaults-base'));
  t.true(isRunUtilsFixtureName('itest-vaults-base'));
  t.true(isRunUtilsFixtureName('orchestration-base'));
  t.true(isRunUtilsFixtureName('orchestration-ready'));
  t.true(isRunUtilsFixtureName('vow-offer-results'));
  t.false(isRunUtilsFixtureName('not-a-fixture'));
});

test('runutils fixture config mapping covers shared boot snapshots', t => {
  t.is(
    getRunUtilsFixtureNameForConfig(
      '@agoric/vm-config/decentral-demo-config.json',
    ),
    'demo-base',
  );
  t.is(
    getRunUtilsFixtureNameForConfig(
      '@agoric/vm-config/decentral-main-vaults-config.json',
    ),
    'main-vaults-base',
  );
  t.is(
    getRunUtilsFixtureNameForConfig(
      '@agoric/vm-config/decentral-itest-vaults-config.json',
    ),
    'itest-vaults-base',
  );
  t.is(
    getRunUtilsFixtureNameForConfig(
      '@agoric/vm-config/decentral-itest-orchestration-config.json',
    ),
    'orchestration-base',
  );
  t.is(
    getRunUtilsFixtureNameForConfig('@agoric/vm-config/not-a-config.json'),
    undefined,
  );
});

test.serial(
  'loadOrCreateRunUtilsFixture returns a usable snapshot',
  async t => {
    const snapshot = await loadOrCreateRunUtilsFixture(
      'vow-offer-results',
      t.log,
    );

    t.truthy(snapshot.swingStoreDir);
    t.truthy(snapshot.kernelBundle?.endoZipBase64Sha512);
    t.truthy(snapshot.storageSnapshot);

    if (!snapshot.swingStoreDir) {
      t.fail('expected swingStoreDir');
      return;
    }
    await fs.access(snapshot.swingStoreDir);

    const loaded = await loadRunUtilsFixture('vow-offer-results');
    t.is(
      loaded.kernelBundle?.endoZipBase64Sha512,
      snapshot.kernelBundle?.endoZipBase64Sha512,
    );
  },
);
