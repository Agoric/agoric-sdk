import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { E } from '@endo/eventual-send';
import {
  setUpZoeForTest,
  setupAmmServices,
} from '../amm/vpool-xyk-amm/setup.js';
import { setupReserve } from '../../src/econ-behaviors.js';
import { provideBundle } from '../supports.js';

const reserveRoot = './src/reserve/assetReserve.js'; // package relative

const setupReserveBootstrap = async (
  t,
  timer,
  zoe,
  runIssuer,
  electorateTerms,
) => {
  const runBrand = await E(runIssuer).getBrand();
  const centralR = { issuer: runIssuer, brand: runBrand };

  const ammSpaces = await setupAmmServices(
    t,
    electorateTerms,
    centralR,
    timer,
    zoe,
  );
  const { produce } = /** @type { EconomyBootstrapPowers } */ (ammSpaces.space);

  produce.chainTimerService.resolve(timer);
  produce.zoe.resolve(zoe);

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
 * reserveCreatorFacet: import('../../src/reserve/assetReserve').AssetReserveCreatorFacet,
 * reservePublicFacet: import('../../src/reserve/assetReserve').AssetReservePublicFacet,
 * instance: Instance,
 * }} ReserveKit
 */

/**
 * NOTE: called separately by each test so contracts don't interfere
 *
 * @param {*} t
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
  t,
  electorateTerms,
  timer = buildManualTimer(console.log),
) => {
  const { zoe, feeMintAccess } = await setUpZoeForTest();

  const runIssuer = await E(zoe).getFeeIssuer();
  const runBrand = await E(runIssuer).getBrand();

  const spaces = await setupReserveBootstrap(
    t,
    timer,
    zoe,
    runIssuer,
    electorateTerms,
  );
  const { produce, consume, brand, issuer, installation, instance } = spaces;

  const reserveBundle = await provideBundle(t, reserveRoot, 'reserve');
  installation.produce.reserve.resolve(E(zoe).install(reserveBundle));
  brand.produce.IST.resolve(runBrand);
  issuer.produce.IST.resolve(runIssuer);
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
