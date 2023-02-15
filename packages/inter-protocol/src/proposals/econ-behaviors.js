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
import { liquidationDetailTerms } from '../vaultFactory/liquidation.js';
import { makeGovernedTerms } from '../vaultFactory/params.js';
import { makeAmmTerms } from '../vpool-xyk-amm/params.js';

const trace = makeTracer('RunEconBehaviors', false);

const { Fail } = assert;

const SECONDS_PER_HOUR = 60n * 60n;
const SECONDS_PER_DAY = 24n * SECONDS_PER_HOUR;

const BASIS_POINTS = 10_000n;
const MILLI = 1_000_000n;

/**
 * @typedef {GovernedCreatorFacet<import('../stakeFactory/stakeFactory.js').StakeFactoryCreator>} StakeFactoryCreator
 * @typedef {import('../stakeFactory/stakeFactory.js').StakeFactoryPublic} StakeFactoryPublic
 * @typedef {import('../reserve/assetReserve.js').GovernedAssetReserveFacetAccess} GovernedAssetReserveFacetAccess
 * @typedef {import('../vaultFactory/vaultFactory.js').VaultFactoryContract['publicFacet']} VaultFactoryPublicFacet
 */

/**
 * @typedef {object} PSMKit
 * @property {Instance} psm
 * @property {Instance} psmGovernor
 * @property {Awaited<ReturnType<import('../psm/psm.js').start>>['creatorFacet']} psmCreatorFacet
 * @property {GovernedContractFacetAccess<{},{}>} psmGovernorCreatorFacet
 * @property {AdminFacet} psmAdminFacet
 */

/**
 * @typedef { WellKnownSpaces & ChainBootstrapSpace & EconomyBootstrapSpace
 * } EconomyBootstrapPowers
 * @typedef {PromiseSpaceOf<{
 *   ammKit: {
 *     instanceWithoutReserve: Instance,
 *     creatorFacet: XYKAMMCreatorFacet,
 *     governorCreatorFacet: GovernedContractFacetAccess<XYKAMMPublicFacet,XYKAMMCreatorFacet>,
 *     adminFacet: AdminFacet,
 *     publicFacet: XYKAMMPublicFacet,
 *   },
 *   economicCommitteeCreatorFacet: import('@agoric/governance/src/committee.js').CommitteeElectorateCreatorFacet,
 *   feeDistributorKit: {
 *     creatorFacet: import('../feeDistributor.js').FeeDistributorCreatorFacet,
 *     publicFacet: import('../feeDistributor.js').FeeDistributorPublicFacet,
 *     adminFacet: AdminFacet,
 *   },
 *   periodicFeeCollectors: import('../feeDistributor.js').PeriodicFeeCollector[],
 *   bankMints: Mint[],
 *   psmKit: MapStore<Brand, PSMKit>,
 *   econCharterKit: EconCharterStartResult,
 *   reserveKit: {
 *     publicFacet: import('../reserve/assetReserve.js').AssetReservePublicFacet,
 *     creatorFacet: import('../reserve/assetReserve.js').AssetReserveLimitedCreatorFacet,
 *     governorCreatorFacet: GovernedAssetReserveFacetAccess,
 *     adminFacet: AdminFacet,
 *   },
 *   stakeFactoryKit: {
 *     creatorFacet: StakeFactoryCreator,
 *     governorCreatorFacet: GovernedContractFacetAccess<{}, {}>,
 *     adminFacet: AdminFacet,
 *     publicFacet: StakeFactoryPublic,
 *   },
 *   vaultFactoryKit: {
 *     publicFacet: VaultFactoryPublicFacet,
 *     creatorFacet: VaultFactoryCreatorFacet,
 *     governorCreatorFacet: GovernedContractFacetAccess<VaultFactoryPublicFacet, VaultFactoryCreatorFacet>,
 *     adminFacet: AdminFacet,
 *   },
 *   minInitialDebt: NatValue,
 * }>} EconomyBootstrapSpace
 */

/** @typedef {import('@agoric/zoe/src/zoeService/utils.js').StartedInstanceKit<import('../econCommitteeCharter').start>} EconCharterStartResult */

/**
 * @file A collection of productions, each of which declares inputs and outputs.
 * Each function is passed a set of powers for reading from and writing to the vat config.
 *
 * Each of the things they produce they're responsible for resolving or setting.
 *
 * In production called by @agoric/vats to bootstrap.
 */

/**
 * @param {EconomyBootstrapPowers} powers
 * @param {{
 *   interchainPoolOptions?: { minimumCentral?: bigint }
 * }} [options]
 */
export const startInterchainPool = async (
  {
    consume: { bankManager: mgrP, zoe, agoricNamesAdmin },
    installation: {
      consume: { interchainPool: installation },
    },
    instance: {
      consume: { amm },
      produce: { interchainPool: _viaAgoricNamesAdmin },
    },
    brand: {
      consume: { [Stable.symbol]: centralBrandP },
    },
    issuer: {
      consume: { [Stable.symbol]: centralIssuerP },
    },
  },
  { interchainPoolOptions = {} } = {},
) => {
  trace('startInterchainPool');
  // TODO: get minimumCentral dynamically from the AMM
  const { minimumCentral = 100n * MILLI } = interchainPoolOptions;
  const [centralIssuer, centralBrand, bankManager] = await Promise.all([
    centralIssuerP,
    centralBrandP,
    mgrP,
  ]);

  const terms = await deeplyFulfilledObject(
    harden({
      minimumCentral: AmountMath.make(centralBrand, minimumCentral),
      amm,
    }),
  );
  const { instance } = await E(zoe).startInstance(
    installation,
    { Central: centralIssuer },
    terms,
    {
      bankManager,
    },
  );

  const instanceAdmin = E(agoricNamesAdmin).lookupAdmin('instance');
  await E(instanceAdmin).update('interchainPool', instance);
};
harden(startInterchainPool);

const AMM_STORAGE_PATH = 'amm'; // TODO: share with agoricNames?

/**
 * @param {EconomyBootstrapPowers} powers
 * @param {{ options?: { minInitialPoolLiquidity?: bigint }}} opts
 */
export const setupAmm = async (
  {
    consume: {
      board,
      chainTimerService,
      zoe,
      economicCommitteeCreatorFacet: committeeCreator,
      chainStorage,
    },
    produce: { ammKit },
    brand: {
      consume: { [Stable.symbol]: runBrandP },
    },
    issuer: {
      consume: { [Stable.symbol]: centralIssuer },
    },
    instance: {
      produce: { ammGovernor },
    },
    installation: {
      consume: { contractGovernor: governorInstallation, amm: ammInstallation },
    },
  },
  { options = {} } = {},
) => {
  trace('setupAmm');

  const poserInvitationP = E(committeeCreator).getPoserInvitation();
  const [poserInvitation, runBrand] = await Promise.all([
    poserInvitationP,
    runBrandP,
  ]);
  const { minInitialPoolLiquidity = 1_000_000_000n } = options;

  const ammTerms = makeAmmTerms(
    chainTimerService,
    E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitation),
    AmountMath.make(runBrand, minInitialPoolLiquidity),
  );

  const storageNode = await makeStorageNodeChild(
    chainStorage,
    AMM_STORAGE_PATH,
  );
  const marshaller = await E(board).getPublishingMarshaller();

  const ammGovernorTerms = await deeplyFulfilledObject(
    harden({
      timer: chainTimerService,
      governedContractInstallation: ammInstallation,
      governed: {
        terms: ammTerms,
        issuerKeywordRecord: { Central: centralIssuer },
      },
    }),
  );

  /** @type {{ creatorFacet: GovernedContractFacetAccess<XYKAMMPublicFacet,XYKAMMCreatorFacet>, publicFacet: GovernorPublic, instance: Instance, adminFacet: AdminFacet }} */
  const g = await E(zoe).startInstance(
    governorInstallation,
    {},
    ammGovernorTerms,
    {
      electorateCreatorFacet: committeeCreator,
      governed: {
        initialPoserInvitation: poserInvitation,
        storageNode,
        marshaller,
      },
    },
  );

  const [creatorFacet, ammPublicFacet, instance] = await Promise.all([
    E(g.creatorFacet).getCreatorFacet(),
    E(g.creatorFacet).getPublicFacet(),
    E(g.publicFacet).getGovernedContract(),
  ]);
  ammKit.resolve(
    harden({
      creatorFacet,
      instanceWithoutReserve: instance,
      governorCreatorFacet: g.creatorFacet,
      adminFacet: g.adminFacet,
      publicFacet: ammPublicFacet,
    }),
  );

  // Confirm that the amm was indeed setup
  ammPublicFacet || Fail`ammPublicFacet broken  ${ammPublicFacet}`;

  ammGovernor.resolve(g.instance);
  return ammInstallation;
};

/** @param {EconomyBootstrapPowers} powers */
export const setupReserve = async ({
  consume: {
    ammKit: ammKitP,
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
    produce: {
      amm: ammInstanceProducer,
      reserve: reserveInstanceProducer,
      reserveGovernor,
    },
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
  const [poserInvitation, poserInvitationAmount, feeMintAccess, ammKit] =
    await Promise.all([
      poserInvitationP,
      E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
      feeMintAccessP,
      ammKitP,
    ]);

  const reserveTerms = makeReserveTerms(
    poserInvitationAmount,
    ammKit.instanceWithoutReserve,
  );

  const storageNode = await makeStorageNodeChild(chainStorage, STORAGE_PATH);
  const marshaller = await E(board).getReadonlyMarshaller();

  const reserveGovernorTerms = await deeplyFulfilledObject(
    harden({
      timer: chainTimerService,
      governedContractInstallation: reserveInstallation,
      governed: {
        terms: reserveTerms,
        issuerKeywordRecord: { Central: centralIssuer },
      },
    }),
  );
  /** @type {{ creatorFacet: GovernedAssetReserveFacetAccess, publicFacet: GovernorPublic, instance: Instance, adminFacet: AdminFacet }} */
  const g = await E(zoe).startInstance(
    governorInstallation,
    {},
    reserveGovernorTerms,
    {
      electorateCreatorFacet: committeeCreator,
      governed: {
        feeMintAccess,
        initialPoserInvitation: poserInvitation,
        marshaller,
        storageNode,
      },
    },
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

  // AMM requires Reserve in order to add pools, but we can't provide it at startInstance
  // time because Reserve requires AMM itself in order to be started.
  // Now that we have the reserve, provide it to the AMM.
  trace('Resolving the reserve public facet on the AMM');
  await E(ammKit.creatorFacet).resolveReserveFacet(publicFacet);
  // it now has the reserve
  ammInstanceProducer.resolve(ammKit.instanceWithoutReserve);

  return reserveInstallation;
};

/**
 * @param {EconomyBootstrapPowers} powers
 * @param {object} config
 * @param {LoanTiming} [config.loanParams]
 * @param {object} [config.options]
 * @param {string} [config.options.endorsedUi]
 * @param {bigint} minInitialDebt
 */
export const startVaultFactory = async (
  {
    consume: {
      board,
      chainStorage,
      chainTimerService,
      priceAuthority,
      zoe,
      feeMintAccess: feeMintAccessP,
      economicCommitteeCreatorFacet: electorateCreatorFacet,
      reserveKit,
    },
    produce: { vaultFactoryKit },
    brand: {
      consume: { [Stable.symbol]: centralBrandP },
    },
    instance: {
      produce: instanceProduce,
      consume: { amm: ammInstance, reserve: reserveInstance },
    },
    installation: {
      consume: {
        VaultFactory: vaultFactoryInstallation,
        liquidate: liquidateInstallationP,
        contractGovernor: contractGovernorInstallation,
      },
    },
  },
  {
    loanParams = {
      chargingPeriod: SECONDS_PER_HOUR,
      recordingPeriod: SECONDS_PER_DAY,
    },
    options: { endorsedUi } = {},
  } = {},
  minInitialDebt = 5_000_000n,
) => {
  const STORAGE_PATH = 'vaultFactory';
  trace('startVaultFactory');

  const poserInvitationP = E(electorateCreatorFacet).getPoserInvitation();
  const shortfallInvitationP = E(
    E.get(reserveKit).creatorFacet,
  ).makeShortfallReportingInvitation();
  const [
    initialPoserInvitation,
    poserInvitationAmount,
    initialShortfallInvitation,
    shortfallInvitationAmount,
    liquidateInstallation,
    feeMintAccess,
  ] = await Promise.all([
    poserInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
    shortfallInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(shortfallInvitationP),
    liquidateInstallationP,
    feeMintAccessP,
  ]);

  const centralBrand = await centralBrandP;

  const ammPublicFacet = await E(zoe).getPublicFacet(ammInstance);
  const reservePublicFacet = await E(zoe).getPublicFacet(reserveInstance);
  const storageNode = await makeStorageNodeChild(chainStorage, STORAGE_PATH);
  const marshaller = await E(board).getReadonlyMarshaller();

  const vaultFactoryTerms = makeGovernedTerms(
    { storageNode, marshaller },
    {
      priceAuthority,
      reservePublicFacet,
      loanTiming: loanParams,
      liquidationInstall: liquidateInstallation,
      timer: chainTimerService,
      electorateInvitationAmount: poserInvitationAmount,
      ammPublicFacet,
      liquidationTerms: liquidationDetailTerms(centralBrand),
      minInitialDebt: AmountMath.make(centralBrand, minInitialDebt),
      bootstrapPaymentValue: 0n,
      shortfallInvitationAmount,
      endorsedUi,
    },
  );

  const governorTerms = await deeplyFulfilledObject(
    harden({
      timer: chainTimerService,
      governedContractInstallation: vaultFactoryInstallation,
      governed: {
        terms: vaultFactoryTerms,
        issuerKeywordRecord: {},
      },
    }),
  );

  const {
    creatorFacet: governorCreatorFacet,
    instance: governorInstance,
    adminFacet,
  } = await E(zoe).startInstance(
    contractGovernorInstallation,
    undefined,
    governorTerms,
    harden({
      electorateCreatorFacet,
      governed: {
        feeMintAccess,
        initialPoserInvitation,
        initialShortfallInvitation,
        marshaller,
        storageNode,
      },
    }),
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
    ammKit,
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
        RewardDistributor: 1n,
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

  const instanceKit = await E(zoe).startInstance(
    feeDistributor,
    { Fee: centralIssuer },
    feeDistributorTerms,
  );
  await E(instanceKit.creatorFacet).setDestinations({
    RewardDistributor:
      rewardDistributorDepositFacet &&
      E(instanceKit.creatorFacet).makeDepositFacetDestination(
        rewardDistributorDepositFacet,
      ),
    Reserve: E(instanceKit.creatorFacet).makeOfferDestination(
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
    amm: E.get(ammKit).creatorFacet,
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
 * @param {bigint} [config.loanFeeBP]
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
      produce: { stakeFactory: stakeFactoryinstanceR },
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
    loanFeeBP = 200n,
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
      loanFee: makeRatio(loanFeeBP, runBrand, BASIS_POINTS),
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
      },
    }),
  );

  /** @type {{ publicFacet: GovernorPublic, creatorFacet: GovernedContractFacetAccess<StakeFactoryPublic,StakeFactoryCreator>, adminFacet: AdminFacet}} */
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

  stakeFactoryinstanceR.resolve(governedInstance);
  attestationBrandR.resolve(attBrand);
  attestationIssuerR.resolve(attIssuer);
  return Promise.all([
    E(client).assignBundle([
      address => ({
        // @ts-expect-error ??? creatorFacet is a StakeFactoryCreator; it has the method
        attMaker: E(governedCreatorFacet).provideAttestationMaker(address),
      }),
    ]),
  ]);
};
harden(startStakeFactory);
