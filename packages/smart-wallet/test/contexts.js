import { BridgeId, deeplyFulfilledObject } from '@agoric/internal';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { E } from '@endo/far';
import { makeScopedBridge } from '@agoric/vats';
import { smartWalletSourceSpecRegistry } from '../source-spec-registry.js';
import { withAmountUtils } from './supports.js';

/**
 * @import {ExecutionContext} from 'ava';
 * @import {start as StartWalletFactory} from '../src/walletFactory.js';
 * @import {Installation} from '@agoric/zoe';
 * @import {ChainBootstrapSpace} from '@agoric/vats/src/core/types.js';
 */

/**
 * @param {ExecutionContext} t
 * @param {(logger) => Promise<ChainBootstrapSpace>} makeSpace
 */
export const makeDefaultTestContext = async (t, makeSpace) => {
  // To debug, pass t.log instead of null logger
  const log = () => null;
  const { consume } = await makeSpace(log);
  const { agoricNames, zoe } = consume;

  //#region Installs
  const bundleCache = await unsafeMakeBundleCache('bundles/');
  const { walletFactoryBundle: bundle } = await bundleCache.loadRegistry(
    smartWalletSourceSpecRegistry,
  );
  /** @type {Promise<Installation<StartWalletFactory>>} */
  const installation = E(zoe).install(bundle);
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

  const simpleProvideWallet = async address => {
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
      walletBridgeManager && (obj => E(walletBridgeManager).toBridge(obj)),
    consume,
    simpleProvideWallet,
  };
};
