import { Far, makeLoopback } from '@endo/captp';
import { E } from '@endo/eventual-send';

import {
  makeAgoricNamesAccess,
  makePromiseSpace,
} from '@agoric/vats/src/core/utils.js';
import { makeBoard } from '@agoric/vats/src/lib-board.js';
import { Stable } from '@agoric/vats/src/tokens.js';
import { makeScalarMapStore } from '@agoric/vat-data';
import { makeZoeKit } from '@agoric/zoe';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { makeMockChainStorageRoot } from '@agoric/vats/tools/storage-test-utils.js';
import { makeIssuerKit } from '@agoric/ertp';

import {
  installGovernance,
  provideBundle,
  withAmountUtils,
} from '../supports.js';
import { startEconomicCommittee } from '../../src/proposals/startEconCommittee.js';
import { startPSM, startPSMCharter } from '../../src/proposals/startPSM.js';
import { allValues } from '../../src/collect.js';

const psmRoot = './src/psm/psm.js'; // package relative
const charterRoot = './src/econCommitteeCharter.js'; // package relative

export const setUpZoeForTest = async () => {
  const { makeFar } = makeLoopback('zoeTest');
  const { zoeService, feeMintAccessRetriever } = await makeFar(
    makeZoeKit(makeFakeVatAdmin(() => {}).admin, undefined, {
      name: Stable.symbol,
      assetKind: Stable.assetKind,
      displayInfo: Stable.displayInfo,
    }),
  );

  return {
    zoe: zoeService,
    feeMintAccessP: E(feeMintAccessRetriever).get(),
  };
};
harden(setUpZoeForTest);
/**
 * @typedef {ReturnType<typeof setUpZoeForTest>} FarZoeKit
 */

/**
 * @param {TimerService} timer
 * @param {FarZoeKit} [farZoeKit]
 */
export const setupPsmBootstrap = async (
  timer = buildManualTimer(console.log),
  farZoeKit,
) => {
  const { zoe } = await (farZoeKit || setUpZoeForTest());

  const space = /** @type {any} */ (makePromiseSpace());
  const { produce, consume } =
    /** @type { import('../../src/proposals/econ-behaviors.js').EconomyBootstrapPowers } */ (
      space
    );

  produce.chainTimerService.resolve(timer);
  produce.zoe.resolve(zoe);

  const { agoricNames, agoricNamesAdmin, spaces } = makeAgoricNamesAccess();
  produce.agoricNames.resolve(agoricNames);
  produce.agoricNamesAdmin.resolve(agoricNamesAdmin);

  installGovernance(zoe, spaces.installation.produce);
  const mockChainStorage = makeMockChainStorageRoot();
  produce.chainStorage.resolve(mockChainStorage);
  produce.board.resolve(makeBoard());

  return { produce, consume, ...spaces, mockChainStorage };
};

/**
 * @param {*} t
 * @param {{ committeeName: string, committeeSize: number}} electorateTerms
 * @param {ManualTimer | undefined=} timer
 * @param {FarZoeKit} [farZoeKit]
 */
export const setupPsm = async (
  t,
  electorateTerms = { committeeName: 'The Cabal', committeeSize: 1 },
  timer = buildManualTimer(t.log),
  farZoeKit,
) => {
  const knut = withAmountUtils(makeIssuerKit('KNUT'));

  const { feeMintAccessP, zoe } = await (farZoeKit || setUpZoeForTest());
  const space = await setupPsmBootstrap(timer, farZoeKit);
  const feeMintAccess = await feeMintAccessP;
  space.produce.feeMintAccess.resolve(feeMintAccess);
  const { consume, brand, issuer, installation, instance } = space;
  const psmBundle = await provideBundle(t, psmRoot, 'psm');
  installation.produce.psm.resolve(E(zoe).install(psmBundle));
  const charterBundle = await provideBundle(
    t,
    charterRoot,
    'econCommitteeCharter',
  );
  installation.produce.econCommitteeCharter.resolve(
    E(zoe).install(charterBundle),
  );

  brand.produce.AUSD.resolve(knut.brand);
  issuer.produce.AUSD.resolve(knut.issuer);

  space.produce.psmFacets.resolve(makeScalarMapStore());
  const istIssuer = await E(zoe).getFeeIssuer();
  const istBrand = await E(istIssuer).getBrand();

  brand.produce.IST.resolve(istBrand);
  issuer.produce.IST.resolve(istIssuer);

  space.produce.provisionPoolStartResult.resolve({
    creatorFacet: Far('dummy', {
      initPSM: () => {
        t.log('dummy provisionPool.initPSM');
      },
    }),
  });

  await Promise.all([
    startEconomicCommittee(space, {
      options: { econCommitteeOptions: electorateTerms },
    }),
    startPSMCharter(space),
    startPSM(space, {
      options: {
        anchorOptions: {
          denom: 'AUSD',
          decimalPlaces: 6,
          keyword: 'AUSD',
          proposedName: 'AUSD',
        },
      },
    }),
  ]);

  const installs = await allValues({
    psm: installation.consume.psm,
    econCommitteeCharter: installation.consume.econCommitteeCharter,
    governor: installation.consume.contractGovernor,
    electorate: installation.consume.committee,
    counter: installation.consume.binaryVoteCounter,
  });

  const allPsms = await consume.psmFacets;
  const psmFacets = allPsms.get(knut.brand);
  const governorCreatorFacet = psmFacets.psmGovernorCreatorFacet;
  const governorInstance = psmFacets.psmGovernor;
  const governorPublicFacet = await E(zoe).getPublicFacet(governorInstance);
  const g = {
    governorInstance,
    governorPublicFacet,
    governorCreatorFacet,
  };
  const governedInstance = E(governorPublicFacet).getGovernedContract();

  /** @type { GovernedPublicFacet<import('../../src/psm/psm.js').PsmPublicFacet> } */
  const psmPublicFacet = await E(governorCreatorFacet).getPublicFacet();
  const psm = {
    psmCreatorFacet: psmFacets.psmCreatorFacet,
    psmPublicFacet,
    instance: governedInstance,
  };

  const committeeCreator = await consume.economicCommitteeCreatorFacet;
  const electorateInstance = await instance.consume.economicCommittee;
  const { creatorFacet: econCharterCreatorFacet } =
    await consume.econCharterStartResult;

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
    psm,
    econCharterCreatorFacet,
    invitationAmount: poserInvitationAmount,
    mockChainStorage: space.mockChainStorage,
    space,
    knut,
  };
};
harden(setupPsm);
