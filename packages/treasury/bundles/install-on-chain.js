// @ts-check
import { E } from '@agoric/eventual-send';

import '@agoric/governance/exported.js';

import liquidateBundle from './bundle-liquidateMinimum.js';
import autoswapBundle from './bundle-multipoolAutoswap.js';
import stablecoinBundle from './bundle-stablecoinMachine.js';
import contractGovernorBundle from './bundle-contractGovernor.js';
import committeeBundle from './bundle-committee.js';
import binaryVoteCounterBundle from './bundle-binaryVoteCounter.js';
import { governedParameterTerms } from '../src/params';
import { Far } from '@agoric/marshal';

const SECONDS_PER_HOUR = 60n * 60n;
const SECONDS_PER_DAY = 24n * SECONDS_PER_HOUR;

const DEFAULT_POOL_FEE = 24n;
const DEFAULT_PROTOCOL_FEE = 6n;
/**
 * @param {Object} param0
 * @param {ERef<NameHub>} param0.agoricNames
 * @param {ERef<Board>} param0.board
 * @param {string} param0.centralName
 * @param {ERef<TimerService>} param0.chainTimerService
 * @param {Store<NameHub, NameAdmin>} param0.nameAdmins
 * @param {ERef<PriceAuthority>} param0.priceAuthority
 * @param {ERef<ZoeService>} param0.zoeWPurse
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
  zoeWPurse,
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
    ['autoswap', autoswapBundle],
    ['stablecoin', stablecoinBundle],
    ['contractGovernor', contractGovernorBundle],
    ['committee', committeeBundle],
    ['binaryCounter', binaryVoteCounterBundle],

  ];
  const [
    liquidationInstall,
    autoswapInstall,
    stablecoinMachineInstall,
    contractGovernorInstall,
    committeeInstall,
    binaryCounterInstall,
  ] = await Promise.all(
    nameBundles.map(async ([name, bundle]) => {
      // Install the bundle in Zoe.
      const install = await E(zoeWPurse).install(bundle);
      // Advertise the installation in agoricNames.
      await E(installAdmin).update(name, install);
      // Return for variable assignment.
      return install;
    }),
  );

  const electorateTerms = { committeeName: 'TreasuryBoard', committeeSize: 5 };
  // The electorateCreatorFacet has `getVoterInvitations()`, which returns
  // invitations for the people who can vote on changes to the treasury. We
  // don't currently hand those out to anyone, but that is not visible on chain.
  const {
    creatorFacet: electorateCreatorFacet,
    instance: electorateInstance,
  } = await E(zoeWPurse).startInstance(committeeInstall, {}, electorateTerms);

  const loanParams = {
    chargingPeriod: SECONDS_PER_HOUR,
    recordingPeriod: SECONDS_PER_DAY,
    poolFee,
    protocolFee,
  };

  const treasuryTerms = harden({
    autoswapInstall,
    liquidationInstall,
    priceAuthority,
    loanParams,
    timerService: chainTimerService,
    governedParams: governedParameterTerms,
    bootstrapPaymentValue,
  });
  const governorTerms = harden({
    timer: chainTimerService,
    electorateInstance,
    governedContractInstallation: stablecoinMachineInstall,
    governed: {
      terms: treasuryTerms,
      issuerKeywordRecord: {},
      privateArgs: harden({ feeMintAccess }),
    },
  });

  const {
    creatorFacet: governorCreatorFacet,
  } = await E(zoeWPurse).startInstance(
    contractGovernorInstall,
    undefined,
    governorTerms,
    harden({ electorateCreatorFacet }),
  );

  const treasuryInstance = await E(governorCreatorFacet).getInstance();
  const [
    ammInstance,
    invitationIssuer,
    {
      issuers: { Governance: govIssuer, RUN: centralIssuer },
      brands: { Governance: govBrand, RUN: centralBrand },
    },
    treasuryCreator,
  ] = await Promise.all([
    E(E(governorCreatorFacet).getCreatorFacet()).getAMM(),
    E(zoeWPurse).getInvitationIssuer(),
    E(zoeWPurse).getTerms(treasuryInstance),
    E(governorCreatorFacet).getCreatorFacet()
  ]);

  const treasuryUiDefaults = {
    CONTRACT_NAME: 'Treasury',
    AMM_NAME: 'autoswap',
    BRIDGE_URL: 'http://127.0.0.1:8000',
    // Avoid setting API_URL, so that the UI uses the same origin it came from,
    // if it has an api server.
    // API_URL: 'http://127.0.0.1:8000',
  };

  // Look up all the board IDs.
  const boardIdValue = [
    ['INSTANCE_BOARD_ID', treasuryInstance],
    ['INSTALLATION_BOARD_ID', stablecoinMachineInstall],
    ['RUN_ISSUER_BOARD_ID', centralIssuer],
    ['RUN_BRAND_BOARD_ID', centralBrand],
    ['AMM_INSTALLATION_BOARD_ID', autoswapInstall],
    ['LIQ_INSTALLATION_BOARD_ID', liquidationInstall],
    ['BINARY_COUNTER_INSTALLATION_BOARD_ID', binaryCounterInstall],
    ['COMMITTEE_INSTALLATION_BOARD_ID', committeeInstall],
    ['CONTRACT_GOVERNOR_INSTALLATION_BOARD_ID', contractGovernorInstall],
    ['AMM_INSTANCE_BOARD_ID', ammInstance],
    ['INVITE_BRAND_BOARD_ID', E(invitationIssuer).getBrand()],
  ];
  await Promise.all(
    boardIdValue.map(async ([key, valP]) => {
      const val = await valP;
      const boardId = await E(board).getId(val);
      treasuryUiDefaults[key] = boardId;
    }),
  );

  // Stash the defaults where the UI can find them.
  harden(treasuryUiDefaults);

  // Install the names in agoricNames.
  const nameAdminUpdates = [
    [uiConfigAdmin, treasuryUiDefaults.CONTRACT_NAME, treasuryUiDefaults],
    [instanceAdmin, treasuryUiDefaults.CONTRACT_NAME, treasuryInstance],
    [instanceAdmin, treasuryUiDefaults.AMM_NAME, ammInstance],
    [brandAdmin, 'TreasuryGovernance', govBrand],
    [issuerAdmin, 'TreasuryGovernance', govIssuer],
    [brandAdmin, centralName, centralBrand],
    [issuerAdmin, centralName, centralIssuer],
  ];
  await Promise.all(
    nameAdminUpdates.map(([nameAdmin, name, value]) =>
      E(nameAdmin).update(name, value),
    ),
  );

  const voteCreator = Far('treasury vote creator', {
    voteOnParamChange: E(governorCreatorFacet).voteOnParamChange,
  });

  return { treasuryCreator, voteCreator };
}
