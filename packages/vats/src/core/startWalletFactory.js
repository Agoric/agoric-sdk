// @ts-check
import { E, Far } from '@endo/far';
import { deeplyFulfilled } from '@endo/marshal';
import { BridgeId as BRIDGE_ID } from '@agoric/internal';
import { AmountMath } from '@agoric/ertp';
import { makeStorageNodeChild } from '../lib-chainStorage.js';
import { Stable } from '../tokens.js';

/**
 * @param {ERef<ZoeService>} zoe
 * @param {Installation<import('@agoric/legacy-smart-wallet/src/walletFactory').start>} inst
 * @typedef {Awaited<ReturnType<typeof startFactoryInstance>>} WalletFactoryStartResult
 */
// eslint-disable-next-line no-unused-vars
const startFactoryInstance = (zoe, inst) => E(zoe).startInstance(inst);

const StableUnit = BigInt(10 ** Stable.displayInfo.decimalPlaces);

/**
 * Register for PLEASE_PROVISION bridge messages and handle
 * them by providing a smart wallet from the wallet factory.
 *
 * @param {BootstrapPowers} param0
 * @param {{
 *   options?: {
 *     perAccountInitialValue?: bigint
 *   },
 * }} [config]
 */
export const startWalletFactory = async (
  {
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
    produce: { client, walletFactoryStartResult, provisionPoolStartResult },
    installation: {
      consume: { walletFactory, provisionPool },
    },
    brand: {
      consume: { [Stable.symbol]: feeBrandP },
    },
    issuer: {
      consume: { [Stable.symbol]: feeIssuerP },
    },
  },
  { options: { perAccountInitialValue = (StableUnit * 25n) / 100n } = {} } = {},
) => {
  const STORAGE_PATH = 'wallet';
  const [bridgeManager, poolAddr] = await Promise.all([
    bridgeManagerP,
    E(bankManager).getModuleAccountAddress('vbank/provision'),
  ]);
  if (!bridgeManager) {
    console.warn('startWalletFactory needs bridgeManager (not sim chain)');
    return;
  }
  console.log('provision pool', { poolAddr });
  if (!poolAddr) {
    console.warn(
      'startWalletFactory needs vbank/provision module addres (not sim chain)',
    );
    return;
  }
  const [storageNode, namesByAddressAdmin, feeBrand, feeIssuer] =
    await Promise.all([
      makeStorageNodeChild(chainStorage, STORAGE_PATH),
      namesByAddressAdminP,
      feeBrandP,
      feeIssuerP,
    ]);

  const terms = await deeplyFulfilled(
    harden({
      agoricNames,
      namesByAddress,
      board,
    }),
  );
  /** @type {WalletFactoryStartResult} */
  const wfFacets = await E(zoe).startInstance(
    walletFactory,
    { Fee: feeIssuer },
    terms,
    {
      storageNode,
      // POLA contract only needs to register for srcId='wallet'
      // TODO consider a scoped attenuation of this bridge manager to just 'wallet'
      bridgeManager,
    },
  );
  walletFactoryStartResult.resolve(wfFacets);
  const poolBank = E(bankManager).getBankForAddress(poolAddr);
  const ppTerms = harden({
    perAccountInitialAmount: AmountMath.make(feeBrand, perAccountInitialValue),
  });

  /** @type {Awaited<ReturnType<typeof import('../provisionPool').start>>} */
  const ppFacets = await E(zoe).startInstance(
    provisionPool,
    undefined,
    ppTerms,
    harden({ poolBank }),
  );
  provisionPoolStartResult.resolve(ppFacets);

  const handler = await E(ppFacets.creatorFacet).makeHandler({
    bankManager,
    namesByAddressAdmin,
    walletFactory: wfFacets.creatorFacet,
  });

  await E(bridgeManager).register(BRIDGE_ID.PROVISION, handler);

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
      provisionPoolStartResult: true,
    },
    installation: {
      consume: { walletFactory: 'zoe', provisionPool: 'zoe' },
    },
    brand: {
      consume: { [Stable.symbol]: 'zoe' },
    },
    issuer: {
      consume: { [Stable.symbol]: 'zoe' },
    },
  },
};
