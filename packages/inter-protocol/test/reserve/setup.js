import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { E } from '@endo/eventual-send';
import {
  makeAgoricNamesAccess,
  makePromiseSpace,
} from '@agoric/vats/src/core/utils.js';
import { makeBoard } from '@agoric/vats/src/lib-board.js';
import { setupReserve } from '../../src/proposals/econ-behaviors.js';

import {
  installPuppetGovernance,
  makeMockChainStorageRoot,
  provideBundle,
} from '../supports.js';
import { setUpZoeForTest } from '../psm/setupPsm.js';
import { startEconomicCommittee } from '../../src/proposals/startEconCommittee.js';

const reserveRoot = './src/reserve/assetReserve.js'; // package relative
const faucetRoot = './test/vaultFactory/faucet.js';

/**
 * @typedef {ReturnType<typeof setUpZoeForTest>} FarZoeKit
 */

/**
 * NOTE: called separately by each test so zoe/priceAuthority don't interfere
 *
 * @param {*} t
 * @param {ManualTimer | undefined} timer
 * @param {FarZoeKit} farZoeKit
 */
const setupReserveBootstrap = async (t, timer, farZoeKit) => {
  const space = /** @type {any} */ (makePromiseSpace());
  const { produce, consume } =
    /** @type { import('../../src/proposals/econ-behaviors.js').EconomyBootstrapPowers } */ (
      space
    );

  const { zoe, feeMintAccessP } = await E.get(farZoeKit);

  // @ts-expect-error could be undefined
  produce.chainTimerService.resolve(timer);
  produce.zoe.resolve(zoe);
  const { agoricNames, agoricNamesAdmin, spaces } = makeAgoricNamesAccess();
  produce.agoricNames.resolve(agoricNames);
  produce.agoricNamesAdmin.resolve(agoricNamesAdmin);
  produce.feeMintAccess.resolve(feeMintAccessP);

  installPuppetGovernance(zoe, spaces.installation.produce);
  const mockChainStorage = makeMockChainStorageRoot();
  produce.chainStorage.resolve(mockChainStorage);
  produce.board.resolve(makeBoard());

  return { produce, consume, ...spaces, mockChainStorage };
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

  // @ts-expect-error a non-promise can be used where a promise is expected.
  const spaces = await setupReserveBootstrap(t, timer, farZoeKit);
  startEconomicCommittee(spaces, {
    options: { econCommitteeOptions: electorateTerms },
  });

  const { produce, consume, brand, issuer, installation, instance } = spaces;
  const reserveBundle = await provideBundle(t, reserveRoot, 'reserve');
  installation.produce.reserve.resolve(E(zoe).install(reserveBundle));

  const istIssuer = await E(zoe).getFeeIssuer();
  const istBrand = await E(istIssuer).getBrand();

  brand.produce.IST.resolve(istBrand);
  issuer.produce.IST.resolve(istIssuer);

  await setupReserve(spaces);

  const faucetBundle = await provideBundle(t, faucetRoot, 'faucet');
  const faucetInstallation = E(zoe).install(faucetBundle);
  brand.produce.IST.resolve(runBrand);
  issuer.produce.IST.resolve(runIssuer);
  const feeMintAccess = await feeMintAccessP;
  produce.feeMintAccess.resolve(await feeMintAccess);

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
