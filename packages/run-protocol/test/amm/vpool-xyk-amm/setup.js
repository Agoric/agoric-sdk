// @ts-check
import { E } from '@endo/eventual-send';
import { makeLoopback } from '@endo/captp';

import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';

import { makeZoeKit } from '@agoric/zoe';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import {
  makeAgoricNamesAccess,
  makePromiseSpace,
} from '@agoric/vats/src/core/utils.js';

import * as Collect from '../../../src/collect.js';
import {
  setupAmm,
  startEconomicCommittee,
} from '../../../src/proposals/econ-behaviors.js';
import { installGovernance, provideBundle } from '../../supports.js';

const ammRoot = './src/vpool-xyk-amm/multipoolMarketMaker.js'; // package relative

export const setUpZoeForTest = async () => {
  const { makeFar } = makeLoopback('zoeTest');

  const { zoeService, feeMintAccess: nonFarFeeMintAccess } = makeZoeKit(
    makeFakeVatAdmin(() => {}).admin,
  );
  /** @type {ERef<ZoeService>} */
  const zoe = makeFar(zoeService);
  const feeMintAccess = await makeFar(nonFarFeeMintAccess);
  return {
    zoe,
    feeMintAccess,
  };
};
harden(setUpZoeForTest);

export const setupAMMBootstrap = async (
  timer = buildManualTimer(console.log),
  zoe,
) => {
  if (!zoe) {
    ({ zoe } = await setUpZoeForTest());
  }

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

  return { produce, consume, ...spaces };
};

/**
 * NOTE: called separately by each test so AMM/zoe/priceAuthority don't interfere
 *
 * @param {*} t
 * @param {{ committeeName: string, committeeSize: number}} electorateTerms
 * @param {{ brand: Brand, issuer: Issuer }} centralR
 * @param {ManualTimer | undefined=} timer
 * @param {ERef<ZoeService> | undefined=} zoe
 */
export const setupAmmServices = async (
  t,
  electorateTerms = { committeeName: 'The Cabal', committeeSize: 1 },
  centralR,
  timer = buildManualTimer(console.log),
  zoe,
) => {
  if (!zoe) {
    ({ zoe } = await setUpZoeForTest());
  }
  const space = await setupAMMBootstrap(timer, zoe);
  const { consume, brand, issuer, installation, instance } = space;
  const ammBundle = await provideBundle(t, ammRoot, 'amm');
  installation.produce.amm.resolve(E(zoe).install(ammBundle));

  brand.produce.RUN.resolve(centralR.brand);
  issuer.produce.RUN.resolve(centralR.issuer);

  await Promise.all([
    startEconomicCommittee(space, {
      options: { econCommitteeOptions: electorateTerms },
    }),
    setupAmm(space),
  ]);

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
  // @ts-expect-error cast from unknown
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
  return {
    zoe,
    installs,
    electorate: installs.electorate,
    committeeCreator,
    electorateInstance,
    governor: g,
    amm,
    invitationAmount: poserInvitationAmount,
    space,
  };
};
harden(setupAmmServices);
