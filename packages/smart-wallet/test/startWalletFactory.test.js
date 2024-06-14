import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { E } from '@endo/far';
import path from 'path';
import { makeMockTestSpace } from './supports.js';

/**
 * @type {import('ava').TestFn<
 *   Awaited<ReturnType<typeof makeTestContext>>
 * >}
 */
const test = anyTest;

const makeTestContext = async () => {
  // To debug, pass t.log instead of null logger
  const log = () => null;
  const { consume } = await makeMockTestSpace(log);
  const { zoe } = consume;

  //#region Installs
  const pathname = new URL(import.meta.url).pathname;
  const dirname = path.dirname(pathname);

  const bundleCache = await unsafeMakeBundleCache('bundles/');
  const bundle = await bundleCache.load(
    `${dirname}/../src/walletFactory.js`,
    'walletFactory',
  );
  /** @type {Promise<Installation<import('../src/walletFactory.js').start>>} */
  const installation = E(zoe).install(bundle);
  //#endregion

  // copied from makeClientBanks()
  const storageNode = await makeStorageNodeChild(
    consume.chainStorage,
    'wallet',
  );

  const bridgeManager = await consume.bridgeManager;

  return {
    consume,
    bridgeManager,
    installation,
    storageNode,
  };
};

test.before(async t => {
  t.context = await makeTestContext();
});

test('customTermsShape', async t => {
  const { consume, bridgeManager, installation, storageNode } = t.context;
  const { agoricNames, board, zoe } = consume;
  const privateArgs = { bridgeManager, storageNode };

  // extra term
  await t.throwsAsync(
    E(zoe).startInstance(
      installation,
      {},
      {
        agoricNames,
        board,
        assetPublisher: /** @type {any} */ ({}),
        //   @ts-expect-error extra term
        extra: board,
      },
      privateArgs,
    ),
    {
      message:
        'customTerms: {"agoricNames":"[Promise]","assetPublisher":{},"board":"[Promise]","extra":"[Seen]"} - Must not have unexpected properties: ["extra"]',
    },
  );

  // missing a term
  await t.throwsAsync(
    E(zoe).startInstance(
      installation,
      {},
      //   @ts-expect-error missing 'board'
      {
        agoricNames,
      },
      privateArgs,
    ),
    {
      message:
        'customTerms: {"agoricNames":"[Promise]"} - Must have missing properties ["board","assetPublisher"]',
    },
  );
});

test('privateArgsShape', async t => {
  const { consume, bridgeManager, installation } = t.context;
  const { agoricNames, board, zoe } = consume;
  const terms = {
    agoricNames,
    board,
    assetPublisher: /** @type {any} */ ({}),
  };

  // missing an arg
  await t.throwsAsync(
    E(zoe).startInstance(
      installation,
      {},
      terms,
      // @ts-expect-error bridgeManager optional but storageNode required
      { bridgeManager },
    ),
    {
      message: 'privateArgs: {} - Must have missing properties ["storageNode"]',
    },
  );
});
