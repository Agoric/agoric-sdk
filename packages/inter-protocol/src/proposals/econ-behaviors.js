// @jessie-check

import '../../exported.js';

import { AmountMath } from '@agoric/ertp';
import '@agoric/governance/exported.js';
import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';
import '@agoric/vats/exported.js';
import '@agoric/vats/src/core/types.js';
import { Stable, Stake } from '@agoric/vats/src/tokens.js';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/far';
import { LienBridgeId, makeStakeReporter } from '../my-lien.js';
import { makeReserveTerms } from '../reserve/params.js';
import { makeStakeFactoryTerms } from '../stakeFactory/params.js';
import { makeGovernedTerms as makeGovernedVFTerms } from '../vaultFactory/params.js';
import { makeGovernedTerms as makeGovernedATerms } from '../auction/params.js';

const trace = makeTracer('RunEconBehaviors', false);

const SECONDS_PER_HOUR = 60n * 60n;
const SECONDS_PER_DAY = 24n * SECONDS_PER_HOUR;

const BASIS_POINTS = 10_000n;

/**
 * @typedef {GovernedCreatorFacet<import('../stakeFactory/stakeFactory.js').StakeFactoryCreator>} StakeFactoryCreator
 * @typedef {import('../stakeFactory/stakeFactory.js').StakeFactoryPublic} StakeFactoryPublic
 * @typedef {import('../reserve/assetReserve.js').GovernedAssetReserveFacetAccess} GovernedAssetReserveFacetAccess
 * @typedef {import('../vaultFactory/vaultFactory.js').VaultFactoryContract['publicFacet']} VaultFactoryPublicFacet
 * @typedef {import('../auction/auctioneer.js').AuctioneerPublicFacet} AuctioneerPublicFacet
 * @typedef {import('../auction/auctioneer.js').AuctioneerCreatorFacet} AuctioneerCreatorFacet
 */

/**
 * @typedef {object} PSMKit
 * @property {Instance} psm
 * @property {Instance} psmGovernor
 * @property {Awaited<ReturnType<Awaited<ReturnType<import('../psm/psm.js')['prepare']>>['creatorFacet']['getLimitedCreatorFacet']>>} psmCreatorFacet
 * @property {GovernorCreatorFacet<import('../../src/psm/psm.js')['prepare']>} psmGovernorCreatorFacet
 * @property {AdminFacet} psmAdminFacet
 */

/**
 * @typedef {GovernanceFacetKit<import('../auction/auctioneer.js').start>} AuctioneerKit
 */

/**
 * @typedef { WellKnownSpaces & ChainBootstrapSpace & EconomyBootstrapSpace
 * } EconomyBootstrapPowers
 * @typedef {PromiseSpaceOf<{
 *   economicCommitteeKit: CommitteeStartResult,
 *   economicCommitteeCreatorFacet: import('@agoric/governance/src/committee.js').CommitteeElectorateCreatorFacet,
 *   feeDistributorKit: {
 *     creatorFacet: import('../feeDistributor.js').FeeDistributorCreatorFacet,
 *     publicFacet: import('../feeDistributor.js').FeeDistributorPublicFacet,
 *     adminFacet: AdminFacet,
 *   },
 *   periodicFeeCollectors: import('../feeDistributor.js').PeriodicFeeCollector[],
 *   bankMints: Mint[],
 *   psmKit: MapStore<Brand, PSMKit>,
 *   anchorBalancePayments: MapStore<Brand, Payment<'nat'>>,
 *   econCharterKit: EconCharterStartResult,
 *   reserveKit: GovernanceFacetKit<import('../reserve/assetReserve.js')['start']>,
 *   stakeFactoryKit: GovernanceFacetKit<import('../stakeFactory/stakeFactory.js')['start']>,
 *   vaultFactoryKit: GovernanceFacetKit<import('../vaultFactory/vaultFactory.js')['prepare']>,
 *   auctioneerKit: AuctioneerKit,
 *   minInitialDebt: NatValue,
 * }>} EconomyBootstrapSpace
 */

/** @typedef {import('@agoric/zoe/src/zoeService/utils.js').StartedInstanceKit<import('../econCommitteeCharter')['prepare']>} EconCharterStartResult */
/** @typedef {import('@agoric/zoe/src/zoeService/utils.js').StartedInstanceKit<import('@agoric/governance/src/committee.js')['prepare']>} CommitteeStartResult */

/**
 * @file A collection of productions, each of which declares inputs and outputs.
 * Each function is passed a set of powers for reading from and writing to the vat config.
 *
 * Each of the things they produce they're responsible for resolving or setting.
 *
 * In production called by @agoric/vats to bootstrap.
 */

/** @param {EconomyBootstrapPowers} powers */
export const setupReserve = async ({
  consume: {
    board,
    feeMintAccess: feeMintAccessP,
    chainStorage,
    chainTimerService,
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
  /** @type {GovernorStartedInstallationKit<typeof reserveInstallation>} */
  const g = await E(zoe).startInstance(
    governorInstallation,
    {},
    reserveGovernorTerms,
    {
      governed: {
        feeMintAccess,
        initialPoserInvitation: poserInvitation,
        marshaller,
        storageNode,
      },
    },
    'reserve.governor',
  );

  const [creatorFacet, publicFacet, instance] = await Promise.all([
    E(g.creatorFacet).getCreatorFacet(),
    E(g.creatorFacet).getPublicFacet(),
    E(g.publicFacet).getGovernedContract(),
  ]);

  reserveKit.resolve(
    harden({
      publicFacet,
      creatorFacet,
      governorCreatorFacet: g.creatorFacet,
      adminFacet: g.adminFacet,
    }),
  );

  reserveInstanceProducer.resolve(instance);
  reserveGovernor.resolve(g.instance);

  return reserveInstallation;
};

/**
 * @param {EconomyBootstrapPowers['consume']} consume
 * @param {object} config
 * @param {InterestTiming} [config.interestTiming]
 * @param {object} [config.options]
 * @param {string} [config.options.endorsedUi]
 * @param {Amount<'nat'>} minInitialDebt
 */
export const setupVaultFactoryArguments = async (
  consume,
  {
    interestTiming = {
      chargingPeriod: SECONDS_PER_HOUR,
      recordingPeriod: SECONDS_PER_DAY,
    },
    options: { endorsedUi } = {},
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
    auctioneerKit,
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
    auctioneerPublicFacet,
  ] = await Promise.all([
    poserInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
    shortfallInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(shortfallInvitationP),
    feeMintAccessP,
    E.get(auctioneerKit).publicFacet,
  ]);

  const reservePublicFacet = await E.get(reserveKit).publicFacet;
  const storageNode = await makeStorageNodeChild(chainStorage, STORAGE_PATH);
  const marshaller = await E(board).getReadonlyMarshaller();

  const vaultFactoryTerms = makeGovernedVFTerms({
    priceAuthority,
    auctioneerPublicFacet,
    reservePublicFacet,
    interestTiming,
    timer: chainTimerService,
    electorateInvitationAmount: poserInvitationAmount,
    minInitialDebt,
    bootstrapPaymentValue: 0n,
    shortfallInvitationAmount,
    endorsedUi,
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
 * @param {string} [config.options.endorsedUi]
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

  /** @type {GovernorStartedInstallationKit<typeof vaultFactoryInstallation>} */
  const {
    creatorFacet: governorCreatorFacet,
    instance: governorInstance,
    adminFacet,
  } = await E(consume.zoe).startInstance(
    contractGovernorInstallation,
    undefined,
    governorTerms,
    harden({
      electorateCreatorFacet: consume.economicCommitteeCreatorFacet,
      governed: vaultFactoryPrivateArgs,
    }),
    'vaultFactory.governor',
  );

  const [vaultFactoryInstance, vaultFactoryCreator, publicFacet] =
    await Promise.all([
      E(governorCreatorFacet).getInstance(),
      E(governorCreatorFacet).getCreatorFacet(),
      E(governorCreatorFacet).getPublicFacet(),
    ]);

  vaultFactoryKit.resolve(
    harden({
      creatorFacet: vaultFactoryCreator,
      governorCreatorFacet,
      adminFacet,
      publicFacet,
      // XXX safe? if this sticks add it to the type
      privateArgs: vaultFactoryPrivateArgs,
    }),
  );

  // Advertise the installations, instances in agoricNames.
  instanceProduce.VaultFactory.resolve(vaultFactoryInstance);
  instanceProduce.Treasury.resolve(vaultFactoryInstance);
  instanceProduce.VaultFactoryGovernor.resolve(governorInstance);
};

/**
 * Grant access to the VaultFactory creatorFacet
 * to up to one user based on address.
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
    stakeFactoryKit,
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
      collectionInterval: 60n * 60n, // 1 hour
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
   * @type {Awaited<
   *   ReturnType<typeof import('../feeDistributor.js').makeFeeDistributor>>
   *   & { adminFacet: AdminFacet, instance: Instance }
   * }
   */
  const instanceKit = await E(zoe).startInstance(
    feeDistributor,
    { Fee: centralIssuer },
    feeDistributorTerms,
    undefined,
    'feeDistributor',
  );
  /** @type {ERef<import('../feeDistributor.js').FeeDestination>} */
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
    harden({
      creatorFacet: instanceKit.creatorFacet,
      publicFacet: instanceKit.publicFacet,
      adminFacet: instanceKit.adminFacet,
    }),
  );
  feeDistributorP.resolve(instanceKit.instance);

  // Initialize the periodic collectors list if we don't have one.
  periodicFeeCollectorsP.resolve([]);
  const periodicCollectors = await periodicFeeCollectors;

  const collectorKit = {
    vaultFactory: E.get(vaultFactoryKit).creatorFacet,
    runStake: E.get(stakeFactoryKit).creatorFacet,
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
      periodicCollectors.push(periodicCollector);
    }),
  );
};
harden(startRewardDistributor);

/**
 * @param {BootstrapPowers & PromiseSpaceOf<{
 *   lienBridge: StakingAuthority,
 * }>} powers
 */
export const startLienBridge = async ({
  consume: { bridgeManager: bridgeOptP },
  produce: { lienBridge },
  brand: {
    consume: { [Stake.symbol]: bldP },
  },
}) => {
  trace('lienBridge');

  const bridgeManager = await bridgeOptP;
  if (!bridgeManager) {
    return;
  }
  const lienBridgeManager = E(bridgeManager).register(LienBridgeId);
  const bldBrand = await bldP;
  const reporter = makeStakeReporter(lienBridgeManager, bldBrand);
  lienBridge.resolve(reporter);
};

/**
 * @param {EconomyBootstrapPowers} powers
 * @param {object} config
 * @param {any} [config.auctionParams]
 */
export const startAuctioneer = async (
  {
    consume: {
      zoe,
      board,
      chainTimerService,
      priceAuthority,
      chainStorage,
      economicCommitteeCreatorFacet: electorateCreatorFacet,
    },
    produce: { auctioneerKit },
    instance: {
      produce: { auctioneer: auctionInstance },
      consume: { reserve: reserveInstance },
    },
    installation: {
      consume: {
        auctioneer: auctionInstallation,
        contractGovernor: contractGovernorInstallation,
      },
    },
    issuer: {
      consume: { [Stable.symbol]: runIssuerP },
    },
  },
  {
    auctionParams = {
      StartFreq: 3600n,
      ClockStep: 3n * 60n,
      StartingRate: 10500n,
      LowestRate: 4500n,
      DiscountStep: 500n,
      AuctionStartDelay: 2n,
      PriceLockPeriod: 300n,
    },
  } = {},
) => {
  trace('startAuctioneer');
  const STORAGE_PATH = 'auction';

  const poserInvitationP = E(electorateCreatorFacet).getPoserInvitation();

  const [initialPoserInvitation, electorateInvitationAmount, runIssuer] =
    await Promise.all([
      poserInvitationP,
      E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
      runIssuerP,
    ]);

  const timerBrand = await E(chainTimerService).getTimerBrand();

  const storageNode = await makeStorageNodeChild(chainStorage, STORAGE_PATH);
  const marshaller = await E(board).getReadonlyMarshaller();

  const reservePublicFacet = await E(zoe).getPublicFacet(reserveInstance);

  const auctionTerms = makeGovernedATerms(
    { storageNode, marshaller },
    chainTimerService,
    priceAuthority,
    reservePublicFacet,
    {
      ...auctionParams,
      ElectorateInvitationAmount: electorateInvitationAmount,
      TimerBrand: timerBrand,
    },
  );

  const governorTerms = await deeplyFulfilledObject(
    harden({
      timer: chainTimerService,
      governedContractInstallation: auctionInstallation,
      governed: {
        terms: auctionTerms,
        issuerKeywordRecord: { Bid: runIssuer },
        storageNode,
        marshaller,
        label: 'auctioneer',
      },
    }),
  );

  /** @type {GovernorStartedInstallationKit<typeof auctionInstallation>} */
  const governorStartResult = await E(zoe).startInstance(
    contractGovernorInstallation,
    undefined,
    governorTerms,
    harden({
      electorateCreatorFacet,
      governed: {
        initialPoserInvitation,
        storageNode,
        marshaller,
      },
    }),
    'auctioneer.governor',
  );

  const [governedInstance, governedCreatorFacet, governedPublicFacet] =
    await Promise.all([
      E(governorStartResult.creatorFacet).getInstance(),
      E(governorStartResult.creatorFacet).getCreatorFacet(),
      E(governorStartResult.creatorFacet).getPublicFacet(),
    ]);

  auctioneerKit.resolve(
    harden({
      creatorFacet: governedCreatorFacet,
      governorCreatorFacet: governorStartResult.creatorFacet,
      adminFacet: governorStartResult.adminFacet,
      publicFacet: governedPublicFacet,
    }),
  );

  auctionInstance.resolve(governedInstance);
};

/**
 * @typedef {EconomyBootstrapPowers & PromiseSpaceOf<{
 *   client: ClientManager,
 *   lienBridge: StakingAuthority,
 * }>} StakeFactoryBootstrapPowers
 */

/**
 * @param {StakeFactoryBootstrapPowers } powers
 * @param {object} config
 * @param {bigint} [config.debtLimit] count of Minted
 * @param {Rational} [config.mintingRatio] ratio of Minted to BLD
 * @param {bigint} [config.interestRateBP]
 * @param {bigint} [config.mintFeeBP]
 * @param {bigint} [config.chargingPeriod]
 * @param {bigint} [config.recordingPeriod]
 * @typedef {[bigint, bigint]} Rational
 * @typedef {Awaited<ReturnType<typeof import('../stakeFactory/stakeFactory.js').start>>} StartStakeFactory
 */
export const startStakeFactory = async (
  {
    consume: {
      board,
      zoe,
      feeMintAccess: feeMintAccessP,
      lienBridge,
      client,
      chainTimerService,
      chainStorage,
      economicCommitteeCreatorFacet,
    },
    produce: { stakeFactoryKit },
    installation: {
      consume: {
        contractGovernor: contractGovernorInstallation,
        stakeFactory: stakeFactoryInstallation,
      },
    },
    instance: {
      produce: { stakeFactory: stakeFactoryInstanceR },
    },
    brand: {
      consume: { [Stake.symbol]: bldBrandP, [Stable.symbol]: runBrandP },
      produce: { Attestation: attestationBrandR },
    },
    issuer: {
      consume: { [Stake.symbol]: bldIssuer },
      produce: { Attestation: attestationIssuerR },
    },
  },
  {
    debtLimit = 1_000_000_000_000n,
    mintingRatio = [1n, 4n],
    interestRateBP = 250n,
    mintFeeBP = 200n,
    chargingPeriod = SECONDS_PER_HOUR,
    recordingPeriod = SECONDS_PER_DAY,
  } = {},
) => {
  const STORAGE_PATH = 'stakeFactory';

  const [bldBrand, runBrand] = await Promise.all([bldBrandP, runBrandP]);

  const poserInvitationP = E(
    economicCommitteeCreatorFacet,
  ).getPoserInvitation();
  const [initialPoserInvitation, electorateInvitationAmount, feeMintAccess] =
    await Promise.all([
      poserInvitationP,
      E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
      feeMintAccessP,
    ]);

  const stakeFactoryTerms = makeStakeFactoryTerms(
    {
      timerService: chainTimerService,
      chargingPeriod,
      recordingPeriod,
    },
    {
      debtLimit: AmountMath.make(runBrand, debtLimit),
      mintingRatio: makeRatio(
        mintingRatio[0],
        runBrand,
        mintingRatio[1],
        bldBrand,
      ),
      interestRate: makeRatio(interestRateBP, runBrand, BASIS_POINTS),
      mintFee: makeRatio(mintFeeBP, runBrand, BASIS_POINTS),
      electorateInvitationAmount,
    },
  );

  const storageNode = await makeStorageNodeChild(chainStorage, STORAGE_PATH);
  const marshaller = await E(board).getReadonlyMarshaller();

  const stakeTerms = await deeplyFulfilledObject(
    harden({
      timer: chainTimerService,
      governedContractInstallation: stakeFactoryInstallation,
      governed: {
        terms: stakeFactoryTerms,
        issuerKeywordRecord: { Stake: bldIssuer },
        label: 'stakeFactory',
      },
    }),
  );

  /** @type {GovernorStartedInstallationKit<typeof stakeFactoryInstallation>} */
  const governorStartResult = await E(zoe).startInstance(
    contractGovernorInstallation,
    {},
    stakeTerms,
    {
      governed: {
        feeMintAccess,
        initialPoserInvitation,
        lienBridge,
        storageNode,
        marshaller,
      },
    },
    'stakeFactory.governor',
  );

  const [governedInstance, governedCreatorFacet, governedPublicFacet] =
    await Promise.all([
      E(governorStartResult.creatorFacet).getInstance(),
      E(governorStartResult.creatorFacet).getCreatorFacet(),
      E(governorStartResult.creatorFacet).getPublicFacet(),
    ]);

  const {
    issuers: { Attestation: attIssuer },
    brands: { Attestation: attBrand },
  } = await E(zoe).getTerms(governedInstance);

  stakeFactoryKit.resolve(
    harden({
      creatorFacet: governedCreatorFacet,
      governorCreatorFacet: governorStartResult.creatorFacet,
      adminFacet: governorStartResult.adminFacet,
      publicFacet: governedPublicFacet,
    }),
  );

  stakeFactoryInstanceR.resolve(governedInstance);
  attestationBrandR.resolve(attBrand);
  attestationIssuerR.resolve(attIssuer);
  return Promise.all([
    E(client).assignBundle([
      address => ({
        attMaker: E(governedCreatorFacet).provideAttestationMaker(address),
      }),
    ]),
  ]);
};
harden(startStakeFactory);
