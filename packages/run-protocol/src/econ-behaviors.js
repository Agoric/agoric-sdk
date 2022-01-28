// @ts-check

import { E, Far } from '@agoric/far';
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

import { makeGovernedTerms } from './vaultFactory/params.js';
import { bootstrapRunLoC, Collect } from './bootstrapRunLoC.js';

import '../exported.js';

import { PROTOCOL_FEE_KEY, POOL_FEE_KEY } from './vpool-xyk-amm/params.js';

import { makeStakeReporter } from '../../vats/src/my-lien.js';
import { BLD_ISSUER_ENTRY } from '../../vats/src/issuers.js';

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
    economyBundles,
  },
  produce: { ammCreatorFacet, ammGovernorCreatorFacet },
}) => {
  const electorateInstance = E(agoricNames).lookup(
    'instance',
    'economicCommittee',
  );
  const bundles = await economyBundles;
  const ammInstallation = E(zoe).install(bundles.amm);
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

  const timer = await chainTimerService; // ISSUE: why on earth doesn't an ERef serve???

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

// TODO: push most of this back to run-protocol package and unit test it.
/** @param { BootstrapPowers } powers */
export async function startVaultFactory({
  consume: {
    agoricNames,
    board,
    chainTimerService,
    nameAdmins,
    priceAuthority,
    zoe,
    feeMintAccess,
    economicCommitteeCreatorFacet: electorateCreatorFacet,
  },
  produce, // {  vaultFactoryCreator }
}) {
  // Fetch the nameAdmins we need.
  const [installAdmin, instanceAdmin, uiConfigAdmin] = await collectNameAdmins(
    ['installation', 'instance', 'uiConfig'],
    agoricNames,
    nameAdmins,
  );

  /** @type {Record<string, SourceBundle>} */
  const bundles = {
    liquidate: liquidateBundle,
    vaultFactory: vaultFactoryBundle,
  };
  const installations = await Collect.allValues(
    Collect.mapValues(bundles, bundle => E(zoe).install(bundle)),
  );

  // Advertise the installation in agoricNames.
  await Promise.all(
    entries(installations).map(([name, install]) =>
      E(installAdmin).update(name, install),
    ),
  );

  const loanParams = {
    chargingPeriod: SECONDS_PER_HOUR,
    recordingPeriod: SECONDS_PER_DAY,
  };

  const poserInvitationP = E(electorateCreatorFacet).getPoserInvitation();
  const [initialPoserInvitation, invitationAmount] = await Promise.all([
    poserInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
  ]);

  const centralIssuerP = E(zoe).getFeeIssuer();
  const [centralIssuer, centralBrand] = await Promise.all([
    centralIssuerP,
    E(centralIssuerP).getBrand(),
  ]);

  // declare governed params for the vaultFactory; addVaultType() sets actual rates
  const rates = {
    initialMargin: makeRatio(120n, centralBrand),
    liquidationMargin: makeRatio(105n, centralBrand),
    interestRate: makeRatio(250n, centralBrand, BASIS_POINTS),
    loanFee: makeRatio(200n, centralBrand, BASIS_POINTS),
  };

  const [
    ammInstance,
    electorateInstance,
    contractGovernorInstall,
    ammInstall,
    binaryCounterInstall,
    noActionElectorateInstall,
  ] = await Promise.all([
    // TODO: manifest constants for these strings
    E(agoricNames).lookup('instance', 'amm'),
    E(agoricNames).lookup('instance', 'economicCommittee'),
    E(agoricNames).lookup('installation', 'congractGovernor'),
    E(agoricNames).lookup('installation', 'amm'),
    E(agoricNames).lookup('installation', 'binaryVoteCounter'),
    E(agoricNames).lookup('installation', 'noActionElectorate'),
  ]);
  const ammPublicFacet = await E(zoe).getPublicFacet(ammInstance);

  const vaultFactoryTerms = makeGovernedTerms(
    priceAuthority,
    loanParams,
    installations.liquidation,
    chainTimerService,
    invitationAmount,
    rates,
    ammPublicFacet,
  );
  const governorTerms = harden({
    timer: chainTimerService,
    electorateInstance,
    governedContractInstallation: installations.vaultFactory,
    governed: {
      terms: vaultFactoryTerms,
      issuerKeywordRecord: {},
      privateArgs: harden({ feeMintAccess, initialPoserInvitation }),
    },
  });

  const { creatorFacet: governorCreatorFacet } = await E(zoe).startInstance(
    contractGovernorInstall,
    undefined,
    governorTerms,
    harden({ electorateCreatorFacet }),
  );

  const vaultFactoryInstance = await E(governorCreatorFacet).getInstance();
  const [
    invitationIssuer,
    {
      // ISSUE: what are govIssuer and govBrand for???
      issuers: { Governance: govIssuer },
      brands: { Governance: govBrand },
    },
    vaultFactoryCreator,
  ] = await Promise.all([
    E(zoe).getInvitationIssuer(),
    E(zoe).getTerms(vaultFactoryInstance),
    E(governorCreatorFacet).getCreatorFacet(),
  ]);

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
    ['INSTANCE_BOARD_ID', vaultFactoryInstance],
    ['INSTALLATION_BOARD_ID', installations.vaultFactory],
    ['RUN_ISSUER_BOARD_ID', centralIssuer],
    ['RUN_BRAND_BOARD_ID', centralBrand],
    ['AMM_INSTALLATION_BOARD_ID', ammInstall],
    ['LIQ_INSTALLATION_BOARD_ID', installations.liquidation],
    ['BINARY_COUNTER_INSTALLATION_BOARD_ID', binaryCounterInstall],
    ['NO_ACTION_INSTALLATION_BOARD_ID', noActionElectorateInstall],
    ['CONTRACT_GOVERNOR_INSTALLATION_BOARD_ID', contractGovernorInstall],
    ['AMM_INSTANCE_BOARD_ID', ammInstance],
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
  const nameAdminUpdates = [
    [
      uiConfigAdmin,
      vaultFactoryUiDefaults.CONTRACT_NAME,
      vaultFactoryUiDefaults,
    ],
    [instanceAdmin, vaultFactoryUiDefaults.CONTRACT_NAME, vaultFactoryInstance],
    [instanceAdmin, vaultFactoryUiDefaults.AMM_NAME, ammInstance],
  ];
  await Promise.all(
    nameAdminUpdates.map(([nameAdmin, name, value]) =>
      E(nameAdmin).update(name, value),
    ),
  );

  const voteCreator = Far('vaultFactory vote creator', {
    voteOnParamChange: E(governorCreatorFacet).voteOnParamChange,
  });

  produce.vaultFactoryCreator.resolve(vaultFactoryCreator);
  produce.vaultFactoryGovernorCreator.resolve(governorCreatorFacet);
  produce.vaultFactoryVoteCreator.resolve(voteCreator);

  // return { vaultFactoryCreator, voteCreator, ammFacets: amm };
  return E(instanceAdmin).update('vaultFactory', vaultFactoryInstance);
}

/** @param {BootstrapPowers} powers */
export const startGetRun = async ({
  consume: {
    zoe,
    // ISSUE: is there some reason Zoe shouldn't await this???
    feeMintAccess: feeMintAccessP,
    agoricNames,
    bridgeManager,
    client,
    chainTimerService,
    nameAdmins,
  },
}) => {
  const [stakeName] = BLD_ISSUER_ENTRY;

  const [
    feeMintAccess,
    bldIssuer,
    bldBrand,
    runBrand,
    governor,
    electorate,
    installation,
  ] = await Promise.all([
    feeMintAccessP,
    E(agoricNames).lookup('issuer', stakeName),
    E(agoricNames).lookup('brand', stakeName),
    E(agoricNames).lookup('brand', CENTRAL_ISSUER_NAME),
    // TODO: manage string constants that need to match
    E(agoricNames).lookup('installation', 'contractGovernor'),
    E(agoricNames).lookup('installation', 'committee'),
    E(zoe).install(getRUNBundle),
  ]);
  const collateralPrice = makeRatio(65n, runBrand, 100n, bldBrand); // arbitrary price
  const collateralizationRatio = makeRatio(5n, runBrand, 1n); // arbitrary raio

  const installations = {
    governor,
    electorate,
    getRUN: installation,
  };

  // TODO: finish renaming bootstrapRunLoC etc.
  const { instance, publicFacet, creatorFacet } = await bootstrapRunLoC(
    zoe,
    chainTimerService,
    feeMintAccess,
    installations,
    { collateralPrice, collateralizationRatio },
    bldIssuer,
  );
  const attIssuer = E(publicFacet).getIssuer();
  const attBrand = await E(attIssuer).getBrand();

  const reporter = makeStakeReporter(bridgeManager, bldBrand);

  const [
    brandAdmin,
    issuerAdmin,
    installAdmin,
    instanceAdmin,
  ] = await collectNameAdmins(
    ['brand', 'issuer', 'installation', 'instance'],
    agoricNames,
    nameAdmins,
  );

  const key = 'getRUN';
  const attKey = 'Attestation';
  assert(shared.contract[key]);
  assert(shared.assets[attKey]);
  return Promise.all([
    E(installAdmin).update(key, installation),
    E(instanceAdmin).update(key, instance),
    E(brandAdmin).update(attKey, attBrand),
    E(issuerAdmin).update(attKey, attIssuer),
    // @ts-ignore threading types thru governance is WIP
    E(creatorFacet).addAuthority(reporter),
    E(client).assignBundle({
      // @ts-ignore threading types thru governance is WIP
      attMaker: address => E(creatorFacet).getAttMaker(address),
    }),
  ]);
};
harden(startGetRun);
