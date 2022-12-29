// @ts-check
import { E, Far } from '@endo/far';
import { deeplyFulfilled } from '@endo/marshal';
import { deeplyFulfilledObject } from '@agoric/internal';
import { AmountMath } from '@agoric/ertp';
import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';
import { makeStorageNodeChild } from '../lib-chainStorage.js';
import { Stable } from '../tokens.js';

// Ambient types (globals)
import '@agoric/swingset-vat/src/vats/timer/types.js';

/**
 * @param {ERef<ZoeService>} zoe
 * @param {Installation<import('@agoric/smart-wallet/src/walletFactory').start>} inst
 * @typedef {Awaited<ReturnType<typeof startFactoryInstance>>} WalletFactoryStartResult
 */
// eslint-disable-next-line no-unused-vars
const startFactoryInstance = (zoe, inst) => E(zoe).startInstance(inst);

const StableUnit = BigInt(10 ** Stable.displayInfo.decimalPlaces);

/**
 *
 * @param {{
 *   zoe: ERef<ZoeService>,
 *   governedContractInstallation: ERef<Installation>,
 *   issuerKeywordRecord?: IssuerKeywordRecord,
 *   terms: Record<string, unknown>,
 *   privateArgs: any, // TODO: connect with Installation type
 * }} zoeArgs
 * @param {{
 *   governedParams: Record<string, unknown>,
 *   timer: ERef<TimerService>,
 *   contractGovernor: ERef<Installation>,
 *   economicCommitteeCreatorFacet: import('@agoric/inter-protocol/src/proposals/econ-behaviors.js').EconomyBootstrapPowers['consume']['economicCommitteeCreatorFacet']
 * }} govArgs
 */
const startGovernedInstance = async (
  {
    zoe,
    governedContractInstallation,
    issuerKeywordRecord,
    terms,
    privateArgs,
  },
  { governedParams, timer, contractGovernor, economicCommitteeCreatorFacet },
) => {
  const poserInvitationP = E(
    economicCommitteeCreatorFacet,
  ).getPoserInvitation();
  const [initialPoserInvitation, electorateInvitationAmount] =
    await Promise.all([
      poserInvitationP,
      E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
    ]);

  const governorTerms = await deeplyFulfilledObject(
    harden({
      timer,
      governedContractInstallation,
      governed: {
        terms: {
          ...terms,
          governedParams: {
            [CONTRACT_ELECTORATE]: {
              type: ParamTypes.INVITATION,
              value: electorateInvitationAmount,
            },
            ...governedParams,
          },
        },
        issuerKeywordRecord,
      },
    }),
  );
  const governorFacets = await E(zoe).startInstance(
    contractGovernor,
    {},
    governorTerms,
    harden({
      economicCommitteeCreatorFacet,
      governed: {
        ...privateArgs,
        initialPoserInvitation,
      },
    }),
  );
  const [instance, creatorFacet, adminFacet] = await Promise.all([
    E(governorFacets.creatorFacet).getInstance(),
    E(governorFacets.creatorFacet).getCreatorFacet(),
    E(governorFacets.creatorFacet).getAdminFacet(),
  ]);
  const facets = {
    instance,
    governor: governorFacets.instance,
    creatorFacet,
    adminFacet,
    governorCreatorFacet: governorFacets.creatorFacet,
  };
  return facets;
};

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
      zoe,
      chainTimerService,
      economicCommitteeCreatorFacet,
      econCharterKit,
    },
    produce: { client, walletFactoryStartResult, provisionPoolStartResult },
    installation: {
      consume: { walletFactory, provisionPool, contractGovernor },
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
      E(bankManager).getModuleAccountAddress('vbank/provision'),
    ]);
  if (!walletBridgeManager || !provisionWalletBridgeManager) {
    console.warn(
      'startWalletFactory needs wallet and provision bridgeManagers (not sim chain)',
    );
    return;
  }
  console.log('provision pool', { poolAddr });
  if (!poolAddr) {
    console.warn(
      'startWalletFactory needs vbank/provision module addres (not sim chain)',
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

  const terms = await deeplyFulfilled(
    harden({
      agoricNames,
      board,
    }),
  );
  /** @type {WalletFactoryStartResult} */
  const wfFacets = await E(zoe).startInstance(
    walletFactory,
    { Fee: feeIssuer },
    terms,
    {
      storageNode: walletStorageNode,
      walletBridgeManager,
    },
  );
  walletFactoryStartResult.resolve(wfFacets);
  instanceProduce.walletFactory.resolve(wfFacets.instance);
  const poolBank = E(bankManager).getBankForAddress(poolAddr);

  const ppFacets = await startGovernedInstance(
    {
      zoe,
      governedContractInstallation: provisionPool,
      terms: {},
      privateArgs: harden({
        poolBank,
        storageNode: poolStorageNode,
        marshaller: E(board).getPublishingMarshaller(),
      }),
    },
    {
      governedParams: {
        PerAccountInitialAmount: {
          type: ParamTypes.AMOUNT,
          value: AmountMath.make(feeBrand, perAccountInitialValue),
        },
      },
      timer: chainTimerService,
      contractGovernor,
      economicCommitteeCreatorFacet,
    },
  );
  instanceProduce.provisionPool.resolve(ppFacets.instance);

  provisionPoolStartResult.resolve(ppFacets);

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
      chainStorage: 'chainStorage',
      namesByAddressAdmin: true,
      zoe: 'zoe',
      chainTimerService: 'timer',
      economicCommitteeCreatorFacet: 'economicCommittee',
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
        contractGovernor: 'zoe',
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
