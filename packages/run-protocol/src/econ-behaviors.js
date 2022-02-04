// @ts-check

import { E, Far } from '@endo/far';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import {
  makeGovernedInvitation,
  CONTRACT_ELECTORATE,
  makeGovernedNat,
} from '@agoric/governance';
import {
  CENTRAL_ISSUER_NAME,
  collectNameAdmins,
  shared,
} from '@agoric/vats/src/core/utils.js';
import '@agoric/governance/exported.js';
import '@agoric/vats/exported.js';
import '@agoric/vats/src/core/types.js';

import { makeGovernedTerms } from './vaultFactory/params.js';

import '../exported.js';

import { PROTOCOL_FEE_KEY, POOL_FEE_KEY } from './vpool-xyk-amm/params.js';

import { Collect } from './collect.js';

const { entries, keys } = Object;

const SECONDS_PER_HOUR = 60n * 60n;
const SECONDS_PER_DAY = 24n * SECONDS_PER_HOUR;

const BASIS_POINTS = 10_000n;
const DEFAULT_POOL_FEE = 24n;
const DEFAULT_PROTOCOL_FEE = 6n;

/**
 * @param {EconomyBootstrapPowers} powers
 * @param {{ committeeName: string, committeeSize: number }} electorateTerms
 */
export const startEconomicCommittee = async (
  {
    consume: { agoricNames, nameAdmins, zoe, governanceBundles },
    produce: { economicCommitteeCreatorFacet },
  },
  electorateTerms = {
    committeeName: 'Initial Economic Committee',
    committeeSize: 1,
  },
) => {
  const bundles = await governanceBundles;
  keys(bundles).forEach(key => assert(shared.contract[key]));

  const installations = await Collect.allValues(
    Collect.mapValues(bundles, bundle => E(zoe).install(bundle)),
  );

  const [installAdmin, instanceAdmin] = await collectNameAdmins(
    ['installation', 'instance'],
    agoricNames,
    nameAdmins,
  );

  const { creatorFacet, instance } = await E(zoe).startInstance(
    installations.committee,
    {},
    electorateTerms,
  );

  economicCommitteeCreatorFacet.resolve(creatorFacet);
  return Promise.all([
    Promise.all(
      entries(installations).map(([key, inst]) =>
        E(installAdmin).update(key, inst),
      ),
    ),
    E(instanceAdmin).update('economicCommittee', instance),
  ]);
};
harden(startEconomicCommittee);

/** @param { EconomyBootstrapPowers } powers */
export const setupAmm = async ({
  consume: {
    chainTimerService,
    agoricNames,
    nameAdmins,
    zoe,
    economicCommitteeCreatorFacet: committeeCreator,
    ammBundle,
  },
  produce: { ammCreatorFacet, ammGovernorCreatorFacet },
}) => {
  const electorateInstance = E(agoricNames).lookup(
    'instance',
    'economicCommittee',
  );
  const bundle = await ammBundle;
  const ammInstallation = E(zoe).install(bundle);
  const governorInstallation = E(agoricNames).lookup(
    'installation',
    'contractGovernor',
  );
  const poolFee = DEFAULT_POOL_FEE;
  const protocolFee = DEFAULT_PROTOCOL_FEE;

  const poserInvitationP = E(committeeCreator).getPoserInvitation();
  const [poserInvitation, poserInvitationAmount] = await Promise.all([
    poserInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
  ]);

  const timer = await chainTimerService; // avoid promise for legibility

  const ammTerms = {
    timer,
    poolFeeBP: poolFee,
    protocolFeeBP: protocolFee,
    main: {
      [PROTOCOL_FEE_KEY]: makeGovernedNat(protocolFee),
      [POOL_FEE_KEY]: makeGovernedNat(poolFee),
      [CONTRACT_ELECTORATE]: makeGovernedInvitation(poserInvitationAmount),
    },
  };

  const centralIssuer = E(agoricNames).lookup('issuer', CENTRAL_ISSUER_NAME);
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
  const g = await E(zoe).startInstance(
    governorInstallation,
    {},
    ammGovernorTerms,
    {
      electorateCreatorFacet: committeeCreator,
    },
  );

  const [creatorFacet, ammPublicFacet, instance] = await Promise.all([
    E(g.creatorFacet).getCreatorFacet(),
    E(g.creatorFacet).getPublicFacet(),
    E(g.publicFacet).getGovernedContract(),
  ]);
  ammGovernorCreatorFacet.resolve(g.creatorFacet);
  ammCreatorFacet.resolve(creatorFacet);

  if (!ammPublicFacet) {
    // ISSUE: what is this test for?!
    throw new Error(`ammPublicFacet broken  ${ammPublicFacet}`);
  }

  const [installAdmin, instanceAdmin] = await collectNameAdmins(
    ['installation', 'instance'],
    agoricNames,
    nameAdmins,
  );

  return Promise.all([
    E(installAdmin).update('amm', ammInstallation),
    E(instanceAdmin).update('amm', instance),
    E(instanceAdmin).update('ammGovernor', g.instance),
  ]);
};

/**
 * @param {BootstrapPowers & {
 *   consume: { loadVat: ERef<VatLoader<PriceAuthorityVat>>},
 * }} powers
 *
 * @typedef {ERef<ReturnType<import('../../vats/src/vat-priceAuthority.js').buildRootObject>>} PriceAuthorityVat
 */
export const startPriceAuthority = async ({
  consume: { loadVat },
  produce: { priceAuthority: priceAuthorityProduce, priceAuthorityAdmin },
}) => {
  const { priceAuthority, adminFacet } = await E(
    E(loadVat)('priceAuthority'),
  ).makePriceAuthority();

  priceAuthorityProduce.resolve(priceAuthority);
  priceAuthorityAdmin.resolve(adminFacet);
};
harden(startPriceAuthority);

/**
 * @param { EconomyBootstrapPowers } powers
 * @param { Object } config
 * @param { LoanTiming } config.loanParams
 */
export const startVaultFactory = async (
  {
    consume: {
      agoricNames,
      vaultBundles,
      chainTimerService,
      nameAdmins,
      priceAuthority,
      zoe,
      feeMintAccess: feeMintAccessP, // ISSUE: why doeszn't Zoe await this?
      economicCommitteeCreatorFacet: electorateCreatorFacet,
    },
    produce, // {  vaultFactoryCreator }
  },
  { loanParams } = {
    loanParams: {
      chargingPeriod: SECONDS_PER_HOUR,
      recordingPeriod: SECONDS_PER_DAY,
    },
  },
) => {
  // Fetch the nameAdmins we need.
  const [installAdmin, instanceAdmin] = await collectNameAdmins(
    ['installation', 'instance'],
    agoricNames,
    nameAdmins,
  );

  const bundles = await vaultBundles;
  const installations = await Collect.allValues({
    VaultFactory: E(zoe).install(bundles.VaultFactory),
    liquidate: E(zoe).install(bundles.liquidate),
  });

  const poserInvitationP = E(electorateCreatorFacet).getPoserInvitation();
  const [initialPoserInvitation, invitationAmount] = await Promise.all([
    poserInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
  ]);

  const centralBrand = await E(agoricNames).lookup(
    'brand',
    CENTRAL_ISSUER_NAME,
  );

  // declare governed params for the vaultFactory; addVaultType() sets actual rates
  const rates = {
    initialMargin: makeRatio(120n, centralBrand),
    liquidationMargin: makeRatio(105n, centralBrand),
    interestRate: makeRatio(250n, centralBrand, BASIS_POINTS),
    loanFee: makeRatio(200n, centralBrand, BASIS_POINTS),
  };

  const [ammInstance, electorateInstance, contractGovernorInstall] =
    await Promise.all([
      // TODO: manifest constants for these strings
      E(agoricNames).lookup('instance', 'amm'),
      E(agoricNames).lookup('instance', 'economicCommittee'),
      E(agoricNames).lookup('installation', 'contractGovernor'),
    ]);
  const ammPublicFacet = await E(zoe).getPublicFacet(ammInstance);
  const feeMintAccess = await feeMintAccessP;

  const vaultFactoryTerms = makeGovernedTerms(
    priceAuthority,
    loanParams,
    installations.liquidate,
    chainTimerService,
    invitationAmount,
    rates,
    ammPublicFacet,
  );
  const governorTerms = harden({
    timer: chainTimerService,
    electorateInstance,
    governedContractInstallation: installations.VaultFactory,
    governed: {
      terms: vaultFactoryTerms,
      issuerKeywordRecord: {},
      privateArgs: harden({ feeMintAccess, initialPoserInvitation }),
    },
  });

  const { creatorFacet: governorCreatorFacet, instance: governorInstance } =
    await E(zoe).startInstance(
      contractGovernorInstall,
      undefined,
      governorTerms,
      harden({ electorateCreatorFacet }),
    );

  const vaultFactoryInstance = await E(governorCreatorFacet).getInstance();
  const [vaultFactoryCreator] = await Promise.all([
    E(zoe).getTerms(vaultFactoryInstance),
    E(governorCreatorFacet).getCreatorFacet(),
  ]);

  const voteCreator = Far('vaultFactory vote creator', {
    voteOnParamChange: E(governorCreatorFacet).voteOnParamChange,
  });

  produce.vaultFactoryCreator.resolve(vaultFactoryCreator);
  produce.vaultFactoryGovernorCreator.resolve(governorCreatorFacet);
  produce.vaultFactoryVoteCreator.resolve(voteCreator);

  // Advertise the installation in agoricNames.
  await Promise.all([
    E(instanceAdmin).update('VaultFactory', vaultFactoryInstance),
    E(instanceAdmin).update('VaultFactoryGovernor', governorInstance),
    ...entries(installations).map(([name, install]) =>
      E(installAdmin).update(name, install),
    ),
  ]);
};

/** @param { BootstrapPowers } powers */
export const configureVaultFactoryUI = async ({
  consume: { agoricNames, nameAdmins, board, zoe },
}) => {
  const installs = await Collect.allValues({
    amm: E(agoricNames).lookup('installation', 'amm'),
    vaultFactory: E(agoricNames).lookup('installation', 'VaultFactory'),
    contractGovernor: E(agoricNames).lookup('installation', 'contractGovernor'),
    noActionElectorate: E(agoricNames).lookup(
      'installation',
      'noActionElectorate',
    ),
    binaryVoteCounter: E(agoricNames).lookup(
      'installation',
      'binaryVoteCounter',
    ),
  });
  const instances = await Collect.allValues({
    amm: E(agoricNames).lookup('instance', 'amm'),
    vaultFactory: E(agoricNames).lookup('instance', 'VaultFactory'),
  });
  const central = await Collect.allValues({
    brand: E(agoricNames).lookup('brand', CENTRAL_ISSUER_NAME),
    issuer: E(agoricNames).lookup('issuer', CENTRAL_ISSUER_NAME),
  });

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
    ['RUN_ISSUER_BOARD_ID', central.issuer],
    ['RUN_BRAND_BOARD_ID', central.brand],
    ['AMM_INSTALLATION_BOARD_ID', installs.amm],
    ['LIQ_INSTALLATION_BOARD_ID', installs.liquidation],
    ['BINARY_COUNTER_INSTALLATION_BOARD_ID', installs.binaryVoteCounter],
    ['NO_ACTION_INSTALLATION_BOARD_ID', installs.noActionElectorate],
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

  const [instanceAdmin, uiConfigAdmin] = await collectNameAdmins(
    ['instance', 'uiConfig'],
    agoricNames,
    nameAdmins,
  );

  // Install the names in agoricNames.
  const nameAdminUpdates = [
    [
      uiConfigAdmin,
      vaultFactoryUiDefaults.CONTRACT_NAME,
      vaultFactoryUiDefaults,
    ],
    [
      instanceAdmin,
      vaultFactoryUiDefaults.CONTRACT_NAME,
      instances.vaultFactory,
    ],
    [instanceAdmin, vaultFactoryUiDefaults.AMM_NAME, instances.amm],
  ];
  await Promise.all(
    nameAdminUpdates.map(([nameAdmin, name, value]) =>
      E(nameAdmin).update(name, value),
    ),
  );
};
harden(configureVaultFactoryUI);
