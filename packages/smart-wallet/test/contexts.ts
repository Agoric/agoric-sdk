import { BridgeId, deeplyFulfilledObject } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { makeScopedBridge } from '@agoric/vats';
import type { Installation } from '@agoric/zoe';
import { E } from '@endo/far';
import type { ExecutionContext } from 'ava';
import path from 'path';
import { withAmountUtils } from './supports.ts';

export const makeDefaultTestContext = async (
  t: ExecutionContext,
  makeSpace: (
    logger: (...args: unknown[]) => void,
  ) => Promise<ChainBootstrapSpace>,
) => {
  // To debug, pass t.log instead of null logger
  const log = () => null;
  const { consume } = await makeSpace(log);
  const { agoricNames, zoe } = consume;

  //#region Installs
  const pathname = new URL(import.meta.url).pathname;
  const dirname = path.dirname(pathname);

  const bundleCache = await unsafeMakeBundleCache('bundles/');
  const bundle = await bundleCache.load(
    `${dirname}/../src/walletFactory.js`,
    'walletFactory',
  );
  const installation: Promise<
    Installation<import('../src/walletFactory.js').start>
  > = E(zoe).install(bundle);
  //#endregion

  // copied from makeClientBanks()
  const storageNode = await makeStorageNodeChild(
    consume.chainStorage,
    'wallet',
  );

  const assetPublisher = await E(consume.bankManager).getBankForAddress(
    'anyAddress',
  );
  const bridgeManager = await consume.bridgeManager;
  const walletBridgeManager = await (bridgeManager &&
    makeScopedBridge(bridgeManager, BridgeId.WALLET));

  const customTerms = await deeplyFulfilledObject(
    harden({
      agoricNames,
      board: consume.board,
      assetPublisher,
    }),
  );

  const walletFactory = await E(zoe).startInstance(
    installation,
    {},
    customTerms,
    { storageNode, walletBridgeManager },
  );

  const simpleProvideWallet = async (address: string) => {
    // copied from makeClientBanks()
    const bank = E(consume.bankManager).getBankForAddress(address);

    const [wallet, _isNew] = await E(
      walletFactory.creatorFacet,
    ).provideSmartWallet(address, bank, consume.namesByAddressAdmin);
    return wallet;
  };

  const anchor = withAmountUtils(
    await deeplyFulfilledObject(consume.testFirstAnchorKit),
  );

  return {
    anchor,
    invitationBrand: await E(E(zoe).getInvitationIssuer()).getBrand(),
    sendToBridge:
      walletBridgeManager &&
      ((obj: unknown) => E(walletBridgeManager).toBridge(obj)),
    consume,
    simpleProvideWallet,
  };
};
