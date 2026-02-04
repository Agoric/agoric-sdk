// @jessie-check
/* eslint-disable @agoric/group-jsdoc-imports -- due to conflicting `start` values */

import { AmountMath } from '@agoric/ertp';
import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { E } from '@endo/far';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { Stable } from '@agoric/internal/src/tokens.js';
import { makeReserveTerms } from '../reserve/params.js';
import { makeGovernedTerms as makeGovernedVFTerms } from '../vaultFactory/params.js';

/**
 * @import {GovernorCreatorFacet, GovernanceFacetKit, GovernorStartedInstallationKit} from '@agoric/governance/src/types.js';
 * @import {StartedInstanceKit} from '@agoric/zoe/src/zoeService/utils.js';
 * @import {Amount, Brand, NatValue, Payment} from '@agoric/ertp';
 * @import {AdminFacet, Instance} from '@agoric/zoe';
 * @import {MapStore, SetStore} from '@agoric/store';
 * @import {RelativeTime} from '@agoric/time';
 * @import {WellKnownSpaces} from '@agoric/vats/src/core/types.js';
 * @import {ChainBootstrapSpace} from '@agoric/vats/src/core/types.js';
 * @import {PromiseSpaceOf} from '@agoric/vats/src/core/types.js';
 * @import {CommitteeElectorateCreatorFacet} from '@agoric/governance/src/committee.js';
 * @import {PeriodicFeeCollector} from '../feeDistributor.js';
 */

// Duplicated from vaultFactory/types.js to solve a CI problem.
// Not worth refactoring to DRY because vaultFactory is going away.
/**
 * @typedef {object} InterestTiming
 * @property {RelativeTime} chargingPeriod in seconds
 * @property {RelativeTime} recordingPeriod in seconds
 */

const trace = makeTracer('RunEconBehaviors', true);

export const SECONDS_PER_MINUTE = 60n;
export const SECONDS_PER_HOUR = 60n * 60n;
export const SECONDS_PER_DAY = 24n * SECONDS_PER_HOUR;
export const SECONDS_PER_WEEK = 7n * SECONDS_PER_DAY;

/** @import {start as VFStart} from '../vaultFactory/vaultFactory.js' */
/** @typedef {Awaited<ReturnType<VFStart>>['publicFacet']} VaultFactoryPublicFacet */

/**
 * @typedef {object} PSMKit
 * @property {string} label
 * @property {Instance<typeof import('../psm/psm.js').start>} psm
 * @property {Instance<
 *   typeof import('../../../governance/src/contractGovernor.js').start
 * >} psmGovernor
 * @property {Awaited<
 *   ReturnType<
 *     Awaited<
 *       ReturnType<typeof import('../psm/psm.js').start>
 *     >['creatorFacet']['getLimitedCreatorFacet']
 *   >
 * >} psmCreatorFacet
 * @property {GovernorCreatorFacet<
 *   typeof import('../../src/psm/psm.js').start
 * >} psmGovernorCreatorFacet
 * @property {AdminFacet} psmAdminFacet
 */

/**
 * @typedef {WellKnownSpaces & ChainBootstrapSpace & EconomyBootstrapSpace} EconomyBootstrapPowers
 *
 *
 * @typedef {PromiseSpaceOf<{
 *   economicCommitteeKit: CommitteeStartResult;
 *   economicCommitteeCreatorFacet: CommitteeElectorateCreatorFacet;
 *   feeDistributorKit: StartedInstanceKit<
 *     typeof import('../feeDistributor.js').start
 *   >;
 *   periodicFeeCollectors: MapStore<number, PeriodicFeeCollector>;
 *   psmKit: MapStore<Brand, PSMKit>;
 *   anchorBalancePayments: MapStore<Brand, Payment<'nat'>>;
 *   econCharterKit: EconCharterStartResult;
 *   reserveKit: GovernanceFacetKit<
 *     typeof import('../reserve/assetReserve.js').start
 *   >;
 *   vaultFactoryKit: GovernanceFacetKit<VFStart>;
 *   minInitialDebt: NatValue;
 * }>} EconomyBootstrapSpace
 */

/**
 * @typedef {StartedInstanceKit<
 *   typeof import('../econCommitteeCharter.js').start
 * >} EconCharterStartResult
 */
/**
 * @typedef {StartedInstanceKit<
 *   typeof import('@agoric/governance/src/committee.js').start
 * >} CommitteeStartResult
 */

/**
 * @file A collection of productions, each of which declares inputs and outputs.
 *   Each function is passed a set of powers for reading from and writing to the
 *   vat config.
 *
 *   Each of the things they produce they're responsible for resolving or setting.
 *
 *   In production called by @agoric/vats to bootstrap.
 */

/** @param {EconomyBootstrapPowers} powers */
export const setupReserve = async ({
  consume: {
    board,
    feeMintAccess: feeMintAccessP,
    chainStorage,
    chainTimerService,
    diagnostics,
    zoe,
    economicCommitteeCreatorFacet: committeeCreator,
  },
  produce: { reserveKit },
  issuer: {
    consume: { [Stable.symbol]: centralIssuer },
  },
  instance: {
    produce: { reserve: reserveInstanceProducer, reserveGovernor },
  },
  installation: {
    consume: {
      contractGovernor: governorInstallation,
      reserve: reserveInstallation,
    },
  },
}) => {
  const STORAGE_PATH = 'reserve';
  trace('setupReserve');
  const poserInvitationP = E(committeeCreator).getPoserInvitation();

  const [poserInvitation, poserInvitationAmount, feeMintAccess] =
    await Promise.all([
      poserInvitationP,
      E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
      feeMintAccessP,
    ]);

  const storageNode = await makeStorageNodeChild(chainStorage, STORAGE_PATH);
  const marshaller = await E(board).getReadonlyMarshaller();

  const reserveTerms = makeReserveTerms(poserInvitationAmount);

  const reserveGovernorTerms = await deeplyFulfilledObject(
    harden({
      timer: chainTimerService,
      governedContractInstallation: reserveInstallation,
      governed: {
        terms: reserveTerms,
        issuerKeywordRecord: { Central: centralIssuer },
        label: 'reserve',
      },
    }),
  );
  const privateArgs = {
    governed: {
      feeMintAccess,
      initialPoserInvitation: poserInvitation,
      marshaller,
      storageNode,
    },
  };
  /** @type {GovernorStartedInstallationKit<typeof reserveInstallation>} */
  const g = await E(zoe).startInstance(
    governorInstallation,
    {},
    reserveGovernorTerms,
    privateArgs,
    'reserve.governor',
  );

  const [creatorFacet, publicFacet, adminFacet, instance] = await Promise.all([
    E(g.creatorFacet).getCreatorFacet(),
    E(g.creatorFacet).getPublicFacet(),
    E(g.creatorFacet).getAdminFacet(),
    E(g.publicFacet).getGovernedContract(),
  ]);

  reserveKit.resolve(
    harden({
      label: 'AssetReserve',
      instance,
      publicFacet,
      creatorFacet,
      adminFacet,

      governor: g.instance,
      governorCreatorFacet: g.creatorFacet,
      governorAdminFacet: g.adminFacet,
    }),
  );
  await E(diagnostics).savePrivateArgs(instance, privateArgs.governed);
  await E(diagnostics).savePrivateArgs(g.instance, privateArgs);

  reserveInstanceProducer.resolve(instance);
  reserveGovernor.resolve(g.instance);

  return reserveInstallation;
};

/**
 * @param {EconomyBootstrapPowers['consume']} consume
 * @param {object} config
 * @param {InterestTiming} [config.interestTiming]
 * @param {object} [config.options]
 * @param {string} [config.options.referencedUi]
 * @param {Amount<'nat'>} minInitialDebt
 */
export const setupVaultFactoryArguments = async (
  consume,
  {
    interestTiming = {
      chargingPeriod: SECONDS_PER_HOUR,
      recordingPeriod: SECONDS_PER_DAY,
    },
    options: { referencedUi } = {},
  } = {},
  minInitialDebt,
) => {
  const STORAGE_PATH = 'vaultFactory';
  trace('setupVaultFactory');

  const {
    board,
    chainStorage,
    chainTimerService,
    priceAuthority,
    zoe,
    feeMintAccess: feeMintAccessP,
    economicCommitteeCreatorFacet: electorateCreatorFacet,
    reserveKit,
  } = consume;

  const poserInvitationP = E(electorateCreatorFacet).getPoserInvitation();
  const shortfallInvitationP = E(
    E.get(reserveKit).creatorFacet,
  ).makeShortfallReportingInvitation();

  const [
    initialPoserInvitation,
    poserInvitationAmount,
    initialShortfallInvitation,
    shortfallInvitationAmount,
    feeMintAccess,
  ] = await Promise.all([
    poserInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
    shortfallInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(shortfallInvitationP),
    feeMintAccessP,
  ]);

  const reservePublicFacet = await E.get(reserveKit).publicFacet;
  const storageNode = await makeStorageNodeChild(chainStorage, STORAGE_PATH);
  const marshaller = await E(board).getReadonlyMarshaller();

  const vaultFactoryTerms = makeGovernedVFTerms({
    priceAuthority,
    reservePublicFacet,
    interestTiming,
    timer: chainTimerService,
    electorateInvitationAmount: poserInvitationAmount,
    minInitialDebt,
    bootstrapPaymentValue: 0n,
    shortfallInvitationAmount,
    referencedUi,
  });

  const vaultFactoryPrivateArgs = {
    feeMintAccess,
    initialPoserInvitation,
    initialShortfallInvitation,
    marshaller,
    storageNode,
  };

  return { vaultFactoryTerms, vaultFactoryPrivateArgs };
};

/**
 * @param {EconomyBootstrapPowers} powers
 * @param {object} config
 * @param {InterestTiming} [config.interestTiming]
 * @param {object} [config.options]
 * @param {string} [config.options.referencedUi]
 * @param {bigint} minInitialDebt
 */
export const startVaultFactory = async (
  {
    consume,
    produce: { vaultFactoryKit },
    brand: {
      consume: { [Stable.symbol]: centralBrandP },
    },
    instance: { produce: instanceProduce },
    installation: {
      consume: {
        VaultFactory: vaultFactoryInstallation,
        contractGovernor: contractGovernorInstallation,
      },
    },
  },
  config,
  minInitialDebt = 5_000_000n,
) => {
  trace('startVaultFactory');

  const centralBrand = await centralBrandP;

  const { vaultFactoryTerms, vaultFactoryPrivateArgs } =
    await setupVaultFactoryArguments(
      consume,
      config,
      AmountMath.make(centralBrand, minInitialDebt),
    );

  const governorTerms = await deeplyFulfilledObject(
    harden({
      timer: consume.chainTimerService,
      governedContractInstallation: vaultFactoryInstallation,
      governed: {
        terms: vaultFactoryTerms,
        issuerKeywordRecord: {},
        label: 'vaultFactory',
      },
    }),
  );

  /**
   * @type {GovernorStartedInstallationKit<
   *   typeof vaultFactoryInstallation
   * >}
   */
  const g = await E(consume.zoe).startInstance(
    contractGovernorInstallation,
    undefined,
    governorTerms,
    harden({
      electorateCreatorFacet: consume.economicCommitteeCreatorFacet,
      governed: vaultFactoryPrivateArgs,
    }),
    'vaultFactory.governor',
  );

  const [vaultFactoryInstance, vaultFactoryCreator, publicFacet, adminFacet] =
    await Promise.all([
      E(g.creatorFacet).getInstance(),
      E(g.creatorFacet).getCreatorFacet(),
      E(g.creatorFacet).getPublicFacet(),
      E(g.creatorFacet).getAdminFacet(),
    ]);

  // XXX omitting the governor
  await E(consume.diagnostics).savePrivateArgs(
    vaultFactoryInstance,
    vaultFactoryPrivateArgs,
  );

  vaultFactoryKit.resolve(
    harden({
      label: 'VaultFactory',
      creatorFacet: vaultFactoryCreator,
      adminFacet,
      publicFacet,
      instance: vaultFactoryInstance,

      governor: g.instance,
      governorAdminFacet: g.adminFacet,
      governorCreatorFacet: g.creatorFacet,

      // XXX try refactoring to use savePrivateArgs
      privateArgs: vaultFactoryPrivateArgs,
    }),
  );

  // Advertise the installations, instances in agoricNames.
  instanceProduce.VaultFactory.resolve(vaultFactoryInstance);
  instanceProduce.VaultFactoryGovernor.resolve(g.instance);
};

/**
 * Grant access to the VaultFactory creatorFacet to up to one user based on
 * address.
 *
 * @param {EconomyBootstrapPowers} powers
 * @param {object} [root0]
 * @param {object} [root0.options]
 * @param {string} [root0.options.vaultFactoryControllerAddress]
 */
export const grantVaultFactoryControl = async (
  { consume: { client, priceAuthorityAdmin, vaultFactoryKit } },
  { options: { vaultFactoryControllerAddress } = {} } = {},
) => {
  await E(client).assignBundle([
    addr => ({
      vaultFactoryCreatorFacet:
        typeof vaultFactoryControllerAddress === 'string' &&
        addr === vaultFactoryControllerAddress
          ? E.get(vaultFactoryKit).creatorFacet
          : undefined,
      priceAuthorityAdminFacet:
        typeof vaultFactoryControllerAddress === 'string' &&
        addr === vaultFactoryControllerAddress
          ? priceAuthorityAdmin
          : undefined,
    }),
  ]);
};
harden(grantVaultFactoryControl);

/**
 * Start the reward distributor.
 *
 * @param {EconomyBootstrapPowers} powers
 */
export const startRewardDistributor = async ({
  consume: {
    chainTimerService,
    bankManager,
    vaultFactoryKit,
    periodicFeeCollectors,
    reserveKit,
    zoe,
  },
  produce: { feeDistributorKit, periodicFeeCollectors: periodicFeeCollectorsP },
  instance: {
    produce: { feeDistributor: feeDistributorP },
  },
  installation: {
    consume: { feeDistributor },
  },
  issuer: {
    consume: { [Stable.symbol]: centralIssuerP },
  },
  brand: {
    consume: { [Stable.symbol]: centralBrandP },
  },
}) => {
  trace('startRewardDistributor');
  const timerService = await chainTimerService;
  const feeDistributorTerms = await deeplyFulfilledObject(
    harden({
      timerService,
      collectionInterval: 1n * SECONDS_PER_HOUR,
      keywordShares: {
        RewardDistributor: 0n,
        Reserve: 1n,
      },
    }),
  );

  const [centralIssuer, centralBrand] = await Promise.all([
    centralIssuerP,
    centralBrandP,
  ]);

  const rewardDistributorDepositFacet = await E(bankManager)
    .getRewardDistributorDepositFacet(Stable.denom, {
      issuer: centralIssuer,
      brand: centralBrand,
    })
    .catch(e => {
      console.error('Cannot create fee collector deposit facet', e);
      return undefined;
    });

  /**
   * @type {StartedInstanceKit<
   *   typeof import('@agoric/inter-protocol/src/feeDistributor.js').start
   * >}
   */
  const instanceKit = await E(zoe).startInstance(
    feeDistributor,
    { Fee: centralIssuer },
    feeDistributorTerms,
    undefined,
    'feeDistributor',
  );
  await E(instanceKit.creatorFacet).setDestinations({
    ...(rewardDistributorDepositFacet && {
      RewardDistributor: E(
        instanceKit.creatorFacet,
      ).makeDepositFacetDestination(rewardDistributorDepositFacet),
    }),
    Reserve: E(instanceKit.creatorFacet).makeOfferDestination(
      zoe,
      'Collateral',
      E.get(reserveKit).publicFacet,
      'makeAddCollateralInvitation',
    ),
  });

  feeDistributorKit.resolve(
    harden({ ...instanceKit, label: 'feeDistributor' }),
  );
  feeDistributorP.resolve(instanceKit.instance);

  // Initialize the periodic collectors list if we don't have one.
  periodicFeeCollectorsP.resolve(
    makeScalarBigMapStore('periodicCollectors', { durable: true }),
  );
  const periodicCollectors = await periodicFeeCollectors;

  const collectorKit = {
    vaultFactory: E.get(vaultFactoryKit).creatorFacet,
  };
  await Promise.all(
    Object.entries(collectorKit).map(async ([debugName, collectorFacet]) => {
      const collector = E(instanceKit.creatorFacet).makeContractFeeCollector(
        zoe,
        collectorFacet,
      );
      const periodicCollector = await E(
        instanceKit.creatorFacet,
      ).startPeriodicCollection(debugName, collector);
      periodicCollectors.init(periodicCollectors.getSize(), periodicCollector);
    }),
  );
};
harden(startRewardDistributor);
