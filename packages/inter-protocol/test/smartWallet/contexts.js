// @ts-check
import { deeplyFulfilledObject } from '@agoric/internal';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { makeStorageNodeChild } from '@agoric/vats/src/lib-chainStorage.js';
import { E } from '@endo/far';
import path from 'path';
import { createPriceFeed } from '../../src/proposals/price-feed-proposal.js';
import { withAmountUtils } from '../supports.js';

/**
 * @param {import('ava').ExecutionContext} t
 * @param {(logger) => Promise<ChainBootstrapSpace>} makeSpace
 */
export const makeDefaultTestContext = async (t, makeSpace) => {
  // To debug, pass t.log instead of null logger
  const log = () => null;
  const { consume, produce } = await makeSpace(log);
  const { agoricNames, zoe } = consume;

  // #region Installs
  const pathname = new URL(import.meta.url).pathname;
  const dirname = path.dirname(pathname);

  const bundleCache = await unsafeMakeBundleCache('bundles/');
  const bundle = await bundleCache.load(
    `${dirname}/../../../smart-wallet/src/walletFactory.js`,
    'walletFactory',
  );
  /** @type {Promise<Installation<import('@agoric/smart-wallet/src/walletFactory.js').start>>} */
  const installation = E(zoe).install(bundle);
  // #endregion

  // copied from makeClientBanks()
  const storageNode = await makeStorageNodeChild(
    consume.chainStorage,
    'wallet',
  );

  const bridgeManager = await consume.bridgeManager;
  const walletFactory = await E(zoe).startInstance(
    installation,
    {},
    {
      agoricNames,
      board: consume.board,
    },
    { storageNode, bridgeManager },
  );

  const simpleProvideWallet = async address => {
    // copied from makeClientBanks()
    const bank = E(consume.bankManager).getBankForAddress(address);

    const [wallet, _isNew] = await E(
      walletFactory.creatorFacet,
    ).provideSmartWallet(address, bank, consume.namesByAddressAdmin);
    return wallet;
  };

  /**
   *
   * @param {string[]} oracleAddresses
   * @param {string} inBrandName
   * @param {string} outBrandName
   */
  const simpleCreatePriceFeed = async (
    oracleAddresses,
    inBrandName = 'ATOM',
    outBrandName = 'USD',
  ) => {
    // copied from coreProposalBehavior: Publish the installations for behavior dependencies.
    /** @type {ERef<import('@agoric/vats').NameAdmin>} */
    const installAdmin = E(consume.agoricNamesAdmin).lookupAdmin(
      'installation',
    );
    const paBundle = await bundleCache.load(
      '../zoe/src/contracts/priceAggregator.js',
      'priceAggregator',
    );
    /** @type {Promise<Installation<import('@agoric/zoe/src/contracts/priceAggregator.js').start>>} */
    const paInstallation = E(zoe).install(paBundle);
    await E(installAdmin).update('priceAggregator', paInstallation);

    await createPriceFeed(
      { consume, produce },
      {
        options: {
          priceFeedOptions: {
            AGORIC_INSTANCE_NAME: `${inBrandName}-${outBrandName} price feed`,
            contractTerms: {
              POLL_INTERVAL: 1n,
            },
            oracleAddresses,
            IN_BRAND_NAME: inBrandName,
            OUT_BRAND_NAME: outBrandName,
          },
        },
      },
    );
  };

  const anchor = withAmountUtils(
    // @ts-expect-error xxx type debt
    await deeplyFulfilledObject(consume.testFirstAnchorKit),
  );

  return {
    anchor,
    invitationBrand: await E(E(zoe).getInvitationIssuer()).getBrand(),
    sendToBridge: bridgeManager && bridgeManager.toBridge,
    consume,
    simpleProvideWallet,
    simpleCreatePriceFeed,
  };
};
