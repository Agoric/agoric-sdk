import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import type { Installation } from '@agoric/zoe';

import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { E } from '@endo/far';
import type { EReturn } from '@endo/far';
import path from 'path';
import { makeMockTestSpace } from './supports.js';

import type { start as WalletFactoryStart } from '../src/walletFactory.js';

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
  const installation: Promise<Installation<WalletFactoryStart>> =
    E(zoe).install(bundle);
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

type TestContext = EReturn<typeof makeTestContext>;

const test = anyTest as TestFn<TestContext>;

test.before(async t => {
  t.context = await makeTestContext();
});

test('customTermsShape', async t => {
  const { consume, bridgeManager, installation, storageNode } = t.context;
  const { zoe } = consume;
  const privateArgs = { bridgeManager, storageNode };

  const agoricNames = await consume.agoricNames;
  const board = await consume.board;

  // extra term
  const extraTerms = {
    agoricNames,
    board,
    assetPublisher: {} as any,
    extra: board,
  } as any;
  await t.throwsAsync(
    E(zoe).startInstance(installation, {}, extraTerms, privateArgs),
    {
      message:
        'customTerms: {"agoricNames":"[Alleged: NameHubKit nameHub]","assetPublisher":{},"board":"[Alleged: Board board]","extra":"[Seen]"} - Must not have unexpected properties: ["extra"]',
    },
  );

  // missing a term
  const missingTerms = { agoricNames } as any;
  await t.throwsAsync(
    E(zoe).startInstance(installation, {}, missingTerms, privateArgs),
    {
      message:
        'customTerms: {"agoricNames":"[Alleged: NameHubKit nameHub]"} - Must have missing properties ["board","assetPublisher"]',
    },
  );
});

test('privateArgsShape', async t => {
  const { consume, bridgeManager, installation } = t.context;
  const { zoe } = consume;
  const agoricNames = await consume.agoricNames;
  const board = await consume.board;
  const terms = {
    agoricNames,
    board,
    assetPublisher: {} as any,
  };

  // missing an arg
  await t.throwsAsync(
    E(zoe).startInstance(installation, {}, terms, { bridgeManager } as any),
    {
      message: 'privateArgs: {} - Must have missing properties ["storageNode"]',
    },
  );
});
