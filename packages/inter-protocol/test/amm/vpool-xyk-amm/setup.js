// @ts-check
import { makeLoopback } from '@endo/captp';
import { E } from '@endo/eventual-send';

import {
  makeAgoricNamesAccess,
  makePromiseSpace,
} from '@agoric/vats/src/core/utils.js';
import { makeBoard } from '@agoric/vats/src/lib-board.js';
import { Stable } from '@agoric/vats/src/tokens.js';
import { makeZoeKit } from '@agoric/zoe';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';

import * as Collect from '../../../src/collect.js';
import { makeTracer } from '../../../src/makeTracer.js';
import {
  setupAmm,
  setupReserve,
  startEconomicCommittee,
} from '../../../src/proposals/econ-behaviors.js';
import {
  installGovernance,
  makeMockChainStorageRoot,
  provideBundle,
} from '../../supports.js';

const ammRoot = './src/vpool-xyk-amm/multipoolMarketMaker.js'; // package relative
const reserveRoot = './src/reserve/assetReserve.js'; // package relative

const trace = makeTracer('AmmTS', false);

export const setUpZoeForTest = () => {
  const { makeFar } = makeLoopback('zoeTest');

  const { zoeService, feeMintAccess: nonFarFeeMintAccess } = makeZoeKit(
    makeFakeVatAdmin(() => {}).admin,
    undefined,
    {
      name: Stable.symbol,
      assetKind: Stable.assetKind,
      displayInfo: Stable.displayInfo,
    },
  );
  /** @type {ERef<ZoeService>} */
  const zoe = makeFar(zoeService);
  const feeMintAccess = makeFar(nonFarFeeMintAccess);
  return {
    zoe,
    feeMintAccess,
  };
};
harden(setUpZoeForTest);
/**
 * @typedef {ReturnType<typeof setUpZoeForTest>} FarZoeKit
 */

/**
 *
 * @param {TimerService} timer
 * @param {FarZoeKit} [farZoeKit]
 */
export const setupAMMBootstrap = async (
  timer = buildManualTimer(console.log),
  farZoeKit,
) => {
  if (!farZoeKit) {
    farZoeKit = await setUpZoeForTest();
  }
  trace('setupAMMBootstrap');
  const { zoe } = farZoeKit;

  const space = /** @type {any} */ (makePromiseSpace());
  const { produce, consume } =
    /** @type { import('../../../src/proposals/econ-behaviors.js').EconomyBootstrapPowers } */ (
      space
    );

  produce.chainTimerService.resolve(timer);
  produce.zoe.resolve(zoe);

  const { agoricNames, agoricNamesAdmin, spaces } = makeAgoricNamesAccess();
  produce.agoricNames.resolve(agoricNames);
  produce.agoricNamesAdmin.resolve(agoricNamesAdmin);

  installGovernance(zoe, spaces.installation.produce);
  produce.chainStorage.resolve(makeMockChainStorageRoot());
  produce.board.resolve(makeBoard());

  return { produce, consume, ...spaces };
};

/**
 * NOTE: called separately by each test so AMM/zoe/priceAuthority don't interfere
 *
 * @param {*} t
 * @param {{ committeeName: string, committeeSize: number}} electorateTerms
 * @param {{ brand: Brand, issuer: Issuer }} centralR
 * @param {ManualTimer | undefined=} timer
 * @param {FarZoeKit} [farZoeKit]
 */
export const setupAmmServices = async (
  t,
  electorateTerms = { committeeName: 'The Cabal', committeeSize: 1 },
  centralR,
  timer = buildManualTimer(t.log),
  farZoeKit,
) => {
  trace('setupAmmServices', { farZoeKit });
  if (!farZoeKit) {
    farZoeKit = await setUpZoeForTest();
  }
  const { feeMintAccess, zoe } = farZoeKit;
  trace('setupAMMBootstrap');
  const space = await setupAMMBootstrap(timer, farZoeKit);
  space.produce.zoe.resolve(farZoeKit.zoe);
  space.produce.feeMintAccess.resolve(feeMintAccess);
  const { consume, brand, issuer, installation, instance } = space;
  const ammBundle = await provideBundle(t, ammRoot, 'amm');
  installation.produce.amm.resolve(E(zoe).install(ammBundle));
  const reserveBundle = await provideBundle(t, reserveRoot, 'reserve');
  installation.produce.reserve.resolve(E(zoe).install(reserveBundle));

  brand.produce.IST.resolve(centralR.brand);
  issuer.produce.IST.resolve(centralR.issuer);

  await Promise.all([
    startEconomicCommittee(space, {
      options: { econCommitteeOptions: electorateTerms },
    }),
    setupAmm(space, {
      options: {
        minInitialPoolLiquidity: 1000n,
      },
    }),
  ]);
  await setupReserve(space);

  const installs = await Collect.allValues({
    amm: installation.consume.amm,
    governor: installation.consume.contractGovernor,
    electorate: installation.consume.committee,
    counter: installation.consume.binaryVoteCounter,
  });

  const governorCreatorFacet = consume.ammGovernorCreatorFacet;
  const governorInstance = await instance.consume.ammGovernor;
  const governorPublicFacet = await E(zoe).getPublicFacet(governorInstance);
  const g = {
    governorInstance,
    governorPublicFacet,
    governorCreatorFacet,
  };
  const governedInstance = E(governorPublicFacet).getGovernedContract();

  /** @type { GovernedPublicFacet<XYKAMMPublicFacet> } */
  const ammPublicFacet = await E(governorCreatorFacet).getPublicFacet();
  const amm = {
    ammCreatorFacet: await consume.ammCreatorFacet,
    ammPublicFacet,
    instance: governedInstance,
  };

  const committeeCreator = await consume.economicCommitteeCreatorFacet;
  const electorateInstance = await instance.consume.economicCommittee;

  const poserInvitationP = E(committeeCreator).getPoserInvitation();
  const poserInvitationAmount = await E(
    E(zoe).getInvitationIssuer(),
  ).getAmountOf(poserInvitationP);

  /** @type {import('@agoric/vats/tools/storage-test-utils.js').MockChainStorageRoot} */
  // @ts-expect-error cast
  const mockChainStorage = await space.consume.chainStorage;

  return {
    zoe,
    installs,
    electorate: installs.electorate,
    committeeCreator,
    electorateInstance,
    governor: g,
    amm,
    invitationAmount: poserInvitationAmount,
    mockChainStorage,
    space,
  };
};
harden(setupAmmServices);
