// @ts-check

import { E, Far } from '@endo/far';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { CENTRAL_ISSUER_NAME } from '@agoric/vats/src/core/utils.js';
import '@agoric/governance/exported.js';
import '@agoric/vats/exported.js';
import '@agoric/vats/src/core/types.js';

import { AmountMath } from '@agoric/ertp';
import { makeGovernedTerms } from '../vaultFactory/params.js';
import { makeAmmTerms } from '../vpool-xyk-amm/params.js';
import { makeReserveTerms } from '../reserve/params.js';

import '../../exported.js';

import * as Collect from '../collect.js';
import { makeRunStakeTerms } from '../runStake/params.js';
import { liquidationDetailTerms } from '../vaultFactory/liquidation.js';
import { makeStakeReporter } from '../my-lien.js';
import { makeTracer } from '../makeTracer.js';

const trace = makeTracer('RunEconBehaviors', false);

const { details: X } = assert;

const SECONDS_PER_HOUR = 60n * 60n;
const SECONDS_PER_DAY = 24n * SECONDS_PER_HOUR;

const BASIS_POINTS = 10_000n;
const MILLI = 1_000_000n;

const CENTRAL_DENOM_NAME = 'urun';

/**
 * @typedef { WellKnownSpaces & ChainBootstrapSpace & EconomyBootstrapSpace
 * } EconomyBootstrapPowers
 * @typedef {PromiseSpaceOf<{
 *   ammCreatorFacet: XYKAMMCreatorFacet,
 *   ammGovernorCreatorFacet: GovernedContractFacetAccess<XYKAMMCreatorFacet>,
 *   economicCommitteeCreatorFacet: CommitteeElectorateCreatorFacet,
 *   bankMints: Mint[],
 *   psmCreatorFacet: unknown,
 *   psmGovernorCreatorFacet: GovernedContractFacetAccess<unknown>,
 *   reservePublicFacet: AssetReservePublicFacet,
 *   reserveCreatorFacet: AssetReserveCreatorFacet,
 *   reserveGovernorCreatorFacet: GovernedContractFacetAccess<unknown>,
 *   runStakeCreatorFacet: import('../runStake/runStake.js').RunStakeCreator,
 *   vaultFactoryCreator: VaultFactory,
 *   vaultFactoryGovernorCreator: GovernedContractFacetAccess<unknown>,
 *   vaultFactoryVoteCreator: unknown,
 *   minInitialDebt: NatValue,
 * }>} EconomyBootstrapSpace
 *
 * @typedef {import('../reserve/assetReserve.js').AssetReserveCreatorFacet} AssetReserveCreatorFacet
 * @typedef {import('../reserve/assetReserve.js').AssetReservePublicFacet} AssetReservePublicFacet
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
 * @param { EconomyBootstrapPowers } powers
 * @param {{
 *   interchainPoolOptions?: { minimumCentral?: bigint }
 * }} [options]
 */
export const startInterchainPool = async (
  {
    consume: { bankManager: mgrP, zoe, agoricNamesAdmin },
    installation: {
      consume: { interchainPool: installationP },
    },
    instance: {
      consume: { amm: ammP },
      produce: { interchainPool: _viaAgoricNamesAdmin },
    },
    brand: {
      consume: { RUN: centralBrandP },
    },
    issuer: {
      consume: { RUN: centralIssuerP },
    },
  },
  { interchainPoolOptions = {} } = {},
) => {
  // TODO: get minimumCentral dynamically from the AMM
  const { minimumCentral = 100n * MILLI } = interchainPoolOptions;
  const [centralIssuer, centralBrand, installation, bankManager, amm] =
    await Promise.all([
      centralIssuerP,
      centralBrandP,
      installationP,
      mgrP,
      ammP,
    ]);

  const terms = {
    minimumCentral: AmountMath.make(centralBrand, minimumCentral),
    amm,
  };
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

/**
 * @param { EconomyBootstrapPowers } powers
 * @param {{ options?: { minInitialPoolLiquidity?: bigint }}} opts
 */
export const setupAmm = async (
  {
    consume: {
      chainTimerService,
      zoe,
      economicCommitteeCreatorFacet: committeeCreator,
    },
    produce: { ammCreatorFacet, ammGovernorCreatorFacet },
    brand: {
      consume: { RUN: runBrandP },
    },
    issuer: {
      consume: { [CENTRAL_ISSUER_NAME]: centralIssuer },
    },
    instance: {
      consume: { economicCommittee: electorateInstance },
      produce: { amm: ammInstanceProducer, ammGovernor },
    },
    installation: {
      consume: { contractGovernor: governorInstallation, amm: ammInstallation },
    },
  },
  { options = {} } = {},
) => {
  const poserInvitationP = E(committeeCreator).getPoserInvitation();
  const [poserInvitation, poserInvitationAmount, runBrand] = await Promise.all([
    poserInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
    runBrandP,
  ]);
  const { minInitialPoolLiquidity = 1_000_000_000n } = options;

  const timer = await chainTimerService; // avoid promise for legibility

  const ammTerms = makeAmmTerms(
    timer,
    poserInvitationAmount,
    AmountMath.make(runBrand, minInitialPoolLiquidity),
  );

  const ammGovernorTerms = {
    timer,
    electorateInstance,
    governedContractInstallation: ammInstallation,
    governed: {
      terms: ammTerms,
      issuerKeywordRecord: { Central: centralIssuer },
      privateArgs: { initialPoserInvitation: poserInvitation },
    },
  };
  /** @type {{ creatorFacet: GovernedContractFacetAccess<XYKAMMCreatorFacet>, publicFacet: GovernorPublic, instance: Instance }} */
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

  ammInstanceProducer.resolve(instance);
  ammGovernor.resolve(g.instance);
  return ammInstallation;
};

/** @param { EconomyBootstrapPowers } powers */
export const setupReserve = async ({
  consume: {
    ammCreatorFacet,
    feeMintAccess: feeMintAccessP,
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
    consume: { [CENTRAL_ISSUER_NAME]: centralIssuer },
  },
  instance: {
    consume: { economicCommittee: electorateInstance, amm: ammInstanceP },
    produce: { reserve: reserveInstanceProducer, reserveGovernor },
  },
  installation: {
    consume: {
      contractGovernor: governorInstallation,
      reserve: reserveInstallation,
    },
  },
}) => {
  trace('setupReserve');
  const poserInvitationP = E(committeeCreator).getPoserInvitation();
  const [poserInvitation, poserInvitationAmount] = await Promise.all([
    poserInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
  ]);
  const timer = await chainTimerService; // avoid promise for legibility

  const ammInstance = await ammInstanceP;

  const reserveTerms = makeReserveTerms(poserInvitationAmount, ammInstance);

  const feeMintAccess = await feeMintAccessP;
  const reserveGovernorTerms = {
    timer,
    electorateInstance,
    governedContractInstallation: reserveInstallation,
    governed: {
      terms: reserveTerms,
      issuerKeywordRecord: { Central: centralIssuer },
      privateArgs: { feeMintAccess, initialPoserInvitation: poserInvitation },
    },
  };
  /** @type {{ creatorFacet: GovernedContractFacetAccess<AssetReserveCreatorFacet>, publicFacet: GovernorPublic, instance: Instance }} */
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
  // @ts-expect-error bad types
  reservePublicFacet.resolve(publicFacet);

  reserveInstanceProducer.resolve(instance);
  reserveGovernor.resolve(g.instance);

  // AMM requires Reserve in order to add pools, but we can't provide it at startInstance
  // time because Reserve requires AMM itself in order to be started.
  // Now that we have the reserve, provide it to the AMM.
  trace('Resolving the reserve public facet on the AMM');
  // @ts-expect-error bad types
  await E(ammCreatorFacet).resolveReserveFacet(publicFacet);

  return reserveInstallation;
};

/**
 * @param { EconomyBootstrapPowers } powers
 * @param {object} config
 * @param { LoanTiming } [config.loanParams]
 * @param {bigint} minInitialDebt
 */
export const startVaultFactory = async (
  {
    consume: {
      chainTimerService,
      priceAuthority: priceAuthorityP,
      zoe,
      feeMintAccess: feeMintAccessP, // ISSUE: why doeszn't Zoe await this?
      economicCommitteeCreatorFacet: electorateCreatorFacet,
      reserveCreatorFacet,
    },
    produce, // {  vaultFactoryCreator }
    brand: {
      consume: { [CENTRAL_ISSUER_NAME]: centralBrandP },
    },
    instance,
    installation: {
      consume: { VaultFactory, liquidate, contractGovernor },
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
  trace('startVaultFactory');
  const installations = await Collect.allValues({
    VaultFactory,
    liquidate,
  });

  const poserInvitationP = E(electorateCreatorFacet).getPoserInvitation();
  const shortfallInvitationP =
    E(reserveCreatorFacet).makeShortfallReportingInvitation();
  const [
    initialPoserInvitation,
    poserInvitationAmount,
    initialShortfallInvitation,
    shortfallInvitationAmount,
  ] = await Promise.all([
    poserInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
    shortfallInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(shortfallInvitationP),
  ]);

  const centralBrand = await centralBrandP;

  /**
   * Types for the governed params for the vaultFactory; addVaultType() sets actual values
   *
   * @type {VaultManagerParamValues}
   */
  const vaultManagerParams = {
    // XXX the values aren't used. May be addressed by https://github.com/Agoric/agoric-sdk/issues/4861
    debtLimit: AmountMath.make(centralBrand, 0n),
    liquidationMargin: makeRatio(0n, centralBrand),
    liquidationPenalty: makeRatio(10n, centralBrand, 100n),
    interestRate: makeRatio(0n, centralBrand, BASIS_POINTS),
    loanFee: makeRatio(0n, centralBrand, BASIS_POINTS),
  };

  const [
    ammInstance,
    electorateInstance,
    contractGovernorInstall,
    reserveInstance,
  ] = await Promise.all([
    instance.consume.amm,
    instance.consume.economicCommittee,
    contractGovernor,
    instance.consume.reserve,
  ]);
  const ammPublicFacet = await E(zoe).getPublicFacet(ammInstance);
  const feeMintAccess = await feeMintAccessP;
  const priceAuthority = await priceAuthorityP;
  const reservePublicFacet = await E(zoe).getPublicFacet(reserveInstance);
  const timer = await chainTimerService;
  const vaultFactoryTerms = makeGovernedTerms({
    priceAuthority,
    reservePublicFacet,
    loanTiming: loanParams,
    liquidationInstall: installations.liquidate,
    timer,
    electorateInvitationAmount: poserInvitationAmount,
    vaultManagerParams,
    ammPublicFacet,
    liquidationTerms: liquidationDetailTerms(centralBrand),
    minInitialDebt: AmountMath.make(centralBrand, minInitialDebt),
    bootstrapPaymentValue: 0n,
    shortfallInvitationAmount,
  });

  const governorTerms = harden({
    timer,
    electorateInstance,
    governedContractInstallation: installations.VaultFactory,
    governed: {
      terms: vaultFactoryTerms,
      issuerKeywordRecord: {},
      privateArgs: harden({
        feeMintAccess,
        initialPoserInvitation,
        initialShortfallInvitation,
      }),
    },
  });

  const { creatorFacet: governorCreatorFacet, instance: governorInstance } =
    await E(zoe).startInstance(
      contractGovernorInstall,
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
  instance.produce.VaultFactory.resolve(vaultFactoryInstance);
  instance.produce.Treasury.resolve(vaultFactoryInstance);
  instance.produce.VaultFactoryGovernor.resolve(governorInstance);
};

/**
 * Grant access to the VaultFactory creatorFacet
 * to up to one user based on address.
 *
 * @param { EconomyBootstrapPowers } powers
 * @param {object} [root0]
 * @param {object} [root0.options]
 * @param {string} [root0.options.vaultFactoryControllerAddress]
 */
export const grantVaultFactoryControl = async (
  { consume: { client, priceAuthorityAdmin, vaultFactoryCreator } },
  { options: { vaultFactoryControllerAddress } = {} } = {},
) => {
  E(client).assignBundle([
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

/** @param { BootstrapPowers } powers */
export const configureVaultFactoryUI = async ({
  consume: { board, zoe },
  issuer: {
    consume: { [CENTRAL_ISSUER_NAME]: centralIssuerP },
  },
  brand: {
    consume: { [CENTRAL_ISSUER_NAME]: centralBrandP },
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
  const [centralIssuer, centralBrand] = await Promise.all([
    centralIssuerP,
    centralBrandP,
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
    ['RUN_ISSUER_BOARD_ID', centralIssuer],
    ['RUN_BRAND_BOARD_ID', centralBrand],
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
 * @param {EconomyBootstrapPowers & {
 *   consume: { loadVat: ERef<VatLoader<DistributeFeesVat>>},
 * }} powers
 *
 * @typedef {ERef<ReturnType<import('@agoric/vats/src/vat-distributeFees').buildRootObject>>} DistributeFeesVat
 */
export const startRewardDistributor = async ({
  consume: {
    chainTimerService,
    bankManager,
    loadVat,
    vaultFactoryCreator,
    ammCreatorFacet,
    runStakeCreatorFacet,
    zoe,
  },
  issuer: {
    consume: { RUN: centralIssuerP },
  },
  brand: {
    consume: { RUN: centralBrandP },
  },
}) => {
  trace('startRewardDistributor');
  const epochTimerService = await chainTimerService;
  const distributorParams = {
    epochInterval: 60n * 60n, // 1 hour
  };
  const [centralIssuer, centralBrand] = await Promise.all([
    centralIssuerP,
    centralBrandP,
  ]);
  const rewardDistributorDepositFacet = await E(bankManager)
    .getRewardDistributorDepositFacet(CENTRAL_DENOM_NAME, {
      issuer: centralIssuer,
      brand: centralBrand,
    })
    .catch(e => {
      console.error('Cannot create fee collector deposit facet', e);
      return undefined;
    });

  // Only distribute rewards if there is a collector.
  if (!rewardDistributorDepositFacet) {
    return;
  }

  const vats = { distributeFees: E(loadVat)('distributeFees') };
  const [vaultAdmin, ammAdmin, runStakeAdmin] = await Promise.all([
    vaultFactoryCreator,
    ammCreatorFacet,
    runStakeCreatorFacet,
  ]);
  await E(vats.distributeFees).buildDistributor(
    [vaultAdmin, ammAdmin, runStakeAdmin].map(cf =>
      E(vats.distributeFees).makeFeeCollector(zoe, cf),
    ),
    rewardDistributorDepositFacet,
    epochTimerService,
    harden(distributorParams),
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
    consume: { BLD: bldP },
  },
}) => {
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
 * }>} RunStakeBootstrapPowers
 */

/**
 * @param {RunStakeBootstrapPowers } powers
 * @param {object} config
 * @param {bigint} [config.debtLimit] count of RUN
 * @param {Rational} [config.mintingRatio] ratio of RUN minted to BLD
 * @param {bigint} [config.interestRateBP]
 * @param {bigint} [config.loanFeeBP]
 * @param {bigint} [config.chargingPeriod]
 * @param {bigint} [config.recordingPeriod]
 * @typedef {[bigint, bigint]} Rational
 * @typedef {Awaited<ReturnType<typeof import('../runStake/runStake.js').start>>} StartRunStake
 */
export const startRunStake = async (
  {
    consume: {
      zoe,
      // ISSUE: is there some reason Zoe shouldn't await this???
      feeMintAccess: feeMintAccessP,
      lienBridge,
      client,
      chainTimerService,
      economicCommitteeCreatorFacet,
    },
    // @ts-expect-error TODO: add to BootstrapPowers
    produce: { runStakeCreatorFacet, runStakeGovernorCreatorFacet },
    installation: {
      consume: { contractGovernor, runStake: installationP },
    },
    instance: {
      consume: { economicCommittee: electorateInstance },
      produce: { runStake: runStakeinstanceR },
    },
    brand: {
      consume: { BLD: bldBrandP, RUN: runBrandP },
      produce: { Attestation: attestationBrandR },
    },
    issuer: {
      consume: { BLD: bldIssuer },
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
  const [feeMintAccess, bldBrand, runBrand, governor, installation, timer] =
    await Promise.all([
      feeMintAccessP,
      bldBrandP,
      runBrandP,
      contractGovernor,
      installationP,
      chainTimerService,
    ]);

  const installations = {
    governor,
    runStake: installation,
  };

  const poserInvitationP = E(
    economicCommitteeCreatorFacet,
  ).getPoserInvitation();
  const [initialPoserInvitation, electorateInvitationAmount] =
    await Promise.all([
      poserInvitationP,
      E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
    ]);

  const runStakeTerms = makeRunStakeTerms(
    {
      timerService: timer,
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

  /** @type {{ publicFacet: GovernorPublic, creatorFacet: GovernedContractFacetAccess<unknown>}} */
  const governorFacets = await E(zoe).startInstance(
    installations.governor,
    {},
    {
      timer,
      electorateInstance,
      governedContractInstallation: installations.runStake,
      governed: harden({
        terms: runStakeTerms,
        issuerKeywordRecord: { Stake: bldIssuer },
        privateArgs: { feeMintAccess, initialPoserInvitation, lienBridge },
      }),
    },
  );
  const governedInstance = await E(governorFacets.creatorFacet).getInstance();
  const creatorFacet = E(governorFacets.creatorFacet).getCreatorFacet();

  const {
    issuers: { Attestation: attIssuer },
    brands: { Attestation: attBrand },
  } = await E(zoe).getTerms(governedInstance);

  runStakeCreatorFacet.resolve(creatorFacet);
  runStakeGovernorCreatorFacet.resolve(governorFacets.creatorFacet);
  runStakeinstanceR.resolve(governedInstance);
  attestationBrandR.resolve(attBrand);
  attestationIssuerR.resolve(attIssuer);
  return Promise.all([
    E(client).assignBundle([
      address => ({
        attMaker: E(creatorFacet).provideAttestationMaker(address),
      }),
    ]),
  ]);
};
harden(startRunStake);
