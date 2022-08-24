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
import { makeMockChainStorageRoot } from '@agoric/vats/tools/storage-test-utils.js';
import { makeIssuerKit } from '@agoric/ertp';

import { installGovernance, provideBundle } from '../supports.js';
import { startEconomicCommittee } from '../../src/proposals/econ-behaviors.js';
import { startPSM } from '../../src/proposals/startPSM.js';
import { allValues } from '../../src/collect.js';

const psmRoot = './src/psm/psm.js'; // package relative

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
 * @param {TimerService} timer
 * @param {FarZoeKit} [farZoeKit]
 */
export const setupPsmBootstrap = async (
  timer = buildManualTimer(console.log),
  farZoeKit,
) => {
  if (!farZoeKit) {
    farZoeKit = await setUpZoeForTest();
  }
  const { zoe } = farZoeKit;

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
  produce.chainStorage.resolve(makeMockChainStorageRoot());
  produce.board.resolve(makeBoard());

  return { produce, consume, ...spaces };
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
  if (!farZoeKit) {
    farZoeKit = await setUpZoeForTest();
  }

  const knutIssuer = makeIssuerKit('KNUT');
  const { feeMintAccess, zoe } = farZoeKit;
  const space = await setupPsmBootstrap(timer, farZoeKit);
  space.produce.zoe.resolve(farZoeKit.zoe);
  space.produce.feeMintAccess.resolve(feeMintAccess);
  const { consume, brand, issuer, installation, instance } = space;
  const psmBundle = await provideBundle(t, psmRoot, 'psm');
  installation.produce.psm.resolve(E(zoe).install(psmBundle));

  brand.produce.AUSD.resolve(knutIssuer.brand);
  issuer.produce.AUSD.resolve(knutIssuer.issuer);

  const istIssuer = await E(zoe).getFeeIssuer();
  const istBrand = await E(istIssuer).getBrand();

  brand.produce.IST.resolve(istBrand);
  issuer.produce.IST.resolve(istIssuer);

  await Promise.all([
    startEconomicCommittee(space, {
      options: { econCommitteeOptions: electorateTerms },
    }),
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
    governor: installation.consume.contractGovernor,
    electorate: installation.consume.committee,
    counter: installation.consume.binaryVoteCounter,
  });

  const governorCreatorFacet = consume.psmGovernorCreatorFacet;
  const governorInstance = await instance.consume.psmGovernor;
  const governorPublicFacet = await E(zoe).getPublicFacet(governorInstance);
  const g = {
    governorInstance,
    governorPublicFacet,
    governorCreatorFacet,
  };
  const governedInstance = E(governorPublicFacet).getGovernedContract();

  /** @type { GovernedPublicFacet<PSM> } */
  const psmPublicFacet = await E(governorCreatorFacet).getPublicFacet();
  const psm = {
    psmCreatorFacet: await consume.psmCreatorFacet,
    psmPublicFacet,
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
    psm,
    invitationAmount: poserInvitationAmount,
    mockChainStorage,
    space,
    knutIssuer,
  };
};
harden(setupPsm);
