// @ts-check
import { E, Far } from '@endo/far';
import { deeplyFulfilled } from '@endo/marshal';
import { BridgeId as BRIDGE_ID } from '@agoric/internal';
import { makeStorageNodeChild } from '../lib-chainStorage.js';
import { makeMyAddressNameAdmin, PowerFlags } from './basic-behaviors.js';

const { details: X } = assert;

/**
 * @param {ERef<ZoeService>} zoe
 * @param {Installation<import('@agoric/legacy-smart-wallet/src/walletFactory').start>} inst
 * @typedef {Awaited<ReturnType<typeof startFactoryInstance>>} WalletFactoryStartResult
 */
// eslint-disable-next-line no-unused-vars
const startFactoryInstance = (zoe, inst) => E(zoe).startInstance(inst);

/**
 * Register for PLEASE_PROVISION bridge messages and handle
 * them by providing a smart wallet from the wallet factory.
 *
 * @param {BootstrapPowers} param0
 */
export const startWalletFactory = async ({
  consume: {
    agoricNames,
    bankManager,
    board,
    bridgeManager: bridgeManagerP,
    chainStorage,
    namesByAddress,
    namesByAddressAdmin: namesByAddressAdminP,
    zoe,
  },
  produce: { client, walletFactoryStartResult },
  installation: {
    consume: { walletFactory },
  },
}) => {
  const STORAGE_PATH = 'wallet';

  const [storageNode, bridgeManager, namesByAddressAdmin] = await Promise.all([
    makeStorageNodeChild(chainStorage, STORAGE_PATH),
    bridgeManagerP,
    namesByAddressAdminP,
  ]);

  const terms = await deeplyFulfilled(
    harden({
      agoricNames,
      namesByAddress,
      board,
    }),
  );
  /** @type {WalletFactoryStartResult} */
  const x = await E(zoe).startInstance(walletFactory, {}, terms, {
    storageNode,
    // POLA contract only needs to register for srcId='wallet'
    // TODO consider a scoped attenuation of this bridge manager to just 'wallet'
    bridgeManager,
  });
  walletFactoryStartResult.resolve(x);
  const { creatorFacet } = x;

  /** @param {string} address */
  const tryLookup = async address =>
    E(namesByAddress)
      .lookup(address)
      .catch(_notFound => undefined);

  const handler = Far('provisioningHandler', {
    fromBridge: async (_srcID, obj) => {
      assert.equal(
        obj.type,
        'PLEASE_PROVISION',
        X`Unrecognized request ${obj.type}`,
      );
      const { address, powerFlags } = obj;
      console.info('PLEASE_PROVISION', address, powerFlags);

      const hubBefore = await tryLookup(address);
      assert(!hubBefore, 'already provisioned');

      if (!powerFlags.includes(PowerFlags.SMART_WALLET)) {
        return;
      }
      const myAddressNameAdmin = makeMyAddressNameAdmin(
        namesByAddressAdmin,
        address,
      );

      const bank = E(bankManager).getBankForAddress(address);
      await E(creatorFacet).provideSmartWallet(
        address,
        bank,
        myAddressNameAdmin,
      );
      console.info('provisioned', address, powerFlags);
    },
  });
  if (!bridgeManager) {
    console.warn('missing bridgeManager in startWalletFactory');
  }
  await (bridgeManager &&
    E(bridgeManager).register(BRIDGE_ID.PROVISION, handler));

  client.resolve(
    Far('dummy client', {
      assignBundle: (propertyMakers = []) => {
        console.warn('ignoring', propertyMakers.length, 'propertyMakers');
      },
    }),
  );
};

export const WALLET_FACTORY_MANIFEST = {
  [startWalletFactory.name]: {
    consume: {
      agoricNames: true,
      bankManager: 'bank',
      board: 'board',
      bridgeManager: true,
      chainStorage: 'chainStorage',
      namesByAddress: true,
      namesByAddressAdmin: true,
      zoe: 'zoe',
    },
    produce: {
      client: true, // dummy client in this configuration
      walletFactoryStartResult: true,
    },
    installation: {
      consume: { walletFactory: 'zoe' },
    },
  },
};
