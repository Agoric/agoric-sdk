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
 * @typedef {ReturnType<typeof setUpZoeForTest>} FarZoeKit
 */

/**
 * NOTE: called separately by each test so AMM/zoe/priceAuthority don't interfere
 *
 * @param {*} t
 * @param {ManualTimer | undefined} timer
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
  const { produce } =
    /** @type { import('../../src/proposals/econ-behaviors.js').EconomyBootstrapPowers } */ (
      ammSpaces.space
    );
  const zoe = await E.get(farZoeKit).zoe;

  // @ts-expect-error could be undefined
  produce.chainTimerService.resolve(timer);
  produce.zoe.resolve(zoe);

  const newAmm = {
    ammCreatorFacet: ammSpaces.amm.ammCreatorFacet,
    ammPublicFacet: ammSpaces.amm.ammPublicFacet,
    instance: ammSpaces.amm.instance,
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
 * @param {ManualTimer} [timer]
 */
export const setupReserveServices = async (
  t,
  electorateTerms,
  timer = buildManualTimer(t.log),
) => {
  const farZoeKit = await setUpZoeForTest();
  const { feeMintAccessP, zoe } = farZoeKit;

  const runIssuer = await E(zoe).getFeeIssuer();
  const runBrand = await E(runIssuer).getBrand();

  const spaces = await setupReserveBootstrap(
    t,
    timer,
    // @ts-expect-error confusion about awaited return types
    farZoeKit,
    runIssuer,
    electorateTerms,
  );
  const { produce, consume, brand, issuer, installation, instance } = spaces;

  const reserveBundle = await provideBundle(t, reserveRoot, 'reserve');
  installation.produce.reserve.resolve(E(zoe).install(reserveBundle));
  const faucetBundle = await provideBundle(t, faucetRoot, 'faucet');
  const faucetInstallation = E(zoe).install(faucetBundle);
  brand.produce.IST.resolve(runBrand);
  issuer.produce.IST.resolve(runIssuer);
  const feeMintAccess = await feeMintAccessP;
  produce.feeMintAccess.resolve(await feeMintAccess);

  /** @type {Promise<import('@agoric/governance/tools/puppetContractGovernor.js').PuppetContractGovernorKit<import('../../src/reserve/assetReserve.js').start>['creatorFacet']>} */
  // @ts-expect-error cast for testing env
  const governorCreatorFacet = E.get(consume.reserveKit).governorCreatorFacet;
  const governorInstance = await instance.consume.reserveGovernor;
  const governorPublicFacet = await E(zoe).getPublicFacet(governorInstance);
  const g = {
    governorInstance,
    governorPublicFacet,
    governorCreatorFacet,
  };
  const governedInstance = E(governorPublicFacet).getGovernedContract();

  const reservePublicFacet = await E(governorCreatorFacet).getPublicFacet();

  const reserve = {
    reserveCreatorFacet: await E.get(consume.reserveKit).creatorFacet,
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
