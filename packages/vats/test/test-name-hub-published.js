// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { makeMockChainStorageRoot } from '@agoric/inter-protocol/test/supports.js';
import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import { eventLoopIteration } from '@agoric/zoe/tools/eventLoopIteration.js';
import { makeAgoricNamesAccess } from '../src/core/utils.js';
import { makePromiseSpace } from '../src/core/promise-space.js';
import {
  publishAgoricNames,
  setupClientManager,
} from '../src/core/chain-behaviors.js';
import { makeBoard } from '../src/lib-board.js';
import { makeAddressNameHubs } from '../src/core/basic-behaviors.js';

test('publishAgoricNames publishes AMM instance', async t => {
  const space = makePromiseSpace();
  const storageRoot = makeMockChainStorageRoot();
  const { agoricNames, agoricNamesAdmin } = makeAgoricNamesAccess();
  const board = makeBoard();
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

  t.throws(() => instanceAdmin.update('non-passable', new Promise(() => {})));
});
