// @ts-check
import { E, Far } from '@endo/far';
import { deeplyFulfilled } from '@endo/marshal';
import { makeTracer, VBankAccount } from '@agoric/internal';
import { AmountMath } from '@agoric/ertp';
import { ParamTypes } from '@agoric/governance';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { Stable } from '../tokens.js';

const trace = makeTracer('StartWF');

/**
 * @param {ERef<ZoeService>} zoe
 * @param {Installation<import('@agoric/smart-wallet/src/walletFactory').prepare>} inst
 * @typedef {Awaited<ReturnType<typeof startFactoryInstance>>} WalletFactoryStartResult
 */
// eslint-disable-next-line no-unused-vars
const startFactoryInstance = (zoe, inst) => E(zoe).startInstance(inst);

const StableUnit = BigInt(10 ** Stable.displayInfo.decimalPlaces);

/**
 * Register for PLEASE_PROVISION bridge messages and handle
 * them by providing a smart wallet from the wallet factory.
 *
 * @param {BootstrapPowers & PromiseSpaceOf<{
 *   economicCommitteeCreatorFacet: import('@agoric/governance/src/committee.js').CommitteeElectorateCreatorFacet
 *   econCharterKit: {
 *     creatorFacet: Awaited<ReturnType<import('@agoric/inter-protocol/src/econCommitteeCharter.js').start>>['creatorFacet'],
 *     adminFacet: AdminFacet,
 *   } ,
 *   walletBridgeManager: import('../types.js').ScopedBridgeManager;
 *   provisionWalletBridgeManager: import('../types.js').ScopedBridgeManager;
 * }>} powers
 * @param {{
 *   options?: {
 *     perAccountInitialValue?: bigint,
 *   },
 * }} [config]
 */
export const startWalletFactory = async (
  {
    consume: {
      agoricNames,
      bankManager,
      board,
      walletBridgeManager: walletBridgeManagerP,
      provisionWalletBridgeManager: provisionWalletBridgeManagerP,
      chainStorage,
      namesByAddressAdmin: namesByAddressAdminP,
      econCharterKit,
      startUpgradeable: startUpgradeableP,
      startGovernedUpgradeable: startGovernedUpgradeableP,
    },
    produce: { client, walletFactoryStartResult, provisionPoolStartResult },
    installation: {
      consume: { walletFactory, provisionPool },
    },
    instance: { produce: instanceProduce },
    brand: {
      consume: { [Stable.symbol]: feeBrandP },
    },
    issuer: {
      consume: { [Stable.symbol]: feeIssuerP },
    },
  },
  { options: { perAccountInitialValue = (StableUnit * 25n) / 100n } = {} } = {},
) => {
  const WALLET_STORAGE_PATH = 'wallet';
  const POOL_STORAGE_PATH = 'provisionPool';
  const [walletBridgeManager, provisionWalletBridgeManager, poolAddr] =
    await Promise.all([
      walletBridgeManagerP,
      provisionWalletBridgeManagerP,
      E(bankManager).getModuleAccountAddress(VBankAccount.provision.module),
    ]);
  if (!walletBridgeManager || !provisionWalletBridgeManager) {
    console.warn(
      'startWalletFactory needs wallet and provision bridgeManagers (not sim chain)',
    );
    return;
  }
  trace('provision pool', { poolAddr });
  if (!poolAddr) {
    trace(
      'ERROR: startWalletFactory needs vbank/provision module address (not sim chain)',
    );
    return;
  }
  const [
    walletStorageNode,
    poolStorageNode,
    namesByAddressAdmin,
    feeBrand,
    feeIssuer,
  ] = await Promise.all([
    makeStorageNodeChild(chainStorage, WALLET_STORAGE_PATH),
    makeStorageNodeChild(chainStorage, POOL_STORAGE_PATH),
    namesByAddressAdminP,
    feeBrandP,
    feeIssuerP,
  ]);

  const poolBank = E(bankManager).getBankForAddress(poolAddr);
  const terms = await deeplyFulfilled(
    harden({
      agoricNames,
      board,
      assetPublisher: Far('AssetPublisher', {
        getAssetSubscription: () => E(poolBank).getAssetSubscription(),
      }),
    }),
  );

  const startUpgradeable = await startUpgradeableP;
  const wfFacets = await startUpgradeable({
    installation: walletFactory,
    issuerKeywordRecord: { Fee: feeIssuer },
    terms,
    privateArgs: {
      storageNode: walletStorageNode,
      walletBridgeManager,
    },
    label: 'walletFactory',
    produceResults: walletFactoryStartResult,
  });
  // TODO: push this resolve instance into startUpgradeable too
  // but make it optional, since not all instances go in agoricNames
  instanceProduce.walletFactory.resolve(wfFacets.instance);

  const startGovernedUpgradeable = await startGovernedUpgradeableP;
  const ppFacets = await startGovernedUpgradeable({
    installation: provisionPool,
    terms: {},
    privateArgs: harden({
      poolBank,
      storageNode: poolStorageNode,
      marshaller: await E(board).getPublishingMarshaller(),
    }),
    label: 'provisionPool',
    governedParams: {
      PerAccountInitialAmount: {
        type: ParamTypes.AMOUNT,
        value: AmountMath.make(feeBrand, perAccountInitialValue),
      },
    },
    produceResults: provisionPoolStartResult,
  });
  // TODO: push this resolve instance into startGovernedUpgradeable likewise
  instanceProduce.provisionPool.resolve(ppFacets.instance);

  const handler = await E(ppFacets.creatorFacet).makeHandler({
    bankManager,
    namesByAddressAdmin,
    walletFactory: wfFacets.creatorFacet,
  });

  await Promise.all([
    E(provisionWalletBridgeManager).setHandler(handler),
    E(E.get(econCharterKit).creatorFacet).addInstance(
      ppFacets.instance,
      ppFacets.creatorFacet,
      'provisionPool',
    ),
  ]);

  // TODO: move to its own producer, omitted in some configurations
  client.resolve(
    Far('dummy client', {
      assignBundle: (propertyMakers = []) => {
        console.warn(
          'dummy mailbox client home: ignoring',
          propertyMakers.length,
          'propertyMakers',
        );
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
      walletBridgeManager: true,
      provisionWalletBridgeManager: true,
      chainStorage: 'bridge',
      namesByAddressAdmin: true,
      startUpgradeable: true,
      startGovernedUpgradeable: true,
      econCharterKit: 'psmCharter',
    },
    produce: {
      client: true, // dummy client in this configuration
      walletFactoryStartResult: true,
      provisionPoolStartResult: true,
    },
    installation: {
      consume: {
        walletFactory: 'zoe',
        provisionPool: 'zoe',
      },
    },
    brand: {
      consume: { [Stable.symbol]: 'zoe' },
    },
    issuer: {
      consume: { [Stable.symbol]: 'zoe' },
    },
    instance: {
      produce: {
        provisionPool: 'provisionPool',
        walletFactory: 'walletFactory',
      },
    },
  },
};

export const getManifestForWalletFactory = (
  { restoreRef },
  { installKeys },
) => {
  return {
    manifest: WALLET_FACTORY_MANIFEST,
    installations: {
      provisionPool: restoreRef(installKeys.provisionPool),
      walletFactory: restoreRef(installKeys.walletFactory),
    },
  };
};
