import { deeplyFulfilledObject } from '@agoric/internal';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { makeStorageNodeChild } from '@agoric/vats/src/lib-chainStorage.js';
import { makeNameHubKit } from '@agoric/vats/src/nameHub.js';
import { E, Far } from '@endo/far';
import path from 'path';
import { withAmountUtils } from './supports.js';

/**
 * @param {import('ava').ExecutionContext} t
 * @param {(logger) => Promise<ChainBootstrapSpace>} makeSpace
 */
export const makeDefaultTestContext = async (t, makeSpace) => {
  // To debug, pass t.log instead of null logger
  const log = () => null;
  const { consume } = await makeSpace(log);
  const { agoricNames, zoe } = consume;

  // Adapted from perAddress in makeAddressNameHubs()
  const reserveAddress = address => {
    // Create a name hub for this address.
    const { nameHub: myAddressNameHub, nameAdmin: rawMyAddressNameAdmin } =
      makeNameHubKit();

    /** @type {MyAddressNameAdmin} */
    const myAddressNameAdmin = Far('myAddressNameAdmin', {
      ...rawMyAddressNameAdmin,
      getMyAddress: () => address,
    });
    // reserve space for deposit facet
    myAddressNameAdmin.reserve('depositFacet');
    // Register it with the namesByAddress hub.
    return E(consume.namesByAddressAdmin).update(
      address,
      myAddressNameHub,
      myAddressNameAdmin,
    );
  };

  // #region Installs
  const pathname = new URL(import.meta.url).pathname;
  const dirname = path.dirname(pathname);

  const bundleCache = await unsafeMakeBundleCache('bundles/');
  const bundle = await bundleCache.load(
    `${dirname}/../src/walletFactory.js`,
    'walletFactory',
  );
  /** @type {Promise<Installation<import('../src/walletFactory.js').start>>} */
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
    await reserveAddress(address);

    // copied from makeClientBanks()
    const bank = E(consume.bankManager).getBankForAddress(address);
    const myAddressNameAdmin = E(consume.namesByAddressAdmin).lookupAdmin(
      address,
    );

    return E(walletFactory.creatorFacet).provideSmartWallet(
      address,
      bank,
      myAddressNameAdmin,
    );
  };

  const anchor = withAmountUtils(
    await deeplyFulfilledObject(consume.testFirstAnchorKit),
  );

  return {
    anchor,
    invitationBrand: await E(E(zoe).getInvitationIssuer()).getBrand(),
    sendToBridge: bridgeManager && bridgeManager.toBridge,
    consume,
    simpleProvideWallet,
  };
};
