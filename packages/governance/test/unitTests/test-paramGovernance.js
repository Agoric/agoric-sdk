// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import '@agoric/zoe/exported.js';

import { makeZoeKit } from '@agoric/zoe';
import bundleSource from '@endo/bundle-source';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { E } from '@agoric/eventual-send';
import { makeLoopback } from '@endo/captp';

import { resolve as importMetaResolve } from 'import-meta-resolve';
import { MALLEABLE_NUMBER } from '../swingsetTests/contractGovernor/governedContract.js';
import {
  CONTRACT_ELECTORATE,
  makeGovernedNat,
  makeGovernedInvitation,
} from '../../src/index.js';

const voteCounterRoot = '../../src/binaryVoteCounter.js';
const governedRoot = '../swingsetTests/contractGovernor/governedContract.js';
const contractGovernorRoot = '../../src/contractGovernor.js';
const committeeRoot = '../../src/committee.js';

const makeBundle = async sourceRoot => {
  const url = await importMetaResolve(sourceRoot, import.meta.url);
  const path = new URL(url).pathname;
  const contractBundle = await bundleSource(path);
  return contractBundle;
};

// makeBundle is a slow step, so we do it once for all the tests.
const contractGovernorBundleP = makeBundle(contractGovernorRoot);
const committeeBundleP = makeBundle(committeeRoot);
const voteCounterBundleP = makeBundle(voteCounterRoot);
const governedBundleP = makeBundle(governedRoot);

const setUpZoeForTest = async setJig => {
  const { makeFar } = makeLoopback('zoeTest');

  /**
   * These properties will be assigned by `setJig` in the contract.
   *
   * @typedef {Object} TestContext
   * @property {ContractFacet} zcf
   * @property {IssuerRecord} runIssuerRecord
   * @property {IssuerRecord} govIssuerRecord
   */

  const { zoeService, feeMintAccess: nonFarFeeMintAccess } = makeZoeKit(
    makeFakeVatAdmin(setJig, o => makeFar(o)).admin,
  );
  /** @type {ERef<ZoeService>} */
  const zoe = makeFar(zoeService);
  const feeMintAccess = await makeFar(nonFarFeeMintAccess);
  return {
    zoe,
    feeMintAccess,
  };
};

const installBundle = (zoe, contractBundle) => E(zoe).install(contractBundle);

const setUpGovernedContract = async (zoe, electorateTerms, timer) => {
  const [
    contractGovernorBundle,
    committeeBundle,
    voteCounterBundle,
    governedBundle,
  ] = await Promise.all([
    contractGovernorBundleP,
    committeeBundleP,
    voteCounterBundleP,
    governedBundleP,
  ]);

  const [governor, electorate, counter, governed] = await Promise.all([
    installBundle(zoe, contractGovernorBundle),
    installBundle(zoe, committeeBundle),
    installBundle(zoe, voteCounterBundle),
    installBundle(zoe, governedBundle),
  ]);
  const installs = { governor, electorate, counter, governed };

  const {
    creatorFacet: committeeCreator,
    instance: electorateInstance,
  } = await E(zoe).startInstance(electorate, harden({}), electorateTerms);

  // TODO (cth)   three awaits?

  const poserInvitation = await E(committeeCreator).getPoserInvitation();
  const invitationAmount = await E(E(zoe).getInvitationIssuer()).getAmountOf(
    poserInvitation,
  );

  const governedTerms = {
    main: {
      [MALLEABLE_NUMBER]: makeGovernedNat(602214090000000000000000n),
      [CONTRACT_ELECTORATE]: makeGovernedInvitation(invitationAmount),
    },
  };
  const governorTerms = {
    timer,
    electorateInstance,
    governedContractInstallation: governed,
    governed: {
      terms: governedTerms,
      issuerKeywordRecord: {},
      privateArgs: { initialPoserInvitation: poserInvitation },
    },
  };

  const governorFacets = await E(zoe).startInstance(
    governor,
    {},
    governorTerms,
  );

  return { governorFacets, installs, invitationAmount };
};

test('governParam no votes', async t => {
  const { zoe } = await setUpZoeForTest(() => {});
  const timer = buildManualTimer(console.log);
  const {
    governorFacets,
    installs,
    invitationAmount,
  } = await setUpGovernedContract(
    zoe,
    { committeeName: 'Demos', committeeSize: 1 },
    timer,
  );

  const paramSpec = { key: 'contractParams', parameterName: MALLEABLE_NUMBER };

  const { outcomeOfUpdate } = await E(
    governorFacets.creatorFacet,
  ).voteOnParamChange(paramSpec, 25n, installs.counter, 2n);

  await E(timer).tick();
  await E(timer).tick();

  await E.when(outcomeOfUpdate, outcome => t.fail(`${outcome}`)).catch(e =>
    t.is(e, 'No quorum'),
  );

  t.deepEqual(
    await E(
      E(governorFacets.creatorFacet).getPublicFacet(),
    ).getGovernedParams(),
    {
      Electorate: {
        type: 'invitation',
        value: invitationAmount,
      },
      MalleableNumber: {
        type: 'nat',
        value: 602214090000000000000000n,
      },
    },
  );
});
