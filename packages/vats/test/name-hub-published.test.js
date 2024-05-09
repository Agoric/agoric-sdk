import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { makeMockChainStorageRoot } from '@agoric/internal/src/storage-test-utils.js';
import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import {
  makeAgoricNamesAccess,
  makePromiseSpaceForNameHub,
} from '../src/core/utils.js';
import { makePromiseSpace } from '../src/core/promise-space.js';
import {
  publishAgoricNames,
  setupClientManager,
} from '../src/core/chain-behaviors.js';
import { makeFakeBoard } from '../tools/board-utils.js';
import { makeAddressNameHubs } from '../src/core/basic-behaviors.js';
import { makeNameHubKit } from '../src/nameHub.js';

test('publishAgoricNames publishes AMM instance', async t => {
  const space = makePromiseSpace();
  const storageRoot = makeMockChainStorageRoot();
  const { agoricNames, agoricNamesAdmin } = await makeAgoricNamesAccess();
  const board = makeFakeBoard();
  const marshaller = board.getPublishingMarshaller();
  space.produce.agoricNames.resolve(agoricNames);
  space.produce.agoricNamesAdmin.resolve(agoricNamesAdmin);
  space.produce.chainStorage.resolve(storageRoot);
  space.produce.board.resolve(board);

  await Promise.all([
    setupClientManager(/** @type {any} */ (space)),
    makeAddressNameHubs(/** @type {any} */ (space)),
    publishAgoricNames(/** @type {any} */ (space)),
  ]);
  const ammInstance = makeHandle('instance');
  const instanceAdmin = await agoricNamesAdmin.lookupAdmin('instance');
  instanceAdmin.update('amm', ammInstance);

  await eventLoopIteration(); // wait for publication to settle

  t.deepEqual(
    storageRoot.getBody(
      'mockChainStorageRoot.agoricNames.instance',
      marshaller,
    ),
    [['amm', ammInstance]],
  );
});

test('promise space reserves non-well-known names', async t => {
  const { nameHub, nameAdmin } = makeNameHubKit();
  const remoteAdmin = Promise.resolve(nameAdmin);
  const space = makePromiseSpaceForNameHub(remoteAdmin);

  const thing1 = space.consume.thing1;
  space.produce.thing1.resolve(true);
  t.is(await thing1, true);

  t.is(await nameHub.lookup('thing1'), true);
});
