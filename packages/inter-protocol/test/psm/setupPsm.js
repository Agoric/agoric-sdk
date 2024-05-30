import { Far } from '@endo/captp';
import { E } from '@endo/eventual-send';

import { makeAgoricNamesAccess, makePromiseSpace } from '@agoric/vats';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { makeScalarMapStore } from '@agoric/vat-data';
import { buildZoeManualTimer } from '@agoric/zoe/tools/manualTimer.js';
import { allValues } from '@agoric/internal';
import { makeMockChainStorageRoot } from '@agoric/internal/src/storage-test-utils.js';
import { makeIssuerKit } from '@agoric/ertp';

import { produceDiagnostics } from '@agoric/vats/src/core/basic-behaviors.js';
import {
  installGovernance,
  provideBundle,
  withAmountUtils,
} from '../supports.js';
import { startEconomicCommittee } from '../../src/proposals/startEconCommittee.js';
import { startPSM, startEconCharter } from '../../src/proposals/startPSM.js';

const psmRoot = './src/psm/psm.js'; // package relative
const charterRoot = './src/econCommitteeCharter.js'; // package relative

/** @import {ZoeManualTimer} from '@agoric/zoe/tools/manualTimer.js'; */

/** @typedef {ReturnType<typeof setUpZoeForTest>} FarZoeKit */

/**
 * @param {import('@agoric/time').TimerService} timer
 * @param {FarZoeKit} [farZoeKit]
 */
export const setupPsmBootstrap = async (
  timer = buildZoeManualTimer(console.log),
  farZoeKit,
) => {
  const { zoe: wrappedZoe, feeMintAccessP } = await (farZoeKit ||
    setUpZoeForTest());

  const space = /** @type {any} */ (makePromiseSpace());
  const { produce, consume } =
    /** @type {import('../../src/proposals/econ-behaviors.js').EconomyBootstrapPowers} */ (
      space
    );

  produce.chainTimerService.resolve(timer);
  produce.zoe.resolve(wrappedZoe);
  /** @type {Promise<ZoeService>} */
  const zoe = space.consume.zoe;
  produce.feeMintAccess.resolve(feeMintAccessP);

  const { agoricNames, agoricNamesAdmin, spaces } =
    await makeAgoricNamesAccess();
  produce.agoricNames.resolve(agoricNames);
  produce.agoricNamesAdmin.resolve(agoricNamesAdmin);

  installGovernance(zoe, spaces.installation.produce);
  const mockChainStorage = makeMockChainStorageRoot();
  produce.chainStorage.resolve(mockChainStorage);
  produce.board.resolve(makeFakeBoard());

  return { vatParameters: {}, produce, consume, ...spaces, mockChainStorage };
};

/**
 * @param {any} t
 * @param {{ committeeName: string; committeeSize: number }} electorateTerms
 * @param {ZoeManualTimer} [timer]
 * @param {FarZoeKit} [farZoeKit]
 */
export const setupPsm = async (
  t,
  electorateTerms = { committeeName: 'The Cabal', committeeSize: 1 },
  timer = buildZoeManualTimer(t.log),
  farZoeKit,
) => {
  const knut = withAmountUtils(makeIssuerKit('KNUT'));

  const space = await setupPsmBootstrap(timer, farZoeKit);
  const zoe = space.consume.zoe;
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

  space.produce.psmKit.resolve(makeScalarMapStore());
  const istIssuer = await E(zoe).getFeeIssuer();
  const istBrand = await E(istIssuer).getBrand();

  brand.produce.IST.resolve(istBrand);
  issuer.produce.IST.resolve(istIssuer);

  space.produce.provisionPoolStartResult.resolve({
    // @ts-expect-error mock
    creatorFacet: Far('dummy', {
      initPSM: () => {
        t.log('dummy provisionPool.initPSM');
      },
    }),
  });

  await Promise.all([
    produceDiagnostics(space),
    startEconomicCommittee(space, {
      options: { econCommitteeOptions: electorateTerms },
    }),
    startEconCharter(space),
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

  const allPsms = await consume.psmKit;
  const psmKit = allPsms.get(knut.brand);
  const governorCreatorFacet = psmKit.psmGovernorCreatorFacet;
  const governorInstance = psmKit.psmGovernor;
  const governorPublicFacet = await E(zoe).getPublicFacet(governorInstance);
  const g = {
    governorInstance,
    governorPublicFacet,
    governorCreatorFacet,
  };
  const governedInstance = E(governorPublicFacet).getGovernedContract();

  const psmPublicFacet = await E(governorCreatorFacet).getPublicFacet();
  const psm = {
    psmCreatorFacet: psmKit.psmCreatorFacet,
    psmPublicFacet,
    instance: governedInstance,
  };

  const committeeCreator = await consume.economicCommitteeCreatorFacet;
  const electorateInstance = await instance.consume.economicCommittee;
  const { creatorFacet: econCharterCreatorFacet } = await E.get(
    consume.econCharterKit,
  );

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
