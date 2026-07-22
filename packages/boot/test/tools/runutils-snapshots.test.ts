import { promises as fs } from 'node:fs';

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import {
  availableRunUtilsSnapshotNames,
  isRunUtilsSnapshotName,
  loadOrCreateRunUtilsSnapshot,
  loadRunUtilsSnapshot,
} from './runutils-snapshots.js';

test('runutils snapshot names are exposed and validated', t => {
  const removedSnapshotName = 'vow-offer-results' as string;
  const names = availableRunUtilsSnapshotNames();
  const namesAsStrings: string[] = names;
  t.true(names.includes('demo-base'));
  t.true(names.includes('main-vaults-base'));
  t.true(names.includes('itest-vaults-base'));
  t.true(names.includes('orchestration-base'));
  t.false(namesAsStrings.includes(removedSnapshotName));
  t.true(isRunUtilsSnapshotName('demo-base'));
  t.true(isRunUtilsSnapshotName('main-vaults-base'));
  t.true(isRunUtilsSnapshotName('itest-vaults-base'));
  t.true(isRunUtilsSnapshotName('orchestration-base'));
  t.false(isRunUtilsSnapshotName(removedSnapshotName));
  t.false(isRunUtilsSnapshotName('not-a-snapshot'));
});

test.serial(
  'loadOrCreateRunUtilsSnapshot returns a usable snapshot',
  async t => {
    const snapshot = await loadOrCreateRunUtilsSnapshot(
      'orchestration-base',
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

    const loaded = await loadRunUtilsSnapshot('orchestration-base');
    t.is(
      loaded.kernelBundle?.endoZipBase64Sha512,
      snapshot.kernelBundle?.endoZipBase64Sha512,
    );
  },
);
