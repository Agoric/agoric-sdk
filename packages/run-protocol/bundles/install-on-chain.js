// @ts-check
import { E } from '@agoric/eventual-send';

import '@agoric/governance/exported.js';
import '../exported.js';

import { Far } from '@endo/far';
import { PROTOCOL_FEE_KEY, POOL_FEE_KEY } from '../src/vpool-xyk-amm/params.js';
import {
  makeGovernedInvitation,
  CONTRACT_ELECTORATE,
  makeGovernedNat,
} from '@agoric/governance';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';

import liquidateBundle from './bundle-liquidateMinimum.js';
import ammBundle from './bundle-amm.js';
import vaultFactoryBundle from './bundle-vaultFactory.js';
import contractGovernorBundle from './bundle-contractGovernor.js';
import noActionElectorateBundle from './bundle-noActionElectorate.js';
import binaryVoteCounterBundle from './bundle-binaryVoteCounter.js';
import { makeGovernedTerms } from '../src/vaultFactory/params.js';

const SECONDS_PER_HOUR = 60n * 60n;
const SECONDS_PER_DAY = 24n * SECONDS_PER_HOUR;

const BASIS_POINTS = 10_000n;
const DEFAULT_POOL_FEE = 24n;
const DEFAULT_PROTOCOL_FEE = 6n;

/**
 * @param {ERef<TimerService>} timer
 * @param {Instance} electorateInstance
 * @param {ERef<ZoeService>} zoe
 * @param {ElectorateCreatorFacet} committeeCreator
 * @param {Installation} ammInstallation
 * @param {Installation} governorInstallation
 * @param {NatValue} poolFee
 * @param {NatValue} protocolFee
 * @return {Promise<{
 * amm:{
 *   governedInstance:Instance,
 *   ammCreatorFacet:unknown,
 *   ammPublicFacet:XYKAMMPublicFacet},
 * governor:{
 *   ammGovernorCreatorFacet,
 *   ammGovernorInstance:Instance,
 *   ammGovernorPublicFacet:GovernorPublic}
 * }>}
 */
async function setupAmm(
  timer,
  electorateInstance,
  zoe,
  committeeCreator,
  ammInstallation,
  governorInstallation,
  poolFee,
  protocolFee,
) {
  const poserInvitationP = E(committeeCreator).getPoserInvitation();
  const [poserInvitation, poserInvitationAmount] = await Promise.all([
    poserInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
  ]);

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

  const ammGovernorTerms = {
    timer,
    electorateInstance,
    governedContractInstallation: ammInstallation,
    governed: {
      terms: ammTerms,
      issuerKeywordRecord: { Central: E(zoe).getFeeIssuer() },
      privateArgs: { initialPoserInvitation: poserInvitation },
    },
  };
  const {
    instance: ammGovernorInstance,
    publicFacet: ammGovernorPublicFacet,
    creatorFacet: ammGovernorCreatorFacet,
  } = await E(zoe).startInstance(governorInstallation, {}, ammGovernorTerms, {
    electorateCreatorFacet: committeeCreator,
  });

  const g = {
    ammGovernorInstance,
    ammGovernorPublicFacet,
    ammGovernorCreatorFacet,
  };

  const [ammCreatorFacet, ammPublicFacet, instance] = await Promise.all([
    E(ammGovernorCreatorFacet).getCreatorFacet(),
    E(ammGovernorCreatorFacet).getPublicFacet(),
    E(ammGovernorPublicFacet).getGovernedContract(),
  ]);
  const amm = {
    ammCreatorFacet,
    ammPublicFacet,
    governedInstance: instance,
  };

  if (!ammPublicFacet) {
    throw new Error(`ammPublicFacet broken  ${ammPublicFacet}`);
  }

  return {
    governor: g,
    amm,
  };
}

/**
 * @param {Object} param0
 * @param {ERef<NameHub>} param0.agoricNames
 * @param {ERef<Board>} param0.board
 * @param {string} param0.centralName
 * @param {ERef<TimerService>} param0.chainTimerService
 * @param {Store<NameHub, NameAdmin>} param0.nameAdmins
 * @param {ERef<PriceAuthority>} param0.priceAuthority
 * @param {ERef<ZoeService>} param0.zoe
 * @param {Handle<'feeMintAccess'>} param0.feeMintAccess
 * @param {NatValue} param0.bootstrapPaymentValue
 * @param {NatValue} [param0.poolFee]
 * @param {NatValue} [param0.protocolFee]
 */
export async function installOnChain({
  agoricNames,
  board,
  centralName,
  chainTimerService,
  nameAdmins,
  priceAuthority,
  zoe,
  feeMintAccess,
  bootstrapPaymentValue,
  poolFee = DEFAULT_POOL_FEE,
  protocolFee = DEFAULT_PROTOCOL_FEE,
}) {
  // Fetch the nameAdmins we need.
  const [
    brandAdmin,
    installAdmin,
    instanceAdmin,
    issuerAdmin,
    uiConfigAdmin,
  ] = await Promise.all(
    ['brand', 'installation', 'instance', 'issuer', 'uiConfig'].map(
      async edge => {
        const hub = /** @type {NameHub} */ (await E(agoricNames).lookup(edge));
        return nameAdmins.get(hub);
      },
    ),
  );

  /** @type {Array<[string, SourceBundle]>} */
  const nameBundles = [
    ['liquidate', liquidateBundle],
    ['amm', ammBundle],
    ['vaultFactory', vaultFactoryBundle],
    ['contractGovernor', contractGovernorBundle],
    ['noActionElectorate', noActionElectorateBundle],
    ['binaryCounter', binaryVoteCounterBundle],
  ];
  const [
    liquidationInstall,
    ammInstall,
    vaultFactoryInstall,
    contractGovernorInstall,
    noActionElectorateInstall,
    binaryCounterInstall,
  ] = await Promise.all(
    nameBundles.map(async ([name, bundle]) => {
      // Install the bundle in Zoe.
      const install = await E(zoe).install(bundle);
      // Advertise the installation in agoricNames.
      await E(installAdmin).update(name, install);
      // Return for variable assignment.
      return install;
    }),
  );

  // The Electorate is a no-action electorate, so the testNet runs without
  // anyone having the ability to change the vaultFactory's parameters.
  const {
    creatorFacet: electorateCreatorFacet,
    instance: electorateInstance,
  } = await E(zoe).startInstance(noActionElectorateInstall);

  const { amm } = await setupAmm(
    chainTimerService,
    electorateInstance,
    zoe,
    electorateCreatorFacet,
    ammInstall,
    contractGovernorInstall,
    poolFee,
    protocolFee,
  );

  const loanTiming = {
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

  const vaultFactoryTerms = makeGovernedTerms(
    priceAuthority,
    loanTiming,
    liquidationInstall,
    chainTimerService,
    invitationAmount,
    rates,
    amm.ammPublicFacet,
    bootstrapPaymentValue,
  );
  const governorTerms = harden({
    timer: chainTimerService,
    electorateInstance,
    governedContractInstallation: vaultFactoryInstall,
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
    ['INSTALLATION_BOARD_ID', vaultFactoryInstall],
    ['RUN_ISSUER_BOARD_ID', centralIssuer],
    ['RUN_BRAND_BOARD_ID', centralBrand],
    ['AMM_INSTALLATION_BOARD_ID', ammInstall],
    ['LIQ_INSTALLATION_BOARD_ID', liquidationInstall],
    ['BINARY_COUNTER_INSTALLATION_BOARD_ID', binaryCounterInstall],
    ['NO_ACTION_INSTALLATION_BOARD_ID', noActionElectorateInstall],
    ['CONTRACT_GOVERNOR_INSTALLATION_BOARD_ID', contractGovernorInstall],
    ['AMM_INSTANCE_BOARD_ID', amm.governedInstance],
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
    [instanceAdmin, vaultFactoryUiDefaults.AMM_NAME, amm.governedInstance],
    [brandAdmin, centralName, centralBrand],
    [issuerAdmin, centralName, centralIssuer],
  ];
  await Promise.all(
    nameAdminUpdates.map(([nameAdmin, name, value]) =>
      E(nameAdmin).update(name, value),
    ),
  );

  const voteCreator = Far('vaultFactory vote creator', {
    voteOnParamChange: E(governorCreatorFacet).voteOnParamChange,
  });

  return { vaultFactoryCreator, voteCreator, ammFacets: amm };
}
