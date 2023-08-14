// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import bundleSource from '@endo/bundle-source';

import '../../exported.js';

import { resolvePathname } from '@agoric/internal';
import { makeInstall } from '../../src/install.js';

test('install', async t => {
  const zoe = makeZoeForTest();

  let addedInstallation;

  /** @type {import('../../src/startInstance.js').InstallationManager} */
  // @ts-expect-error mock
  const installationManager = {
    add: (_petname, installation) => {
      addedInstallation = installation;
      return Promise.resolve();
    },
  };

  const board = makeFakeBoard();
  const install = makeInstall(bundleSource, zoe, installationManager, board);

  const resolvedPath = resolvePathname(
    '@agoric/zoe/src/contracts/automaticRefund.js',
    import.meta.url,
  );

  const { installation, id } = await install(resolvedPath, 'automaticRefund');
  t.deepEqual(installation, addedInstallation);
  t.truthy(installation.getBundle());
  t.is(id, board.getId(installation));
});
