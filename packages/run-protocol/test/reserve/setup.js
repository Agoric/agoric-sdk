import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { E } from '@endo/eventual-send';
import {
  makeBundle,
  setUpZoeForTest,
  setupAmmServices,
} from '../amm/vpool-xyk-amm/setup.js';
import * as Collect from '../../src/collect.js';
import { setupReserve } from '../../src/econ-behaviors.js';

const contractGovernorRoot = '@agoric/governance/src/contractGovernor.js';
const committeeRoot = '@agoric/governance/src/committee.js';
const voteCounterRoot = '@agoric/governance/src/binaryVoteCounter.js';
const reserveRoot = '../../../src/reserve/collateralReserve.js';

const contractGovernorBundleP = makeBundle(contractGovernorRoot);
const committeeBundleP = makeBundle(committeeRoot);
const voteCounterBundleP = makeBundle(voteCounterRoot);
const reserveBundleP = makeBundle(reserveRoot);

const setupReserveBootstrap = async (
  timer,
  zoe,
  runIssuer,
  electorateTerms,
) => {
  const runBrand = await E(runIssuer).getBrand();
  const centralR = { issuer: runIssuer, brand: runBrand };

  const ammSpaces = await setupAmmServices(
    electorateTerms,
    centralR,
    timer,
    zoe,
  );
  const { produce } = /** @type { EconomyBootstrapPowers } */ (ammSpaces.space);

  produce.chainTimerService.resolve(timer);
  produce.zoe.resolve(zoe);

  /** @type {Record<string, Promise<{moduleFormat: string}>>} */
  const governanceBundlePs = {
    contractGovernor: contractGovernorBundleP,
    committee: committeeBundleP,
    binaryVoteCounter: voteCounterBundleP,
  };
  const bundles = await Collect.allValues(governanceBundlePs);
  produce.governanceBundles.resolve(bundles);

  const newAmm = {
    ammCreatorFacet: ammSpaces.amm.ammCreatorFacet,
    ammPublicFacet: ammSpaces.amm.ammPublicFacet,
    instance: ammSpaces.amm.governedInstance,
  };

  return {
    amm: newAmm,
    ...ammSpaces.space,
  };
};

/**
 * @typedef {{
 * reserveCreatorFacet: import('../../src/reserve/collateralReserve').CollateralReserveCreatorFacet,
 * reservePublicFacet: import('../../src/reserve/collateralReserve').CollateralReservePublicFacet,
 * instance: Instance,
 * }} ReserveKit
 */

/**
 * NOTE: called separately by each test so contracts don't interfere
 *
 * @param {{ committeeName: string, committeeSize: number}} electorateTerms
 * @param {ManualTimer | undefined=} timer
 * @returns {{
 *     zoe: ZoeService,
 *     feeMintAccess: FeeMintAccess,
 *     installation: Installation,
 *     committeeCreator: ElectorateCreatorFacet,
 *     electorateInstance: Instance,
 *     governor: any,
 *     reserve: ReserveKit,
 *     invitationAmount: Amount,
 *     space: any,
 * }}
 */
export const setupReserveServices = async (
  electorateTerms,
  timer = buildManualTimer(console.log),
) => {
  const { zoe, feeMintAccess } = await setUpZoeForTest();

  const runIssuer = await E(zoe).getFeeIssuer();
  const runBrand = await E(runIssuer).getBrand();

  // XS doesn't like top-level await, so do it here. this should be quick
  const reserveBundle = await reserveBundleP;
  const spaces = await setupReserveBootstrap(
    timer,
    zoe,
    runIssuer,
    electorateTerms,
  );
  const { produce, consume, brand, issuer, installation, instance } = spaces;

  produce.reserveBundle.resolve(reserveBundle);
  brand.produce.RUN.resolve(runBrand);
  issuer.produce.RUN.resolve(runIssuer);
  produce.feeMintAccess.resolve(feeMintAccess);

  await setupReserve(spaces);

  const governorCreatorFacet = consume.reserveGovernorCreatorFacet;
  const governorInstance = await instance.consume.reserveGovernor;
  const governorPublicFacet = await E(zoe).getPublicFacet(governorInstance);
  const g = {
    governorInstance,
    governorPublicFacet,
    governorCreatorFacet,
  };
  const governedInstance = E(governorPublicFacet).getGovernedContract();

  /** @type { GovernedPublicFacet } */
  const reservePublicFacet = await E(governorCreatorFacet).getPublicFacet();

  /** @type {ReserveKit} */
  const reserve = {
    reserveCreatorFacet: await consume.reserveCreatorFacet,
    reservePublicFacet,
    instance: governedInstance,
  };

  const committeeCreator = await consume.economicCommitteeCreatorFacet;
  const electorateInstance = await instance.consume.economicCommittee;

  const poserInvitationP = E(committeeCreator).getPoserInvitation();
  const poserInvitationAmount = await E(
    E(zoe).getInvitationIssuer(),
  ).getAmountOf(poserInvitationP);

  return {
    zoe,
    feeMintAccess,
    installation,
    committeeCreator,
    electorateInstance,
    governor: g,
    reserve,
    invitationAmount: poserInvitationAmount,
    space: spaces,
  };
};
harden(setupReserveServices);
