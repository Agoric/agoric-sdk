// @ts-check
import { E, Far } from '@endo/far';
import { deeplyFulfilled } from '@endo/marshal';
import { BridgeId as BRIDGE_ID, deeplyFulfilledObject } from '@agoric/internal';
import { AmountMath } from '@agoric/ertp';
import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';
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
 *   economicCommitteeCreatorFacet: CommitteeElectorateCreatorFacet
 * }>} powers
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
      chainTimerService,
      economicCommitteeCreatorFacet,
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
      storageNode: walletStorageNode,
      // POLA contract only needs to register for srcId='wallet'
      // TODO consider a scoped attenuation of this bridge manager to just 'wallet'
      bridgeManager,
    },
  );
  walletFactoryStartResult.resolve(wfFacets);
  instanceProduce.walletFactory.resolve(wfFacets.instance);
  const poolBank = E(bankManager).getBankForAddress(poolAddr);

  const ppFacets = await startGovernedInstance(
    // zoe.startInstance() args
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

  await E(bridgeManager).register(BRIDGE_ID.PROVISION, handler);

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
      bridgeManager: true,
      chainStorage: 'chainStorage',
      namesByAddress: true,
      namesByAddressAdmin: true,
      zoe: 'zoe',
      chainTimerService: 'timer',
      economicCommitteeCreatorFacet: 'economicCommittee',
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
