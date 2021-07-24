/* global require */
// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { makeZoe } from '@agoric/zoe';
import fakeVatAdmin from '@agoric/zoe/tools/fakeVatAdmin';
import { makeBoard } from '@agoric/vats/src/lib-board';
import bundleSource from '@agoric/bundle-source';
import { makeAndUseChargeAccount } from '@agoric/zoe/src/useChargeAccount';

import '../../exported';

import { makeInstall } from '../../src/install';
import { makeResolvePaths } from '../../src/resolvePath';

test('install', async t => {
  const { resolvePathForPackagedContract } = makeResolvePaths(
    () => '',
    require.resolve,
  );

  const { zoeService } = makeZoe(fakeVatAdmin);
  const zoe = makeAndUseChargeAccount(zoeService);

  let addedInstallation;

  const installationManager = {
    add: (_petname, installation) => (addedInstallation = installation),
  };

  const board = makeBoard();
  const install = makeInstall(bundleSource, zoe, installationManager, board);

  const resolvedPath = resolvePathForPackagedContract(
    '@agoric/zoe/src/contracts/automaticRefund',
  );

  const { installation, id } = await install(resolvedPath, 'automaticRefund');
  t.deepEqual(installation, addedInstallation);
  t.truthy(installation.getBundle());
  t.is(id, board.getId(installation));
});
