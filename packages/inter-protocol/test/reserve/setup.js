import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { E } from '@endo/eventual-send';
import {
  setUpZoeForTest,
  setupAmmServices,
} from '../amm/vpool-xyk-amm/setup.js';
import { provideBundle } from '../supports.js';

const reserveRoot = './src/reserve/assetReserve.js'; // package relative
const faucetRoot = './test/vaultFactory/faucet.js';

/**
 * NOTE: called separately by each test so AMM/zoe/priceAuthority don't interfere
 *
 * @param {*} t
 * @param {ManualTimer | undefined=} timer
 * @param {FarZoeKit} farZoeKit
 * @param {Issuer} runIssuer
 * @param {{ committeeName: string, committeeSize: number}} electorateTerms
 */
const setupReserveBootstrap = async (
  t,
  timer,
  farZoeKit,
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
    farZoeKit,
  );
  const { produce } = /** @type { EconomyBootstrapPowers } */ (ammSpaces.space);
  const zoe = await farZoeKit.zoe;

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
 * reserveCreatorFacet: import('../../src/reserve/assetReserve').AssetReserveLimitedCreatorFacet,
 * reservePublicFacet: import('../../src/reserve/assetReserve').AssetReservePublicFacet,
 * instance: Instance,
 * }} ReserveKit
 */

/**
 * NOTE: called separately by each test so contracts don't interfere
 *
 * @param {import("ava").ExecutionContext<unknown>} t
 * @param {{ committeeName: string, committeeSize: number}} electorateTerms
 * @param {ManualTimer | undefined=} timer
 */
export const setupReserveServices = async (
  t,
  electorateTerms,
  timer = buildManualTimer(t.log),
) => {
  const farZoeKit = await setUpZoeForTest();
  const { feeMintAccess, zoe } = farZoeKit;

  const runIssuer = await E(zoe).getFeeIssuer();
  const runBrand = await E(runIssuer).getBrand();

  const spaces = await setupReserveBootstrap(
    t,
    timer,
    farZoeKit,
    runIssuer,
    electorateTerms,
  );
  const { produce, consume, brand, issuer, installation, instance } = spaces;

  const reserveBundle = await provideBundle(t, reserveRoot, 'reserve');
  installation.produce.reserve.resolve(E(zoe).install(reserveBundle));
  const faucetBundle = await provideBundle(t, faucetRoot, 'faucet');
  const faucetInstallation = E(zoe).install(faucetBundle);
  brand.produce.RUN.resolve(runBrand);
  issuer.produce.RUN.resolve(runIssuer);
  produce.feeMintAccess.resolve(await feeMintAccess);

  const governorCreatorFacet = consume.reserveGovernorCreatorFacet;
  const governorInstance = await instance.consume.reserveGovernor;
  const governorPublicFacet = await E(zoe).getPublicFacet(governorInstance);
  const g = {
    governorInstance,
    governorPublicFacet,
    governorCreatorFacet,
  };
  const governedInstance = E(governorPublicFacet).getGovernedContract();

  /** @type { AssetReservePublicFacet } */
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
    faucetInstallation,
  };
};
harden(setupReserveServices);
