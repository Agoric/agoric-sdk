import { promises as fs } from 'node:fs';

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import {
  availableRunUtilsFixtureNames,
  isRunUtilsFixtureName,
  loadOrCreateRunUtilsFixture,
  loadRunUtilsFixture,
} from './runutils-fixtures.js';

test('runutils fixture names are exposed and validated', t => {
  const names = availableRunUtilsFixtureNames();
  t.true(names.includes('vow-offer-results'));
  t.true(isRunUtilsFixtureName('vow-offer-results'));
  t.false(isRunUtilsFixtureName('not-a-fixture'));
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
