import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { makeMockChainStorageRoot } from '@agoric/internal/src/storage-test-utils.js';
import path from 'node:path';
import { E } from '@endo/far';
import { withAmountUtils } from '@agoric/inter-protocol/test/supports.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';

const pathname = new URL(import.meta.url).pathname;
const dirname = path.dirname(pathname);
// TODO(turadg) see if we can get it working with .ts
const lawBridgePath = `${dirname}/../src/lawBridge.contract.js`;

const makeTestContext = async () => {
  const bundleCache = await unsafeMakeBundleCache('bundles/');
  const lawBridgeBundle = await bundleCache.load(lawBridgePath, 'lawBridge');
  const { zoe, feeMintAccessP } = await setUpZoeForTest();

  const installs = {
    // @ts-expect-error bad ZoeService type
    lawBridge: await E(zoe).install(lawBridgeBundle),
  };

  const board = makeFakeBoard();

  const marshaller = board.getReadonlyMarshaller();

  const chainStorage = makeMockChainStorageRoot();
  const storageNode = chainStorage.makeChildNode('lawBridge');

  const mintedIssuer = await E(zoe).getFeeIssuer();
  // @ts-expect-error missing IssuerKit properties not needed in the test
  const mintedKit: IssuerKit<'nat'> = {
    issuer: mintedIssuer,
    brand: await E(mintedIssuer).getBrand(),
  };
  const minted = withAmountUtils(mintedKit);

  return {
    zoe: await zoe,
    feeMintAccess: await feeMintAccessP,
    chainStorage,
    storageNode,
    installs,
    board,
    marshaller,
    minted,
  };
};

const test = anyTest as TestFn<Awaited<ReturnType<typeof makeTestContext>>>;

test.before(async t => {
  t.context = await makeTestContext();
});

test('starts', async t => {
  const { zoe } = t.context;
  // @ts-expect-error bad ZoeService type
  const { creatorFacet } = await E(zoe).startInstance(
    t.context.installs.lawBridge,
    {}, // IssuerKeyword record
    {}, // terms
    { feeMintAccess: t.context.feeMintAccess },
  );
  t.truthy(creatorFacet);
});

test('makeBindingInvitation', async t => {
  const { zoe, feeMintAccess, storageNode, chainStorage, marshaller, minted } =
    t.context;
  // @ts-expect-error bad ZoeService type
  const { publicFacet } = await E(zoe).startInstance(
    t.context.installs.lawBridge,
    {}, // IssuerKeyword record
    {}, // terms
    { feeMintAccess, storageNode, marshaller },
  );
  const key = 'myArtwork';
  // TODO make an offer
  const seat = await E(zoe).offer(
    E(publicFacet).makeBindingInvitation({ key }),
    // TODO pay a buck
    // harden({
    //   give: { Fee: minted.units(1) },
    // }),
    // harden({ In: anchor.mint.mintPayment(giveAnchor) }),
  );
  await eventLoopIteration();

  // verify the key was reserved
  t.deepEqual(chainStorage.keys(), [`mockChainStorageRoot.lawBridge.${key}`]);
  //   t.deepEqual(chainStorage.getBody('lawBridge', marshaller), {});

  //   what happens if we do it again with the same key?
  await t.throwsAsync(() => E(publicFacet).makeBindingInvitation({ key }), {
    message: 'Binding already exists: myArtwork',
  });
});
