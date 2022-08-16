// @ts-check

import '../../exported.js';

import { AmountMath } from '@agoric/ertp';
import '@agoric/governance/exported.js';
import '@agoric/vats/exported.js';
import '@agoric/vats/src/core/types.js';
import { makeStorageNode } from '@agoric/vats/src/lib-chainStorage.js';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { E, Far } from '@endo/far';
import { Stable, Stake } from '@agoric/vats/src/tokens.js';
import { deeplyFulfilled } from '@endo/marshal';
import * as Collect from '../collect.js';
import { makeTracer } from '../makeTracer.js';
import { makeStakeReporter } from '../my-lien.js';
import { makeReserveTerms } from '../reserve/params.js';
import { makeStakeFactoryTerms } from '../stakeFactory/params.js';
import { liquidationDetailTerms } from '../vaultFactory/liquidation.js';
import { makeGovernedTerms } from '../vaultFactory/params.js';
import { makeAmmTerms } from '../vpool-xyk-amm/params.js';

const trace = makeTracer('RunEconBehaviors', false);

const { details: X } = assert;

const SECONDS_PER_HOUR = 60n * 60n;
const SECONDS_PER_DAY = 24n * SECONDS_PER_HOUR;

const BASIS_POINTS = 10_000n;
const MILLI = 1_000_000n;

/**
 * @typedef {GovernedCreatorFacet<import('../stakeFactory/stakeFactory.js').StakeFactoryCreator>} StakeFactoryCreator
 * @typedef {import('../stakeFactory/stakeFactory.js').StakeFactoryPublic} StakeFactoryPublic
 * @typedef {import('../reserve/assetReserve.js').GovernedAssetReserveFacetAccess} GovernedAssetReserveFacetAccess
 */

/**
 * @typedef { WellKnownSpaces & ChainBootstrapSpace & EconomyBootstrapSpace
 * } EconomyBootstrapPowers
 * @typedef {PromiseSpaceOf<{
 *   ammInstanceWithoutReserve: Instance,
 *   ammCreatorFacet: XYKAMMCreatorFacet,
 *   ammGovernorCreatorFacet: GovernedContractFacetAccess<XYKAMMPublicFacet,XYKAMMCreatorFacet>,
 *   economicCommitteeCreatorFacet: CommitteeElectorateCreatorFacet,
 *   feeDistributorCreatorFacet: import('../feeDistributor.js').FeeDistributorCreatorFacet,
 *   feeDistributorPublicFacet: import('../feeDistributor.js').FeeDistributorPublicFacet,
 *   periodicFeeCollectors: import('../feeDistributor.js').PeriodicFeeCollector[],
 *   bankMints: Mint[],
 *   psmCreatorFacet: unknown,
 *   psmGovernorCreatorFacet: GovernedContractFacetAccess<{},{}>,
 *   reservePublicFacet: import('../reserve/assetReserve.js').AssetReservePublicFacet,
 *   reserveCreatorFacet: import('../reserve/assetReserve.js').AssetReserveLimitedCreatorFacet,
 *   reserveGovernorCreatorFacet: GovernedAssetReserveFacetAccess,
 *   stakeFactoryCreatorFacet: StakeFactoryCreator,
 *   vaultFactoryCreator: VaultFactoryCreatorFacet,
 *   vaultFactoryGovernorCreator: GovernedContractFacetAccess<{},{}>,
 *   vaultFactoryVoteCreator: unknown,
 *   minInitialDebt: NatValue,
 * }>} EconomyBootstrapSpace
 */

/**
 * @file A collection of productions, each of which declares inputs and outputs.
 * Each function is passed a set of powers for reading from and writing to the vat config.
 *
 * Each of the things they produce they're responsible for resolving or setting.
 *
 * In production called by @agoric/vats to bootstrap.
 */

/**
 * @typedef {object} EconCommitteeOptions
 * @property {string} [committeeName]
 * @property {number} [committeeSize]
 */

/**
 * @param {EconomyBootstrapPowers} powers
 * @param {object} [config]
 * @param {object} [config.options]
 * @param {EconCommitteeOptions} [config.options.econCommitteeOptions]
 */
export const startEconomicCommittee = async (
  {
    consume: { zoe },
    produce: { economicCommitteeCreatorFacet },
    installation: {
      consume: { committee },
    },
    instance: {
      produce: { economicCommittee },
    },
  },
  { options: { econCommitteeOptions = {} } = {} },
) => {
  trace('startEconomicCommittee');
  const {
    committeeName = 'Initial Economic Committee',
    committeeSize = 3,
    ...rest
  } = econCommitteeOptions;
  const { creatorFacet, instance } = await E(zoe).startInstance(
    committee,
    {},
    { committeeName, committeeSize, ...rest },
  );

  economicCommitteeCreatorFacet.resolve(creatorFacet);
  economicCommittee.resolve(instance);
};
harden(startEconomicCommittee);

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

  const terms = await deeplyFulfilled(
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
    produce: {
      ammCreatorFacet,
      ammInstanceWithoutReserve,
      ammGovernorCreatorFacet,
    },
    brand: {
      consume: { [Stable.symbol]: runBrandP },
    },
    issuer: {
      consume: { [Stable.symbol]: centralIssuer },
    },
    instance: {
      consume: { economicCommittee: electorateInstance },
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
    E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
    AmountMath.make(runBrand, minInitialPoolLiquidity),
  );

  const storageNode = await makeStorageNode(chainStorage, AMM_STORAGE_PATH);
  const marshaller = await E(board).getPublishingMarshaller();

  const ammGovernorTerms = await deeplyFulfilled(
    harden({
      timer: chainTimerService,
      electorateInstance,
      governedContractInstallation: ammInstallation,
      governed: {
        terms: ammTerms,
        issuerKeywordRecord: { Central: centralIssuer },
        privateArgs: {
          initialPoserInvitation: poserInvitation,
          storageNode,
          marshaller,
        },
      },
    }),
  );

  /** @type {{ creatorFacet: GovernedContractFacetAccess<XYKAMMPublicFacet,XYKAMMCreatorFacet>, publicFacet: GovernorPublic, instance: Instance }} */
  const g = await E(zoe).startInstance(
    governorInstallation,
    {},
    ammGovernorTerms,
    { electorateCreatorFacet: committeeCreator },
  );

  const [creatorFacet, ammPublicFacet, instance] = await Promise.all([
    E(g.creatorFacet).getCreatorFacet(),
    E(g.creatorFacet).getPublicFacet(),
    E(g.publicFacet).getGovernedContract(),
  ]);
  ammGovernorCreatorFacet.resolve(g.creatorFacet);
  ammCreatorFacet.resolve(creatorFacet);

  // Confirm that the amm was indeed setup
  assert(ammPublicFacet, X`ammPublicFacet broken  ${ammPublicFacet}`);

  ammInstanceWithoutReserve.resolve(instance);
  ammGovernor.resolve(g.instance);
  return ammInstallation;
};

/** @param {EconomyBootstrapPowers} powers */
export const setupReserve = async ({
  consume: {
    ammCreatorFacet,
    ammInstanceWithoutReserve,
    board,
    feeMintAccess: feeMintAccessP,
    chainStorage,
    chainTimerService,
    zoe,
    economicCommitteeCreatorFacet: committeeCreator,
  },
  produce: {
    reserveCreatorFacet,
    reserveGovernorCreatorFacet,
    reservePublicFacet,
  },
  issuer: {
    consume: { [Stable.symbol]: centralIssuer },
  },
  instance: {
    consume: { economicCommittee: electorateInstance },
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
  const [poserInvitation, poserInvitationAmount] = await Promise.all([
    poserInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
  ]);

  const reserveTerms = makeReserveTerms(
    poserInvitationAmount,
    ammInstanceWithoutReserve,
  );

  const storageNode = await makeStorageNode(chainStorage, STORAGE_PATH);
  const marshaller = await E(board).getReadonlyMarshaller();

  const reserveGovernorTerms = await deeplyFulfilled(
    harden({
      timer: chainTimerService,
      electorateInstance,
      governedContractInstallation: reserveInstallation,
      governed: {
        terms: reserveTerms,
        issuerKeywordRecord: { Central: centralIssuer },
        privateArgs: {
          feeMintAccess: feeMintAccessP,
          initialPoserInvitation: poserInvitation,
          marshaller,
          storageNode,
        },
      },
    }),
  );
  /** @type {{ creatorFacet: GovernedAssetReserveFacetAccess, publicFacet: GovernorPublic, instance: Instance }} */
  const g = await E(zoe).startInstance(
    governorInstallation,
    {},
    reserveGovernorTerms,
    {
      electorateCreatorFacet: committeeCreator,
    },
  );

  const [creatorFacet, publicFacet, instance] = await Promise.all([
    E(g.creatorFacet).getCreatorFacet(),
    E(g.creatorFacet).getPublicFacet(),
    E(g.publicFacet).getGovernedContract(),
  ]);

  reserveGovernorCreatorFacet.resolve(g.creatorFacet);
  reserveCreatorFacet.resolve(creatorFacet);
  reservePublicFacet.resolve(publicFacet);

  reserveInstanceProducer.resolve(instance);
  reserveGovernor.resolve(g.instance);

  // AMM requires Reserve in order to add pools, but we can't provide it at startInstance
  // time because Reserve requires AMM itself in order to be started.
  // Now that we have the reserve, provide it to the AMM.
  trace('Resolving the reserve public facet on the AMM');
  await E(ammCreatorFacet).resolveReserveFacet(publicFacet);
  // it now has the reserve
  ammInstanceProducer.resolve(ammInstanceWithoutReserve);

  return reserveInstallation;
};

/**
 * @param {EconomyBootstrapPowers} powers
 * @param {object} config
 * @param {LoanTiming} [config.loanParams]
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
      feeMintAccess,
      economicCommitteeCreatorFacet: electorateCreatorFacet,
      reserveCreatorFacet,
    },
    produce, // {  vaultFactoryCreator }
    brand: {
      consume: { [Stable.symbol]: centralBrandP },
    },
    instance: {
      produce: instanceProduce,
      consume: {
        amm: ammInstance,
        economicCommittee: economicCommitteeInstance,
        reserve: reserveInstance,
      },
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
  } = {},
  minInitialDebt = 5_000_000n,
) => {
  const STORAGE_PATH = 'vaultFactory';
  trace('startVaultFactory');

  const poserInvitationP = E(electorateCreatorFacet).getPoserInvitation();
  const shortfallInvitationP =
    E(reserveCreatorFacet).makeShortfallReportingInvitation();
  const [
    initialPoserInvitation,
    poserInvitationAmount,
    initialShortfallInvitation,
    shortfallInvitationAmount,
    liquidateInstallation,
  ] = await Promise.all([
    poserInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
    shortfallInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(shortfallInvitationP),
    liquidateInstallationP,
  ]);

  const centralBrand = await centralBrandP;

  const ammPublicFacet = await E(zoe).getPublicFacet(ammInstance);
  const reservePublicFacet = await E(zoe).getPublicFacet(reserveInstance);
  const storageNode = await makeStorageNode(chainStorage, STORAGE_PATH);
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
    },
  );

  const governorTerms = await deeplyFulfilled(
    harden({
      timer: chainTimerService,
      electorateInstance: economicCommitteeInstance,
      governedContractInstallation: vaultFactoryInstallation,
      governed: {
        terms: vaultFactoryTerms,
        issuerKeywordRecord: {},
        privateArgs: {
          feeMintAccess,
          initialPoserInvitation,
          initialShortfallInvitation,
          marshaller,
          storageNode,
        },
      },
    }),
  );

  const { creatorFacet: governorCreatorFacet, instance: governorInstance } =
    await E(zoe).startInstance(
      contractGovernorInstallation,
      undefined,
      governorTerms,
      harden({ electorateCreatorFacet }),
    );

  const [vaultFactoryInstance, vaultFactoryCreator] = await Promise.all([
    E(governorCreatorFacet).getInstance(),
    E(governorCreatorFacet).getCreatorFacet(),
  ]);

  const voteCreator = Far('vaultFactory vote creator', {
    voteOnParamChanges: E(governorCreatorFacet).voteOnParamChanges,
  });

  produce.vaultFactoryCreator.resolve(vaultFactoryCreator);
  produce.vaultFactoryGovernorCreator.resolve(governorCreatorFacet);
  produce.vaultFactoryVoteCreator.resolve(voteCreator);

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
  { consume: { client, priceAuthorityAdmin, vaultFactoryCreator } },
  { options: { vaultFactoryControllerAddress } = {} } = {},
) => {
  await E(client).assignBundle([
    addr => ({
      vaultFactoryCreatorFacet:
        typeof vaultFactoryControllerAddress === 'string' &&
        addr === vaultFactoryControllerAddress
          ? vaultFactoryCreator
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

/** @param {BootstrapPowers} powers */
export const configureVaultFactoryUI = async ({
  consume: { board, zoe },
  issuer: {
    consume: { [Stable.symbol]: stableIssuerP },
  },
  brand: {
    consume: { [Stable.symbol]: stableBrandP },
  },
  installation: {
    consume: {
      amm: ammInstallation,
      VaultFactory: vaultInstallation,
      contractGovernor,
      binaryVoteCounter,
      liquidate,
    },
  },
  instance: {
    consume: { amm: ammInstance, VaultFactory: vaultInstance },
  },
  uiConfig,
}) => {
  const installs = await Collect.allValues({
    vaultFactory: vaultInstallation,
    amm: ammInstallation,
    contractGovernor,
    binaryVoteCounter,
    liquidate,
  });
  const instances = await Collect.allValues({
    amm: ammInstance,
    vaultFactory: vaultInstance,
  });
  const [stableIssuer, stableBrand] = await Promise.all([
    stableIssuerP,
    stableBrandP,
  ]);

  const invitationIssuer = await E(zoe).getInvitationIssuer();

  const vaultFactoryUiDefaults = {
    CONTRACT_NAME: 'VaultFactory',
    AMM_NAME: 'amm',
    BRIDGE_URL: 'http://127.0.0.1:8000',
    // Avoid setting API_URL, so that the UI uses the same origin it came from,
    // if it has an api server.
    // API_URL: 'http://127.0.0.1:8000',
  };

  // Look up all the board IDs.
  const boardIdValue = [
    ['INSTANCE_BOARD_ID', instances.vaultFactory],
    ['INSTALLATION_BOARD_ID', installs.vaultFactory],
    // @deprecated
    ['RUN_ISSUER_BOARD_ID', stableIssuer],
    // @deprecated
    ['RUN_BRAND_BOARD_ID', stableBrand],
    ['STABLE_ISSUER_BOARD_ID', stableIssuer],
    ['STABLE_BRAND_BOARD_ID', stableBrand],
    ['AMM_INSTALLATION_BOARD_ID', installs.amm],
    ['LIQ_INSTALLATION_BOARD_ID', installs.liquidate],
    ['BINARY_COUNTER_INSTALLATION_BOARD_ID', installs.binaryVoteCounter],
    ['CONTRACT_GOVERNOR_INSTALLATION_BOARD_ID', installs.contractGovernor],
    ['AMM_INSTANCE_BOARD_ID', instances.amm],
    ['INVITE_BRAND_BOARD_ID', E(invitationIssuer).getBrand()],
  ];
  await Promise.all(
    boardIdValue.map(async ([key, valP]) => {
      const val = await valP;
      const boardId = await E(board).getId(val);
      vaultFactoryUiDefaults[key] = boardId;
    }),
  );

  // Stash the defaults where the UI can find them.
  harden(vaultFactoryUiDefaults);

  // Install the names in agoricNames.
  uiConfig.produce[vaultFactoryUiDefaults.CONTRACT_NAME].resolve(
    vaultFactoryUiDefaults,
  );
  uiConfig.produce.Treasury.resolve(vaultFactoryUiDefaults); // compatibility
};
harden(configureVaultFactoryUI);

/**
 * Start the reward distributor.
 *
 * @param {EconomyBootstrapPowers} powers
 */
export const startRewardDistributor = async ({
  consume: {
    chainTimerService,
    bankManager,
    vaultFactoryCreator,
    periodicFeeCollectors,
    ammCreatorFacet,
    stakeFactoryCreatorFacet,
    reservePublicFacet,
    zoe,
  },
  produce: {
    feeDistributorCreatorFacet: feeDistributorCreatorFacetP,
    periodicFeeCollectors: periodicFeeCollectorsP,
  },
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
  const feeDistributorTerms = await deeplyFulfilled(
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

  const feeDistributorFacets = await E(zoe).startInstance(
    feeDistributor,
    { Fee: centralIssuer },
    feeDistributorTerms,
  );
  await E(feeDistributorFacets.creatorFacet).setDestinations({
    RewardDistributor:
      rewardDistributorDepositFacet &&
      E(feeDistributorFacets.creatorFacet).makeDepositFacetDestination(
        rewardDistributorDepositFacet,
      ),
    Reserve: E(feeDistributorFacets.creatorFacet).makeOfferDestination(
      'Collateral',
      reservePublicFacet,
      'makeAddCollateralInvitation',
    ),
  });

  feeDistributorCreatorFacetP.resolve(feeDistributorFacets.creatorFacet);
  feeDistributorP.resolve(feeDistributorFacets.instance);

  // Initialize the periodic collectors list if we don't have one.
  periodicFeeCollectorsP.resolve([]);
  const periodicCollectors = await periodicFeeCollectors;

  const collectorFacets = {
    vaultFactory: vaultFactoryCreator,
    amm: ammCreatorFacet,
    runStake: stakeFactoryCreatorFacet,
  };
  await Promise.all(
    Object.entries(collectorFacets).map(async ([debugName, collectorFacet]) => {
      const collector = E(
        feeDistributorFacets.creatorFacet,
      ).makeContractFeeCollector(zoe, collectorFacet);
      const periodicCollector = await E(
        feeDistributorFacets.creatorFacet,
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
  const bldBrand = await bldP;
  const reporter = makeStakeReporter(bridgeManager, bldBrand);
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
      feeMintAccess,
      lienBridge,
      client,
      chainTimerService,
      chainStorage,
      economicCommitteeCreatorFacet,
    },
    // @ts-expect-error TODO: add to BootstrapPowers
    produce: { stakeFactoryCreatorFacet, stakeFactoryGovernorCreatorFacet },
    installation: {
      consume: {
        contractGovernor: contractGovernorInstallation,
        stakeFactory: stakeFactoryInstallation,
      },
    },
    instance: {
      consume: { economicCommittee: electorateInstance },
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
  const [initialPoserInvitation, electorateInvitationAmount] =
    await Promise.all([
      poserInvitationP,
      E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
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

  const storageNode = await makeStorageNode(chainStorage, STORAGE_PATH);
  const marshaller = await E(board).getReadonlyMarshaller();

  const stakeTerms = await deeplyFulfilled(
    harden({
      timer: chainTimerService,
      electorateInstance,
      governedContractInstallation: stakeFactoryInstallation,
      governed: {
        terms: stakeFactoryTerms,
        issuerKeywordRecord: { Stake: bldIssuer },
        privateArgs: {
          feeMintAccess,
          initialPoserInvitation,
          lienBridge,
          storageNode,
          marshaller,
        },
      },
    }),
  );

  /** @type {{ publicFacet: GovernorPublic, creatorFacet: GovernedContractFacetAccess<StakeFactoryPublic,StakeFactoryCreator>}} */
  const governorFacets = await E(zoe).startInstance(
    contractGovernorInstallation,
    {},
    stakeTerms,
  );
  const governedInstance = await E(governorFacets.creatorFacet).getInstance();
  const creatorFacet = E(governorFacets.creatorFacet).getCreatorFacet();

  const {
    issuers: { Attestation: attIssuer },
    brands: { Attestation: attBrand },
  } = await E(zoe).getTerms(governedInstance);

  stakeFactoryCreatorFacet.resolve(creatorFacet);
  stakeFactoryGovernorCreatorFacet.resolve(governorFacets.creatorFacet);
  stakeFactoryinstanceR.resolve(governedInstance);
  attestationBrandR.resolve(attBrand);
  attestationIssuerR.resolve(attIssuer);
  return Promise.all([
    E(client).assignBundle([
      address => ({
        // @ts-expect-error ??? creatorFacet is a StakeFactoryCreator; it has the method
        attMaker: E(creatorFacet).provideAttestationMaker(address),
      }),
    ]),
  ]);
};
harden(startStakeFactory);
