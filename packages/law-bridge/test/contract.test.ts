import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { makeMockChainStorageRoot } from '@agoric/internal/src/storage-test-utils.js';
import path from 'node:path';
import { E } from '@endo/far';

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

  return {
    zoe: await zoe,
    feeMintAccess: await feeMintAccessP,
    chainStorage,
    installs,
    board,
    marshaller,
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
