import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { withAmountUtils } from '@agoric/zoe/src/contractSupport/testing.js';
import { makeMockChainStorageRoot } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import type { TestFn } from 'ava';
import path from 'node:path';

const pathname = new URL(import.meta.url).pathname;
const dirname = path.dirname(pathname);
// TODO(turadg) see if we can get it working with .ts
const lawBridgePath = `${dirname}/../src/lawBridge.contract.js`;

const makeTestContext = async () => {
  const bundleCache = await unsafeMakeBundleCache('bundles/');
  const lawBridgeBundle = await bundleCache.load(lawBridgePath, 'lawBridge');
  const { zoe, feeMintAccessP } = await setUpZoeForTest();

  const installs = {
    lawBridge: await E(zoe).install(lawBridgeBundle),
  };

  const board = makeFakeBoard();

  const marshaller = board.getReadonlyMarshaller();

  const chainStorage = makeMockChainStorageRoot();
  const storageNode = chainStorage.makeChildNode('lawBridge');

  const stable = withAmountUtils(makeIssuerKit('FakeStable'));

  return {
    zoe: await zoe,
    feeMintAccess: await feeMintAccessP,
    chainStorage,
    storageNode,
    installs,
    board,
    marshaller,
    stable,
  };
};

const test = anyTest as TestFn<Awaited<ReturnType<typeof makeTestContext>>>;

test.before(async t => {
  t.context = await makeTestContext();
});

test('starts', async t => {
  const { stable, zoe } = t.context;
  const { creatorFacet } = await E(zoe).startInstance(
    t.context.installs.lawBridge,
    {}, // IssuerKeyword record
    {}, // terms
    { feeMintAccess: t.context.feeMintAccess, stableBrand: stable.brand },
  );
  t.truthy(creatorFacet);
});

test('basic flow', async t => {
  const { zoe, feeMintAccess, storageNode, chainStorage, marshaller, stable } =
    t.context;
  const { publicFacet } = await E(zoe).startInstance(
    t.context.installs.lawBridge,
    { FakeStable: stable.issuer }, // IssuerKeyword record
    {}, // terms
    { feeMintAccess, stableBrand: stable.brand, storageNode, marshaller },
  );
  const Fee = stable.units(1);
  const providerSeat = await E(zoe).offer(
    E(publicFacet).makeBindingInvitation(),
    harden({
      give: { Fee },
      want: { Compensation: stable.units(100) },
    }),
    harden({ Fee: stable.mint.mintPayment(Fee) }),
  );
  await eventLoopIteration();

  // verify the key was reserved
  t.deepEqual(chainStorage.keys(), [
    `mockChainStorageRoot.lawBridge.bindings.1`,
  ]);
  //   XXX getBody() assumes json
  //   t.deepEqual(
  //     chainStorage.getBody(
  //       'mockChainStorageRoot.lawBridge.bindings.1',
  //       marshaller,
  //     ),
  //     {},
  //   );

  const funder1Seat = await E(zoe).offer(
    E(publicFacet).makeFundingInvitation({ key: '1' }),
    harden({
      give: { Contribution: stable.units(99) },
    }),
    harden({ Contribution: stable.mint.mintPayment(stable.units(99)) }),
  );

  const funder2Seat = await E(zoe).offer(
    E(publicFacet).makeFundingInvitation({ key: '1' }),
    harden({
      give: { Contribution: stable.units(1) },
    }),
    harden({ Contribution: stable.mint.mintPayment(stable.units(1)) }),
  );

  await eventLoopIteration();

  t.deepEqual(await E(providerSeat).getOfferResult(), undefined);
  t.deepEqual(await E(providerSeat).getFinalAllocation(), {
    // note, they'll get whatever amount put it over the threshold
    Compensation: stable.units(100),
    Fee: stable.units(1),
  });
  // no money left in funding seats
  t.deepEqual(await E(funder1Seat).getFinalAllocation(), {
    Contribution: stable.makeEmpty(),
  });
  t.deepEqual(await E(funder2Seat).getFinalAllocation(), {
    Contribution: stable.makeEmpty(),
  });
});
