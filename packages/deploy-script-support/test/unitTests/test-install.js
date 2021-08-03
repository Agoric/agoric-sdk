/* global require */
// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { makeZoe } from '@agoric/zoe';
import fakeVatAdmin from '@agoric/zoe/tools/fakeVatAdmin';
import { makeBoard } from '@agoric/vats/src/lib-board';
import bundleSource from '@agoric/bundle-source';

import '../../exported';

import { makeInstall } from '../../src/install.js';
import { makeResolvePaths } from '../../src/resolvePath.js';

test('install', async t => {
  const { resolvePathForPackagedContract } = makeResolvePaths(
    () => '',
    require.resolve,
  );

  const zoe = makeZoe(fakeVatAdmin);

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
