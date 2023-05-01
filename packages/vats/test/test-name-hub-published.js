// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { makeMockChainStorageRoot } from '@agoric/inter-protocol/test/supports.js';
import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { makeDurableZone } from '@agoric/zone/durable.js';
import {
  makePromiseSpaceForNameHub,
  makeWellKnownSpaces,
} from '../src/core/utils.js';
import { makePromiseSpace } from '../src/core/promise-space.js';
import {
  publishAgoricNames,
  setupClientManager,
} from '../src/core/chain-behaviors.js';
import { makeBoard } from '../src/lib-board.js';
import { makeAddressNameHubs } from '../src/core/basic-behaviors.js';
import { makeNameHubKit } from '../src/nameHub.js';
import { buildRootObject as buildAgoricNamesRoot } from '../src/vat-agoricNames.js';
import { buildRootObject as buildProvisioningRoot } from '../src/vat-provisioning.js';

test('publishAgoricNames exports instances to vstorage', async t => {
  const space = makePromiseSpace({ log: t.log });
  const storageRoot = makeMockChainStorageRoot();
  const zone = makeDurableZone(makeScalarBigMapStore('Z', { durable: true }));
  const provider = buildAgoricNamesRoot(
    undefined,
    undefined,
    zone.subZone('A').mapStore('A', { durable: true }),
  );
  const { agoricNames, agoricNamesAdmin } = provider.getNameHubKit();
  await makeWellKnownSpaces(provider);
  const board = makeBoard();
  const marshaller = board.getPublishingMarshaller();
  space.produce.agoricNames.resolve(agoricNames);
  space.produce.agoricNamesAdmin.resolve(agoricNamesAdmin);
  space.produce.chainStorage.resolve(storageRoot);
  space.produce.board.resolve(board);
  const provisioning = buildProvisioningRoot(
    undefined,
    undefined,
    zone.subZone('P').mapStore('P', { durable: true }),
  );
  space.produce.provisioning.resolve(provisioning);
  const namedVat = { consume: { agoricNames: provider } };
  /** @type {any} */
  const powers = { ...space, namedVat };

  await Promise.all([
    setupClientManager(powers),
    makeAddressNameHubs(powers),
    publishAgoricNames(powers),
  ]);
  const ammInstance = makeHandle('instance');
  const instanceAdmin = await agoricNamesAdmin.lookupAdmin('instance');
  await instanceAdmin.update('amm', ammInstance);

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
