import { makeLoopback } from '@endo/captp';
import { E } from '@endo/eventual-send';

import { allValues, makeTracer } from '@agoric/internal';
import {
  makeAgoricNamesAccess,
  makePromiseSpace,
} from '@agoric/vats/src/core/utils.js';
import { makeBoard } from '@agoric/vats/src/lib-board.js';
import { Stable } from '@agoric/vats/src/tokens.js';
import { makeZoeKit } from '@agoric/zoe';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';

import {
  setupAmm,
  setupReserve,
} from '../../../src/proposals/econ-behaviors.js';
import { startEconomicCommittee } from '../../../src/proposals/startEconCommittee.js';
import {
  installPuppetGovernance,
  makeMockChainStorageRoot,
  provideBundle,
} from '../../supports.js';

const ammRoot = './src/vpool-xyk-amm/multipoolMarketMaker.js'; // package relative
const reserveRoot = './src/reserve/assetReserve.js'; // package relative

const trace = makeTracer('AmmTS', false);

export const setUpZoeForTest = async () => {
  const { makeFar } = makeLoopback('zoeTest');

  const { zoeService, feeMintAccess } = await makeFar(
    makeZoeKit(makeFakeVatAdmin(() => {}).admin, undefined, {
      name: Stable.symbol,
      assetKind: Stable.assetKind,
      displayInfo: Stable.displayInfo,
    }),
  );

  return {
    zoe: zoeService,
    feeMintAccessP: feeMintAccess,
  };
};
harden(setUpZoeForTest);
/** @typedef {Awaited<ReturnType<typeof setUpZoeForTest>>} FarZoeKit */

/**
 *
 * @param {import('@agoric/time/src/types').TimerService} timer
 * @param {ERef<FarZoeKit>} [farZoeKit]
 */
export const setupAMMBootstrap = async (
  timer = buildManualTimer(console.log),
  farZoeKit,
) => {
  if (!farZoeKit) {
    farZoeKit = setUpZoeForTest();
  }
  trace('setupAMMBootstrap');
  const { zoe } = await farZoeKit;

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

  installPuppetGovernance(zoe, spaces.installation.produce);
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
 * @param {ManualTimer} [timer]
 * @param {ERef<FarZoeKit>} [farZoeKit]
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
  const { feeMintAccessP, zoe } = await farZoeKit;
  const feeMintAccess = await feeMintAccessP;
  trace('setupAMMBootstrap');
  const space = await setupAMMBootstrap(timer, farZoeKit);
  space.produce.zoe.resolve(zoe);
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

  const installs = await allValues({
    amm: installation.consume.amm,
    governor: installation.consume.contractGovernor,
    electorate: installation.consume.committee,
    counter: installation.consume.binaryVoteCounter,
  });

  /** @type {Promise<import('@agoric/governance/tools/puppetContractGovernor.js').PuppetContractGovernorKit<import('../../../src/vpool-xyk-amm/multipoolMarketMaker.js').start>['creatorFacet']>} */
  // @ts-expect-error cast for testing env
  const governorCreatorFacet = E.get(consume.ammKit).governorCreatorFacet;
  const governorInstance = await instance.consume.ammGovernor;
  const governorPublicFacet = await E(zoe).getPublicFacet(governorInstance);
  const g = {
    governorInstance,
    governorPublicFacet,
    governorCreatorFacet,
  };
  const governedInstance = E(governorPublicFacet).getGovernedContract();

  const ammPublicFacet = await E(governorCreatorFacet).getPublicFacet();
  const amm = {
    ammCreatorFacet: await E.get(consume.ammKit).creatorFacet,
    ammPublicFacet,
    instance: governedInstance,
  };

  const committeeCreator = await consume.economicCommitteeCreatorFacet;
  const electorateInstance = await instance.consume.economicCommittee;

  const poserInvitationP = E(committeeCreator).getPoserInvitation();
  const poserInvitationAmount = await E(
    E(zoe).getInvitationIssuer(),
  ).getAmountOf(poserInvitationP);

  /** @type {import('@agoric/internal/src/storage-test-utils.js').MockChainStorageRoot} */
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
