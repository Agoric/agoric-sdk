// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeZoeKit } from '@agoric/zoe';
import fakeVatAdmin from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeBoard } from '@agoric/vats/src/lib-board.js';
import bundleSource from '@endo/bundle-source';
import { resolve as importMetaResolve } from 'import-meta-resolve';

import '../../exported.js';

import { makeInstall } from '../../src/install.js';

test('install', async t => {
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);

  let addedInstallation;

  const installationManager = {
    add: (_petname, installation) => (addedInstallation = installation),
  };

  const board = makeBoard();
  const install = makeInstall(bundleSource, zoe, installationManager, board);

  const resolvedUrl = await importMetaResolve(
    '@agoric/zoe/src/contracts/automaticRefund.js',
    import.meta.url,
  );
  const resolvedPath = new URL(resolvedUrl).pathname;

  const { installation, id } = await install(resolvedPath, 'automaticRefund');
  t.deepEqual(installation, addedInstallation);
  t.truthy(installation.getBundle());
  t.is(id, board.getId(installation));
});
