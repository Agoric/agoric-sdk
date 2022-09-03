// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import '@agoric/zoe/exported.js';

import { makeNotifierFromAsyncIterable } from '@agoric/notifier';
import { makeZoeKit } from '@agoric/zoe';
import bundleSource from '@endo/bundle-source';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { E } from '@endo/eventual-send';
import { makeBoard } from '@agoric/vats/src/lib-board.js';
import { makeMockChainStorageRoot } from '@agoric/vats/tools/storage-test-utils.js';

import { resolve as importMetaResolve } from 'import-meta-resolve';
import { MALLEABLE_NUMBER } from '../swingsetTests/contractGovernor/governedContract.js';
import { CONTRACT_ELECTORATE, ParamTypes } from '../../src/index.js';
import { eventLoopIteration } from '../../../zoe/tools/eventLoopIteration.js';

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
  const makeFar = o => o;

  /**
   * These properties will be assigned by `setJig` in the contract.
   *
   * @typedef {object} TestContext
   * @property {ZCF} zcf
   * @property {IssuerRecord} mintedIssuerRecord
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

  const { creatorFacet: committeeCreator, instance: electorateInstance } =
    await E(zoe).startInstance(electorate, harden({}), electorateTerms, {
      storageNode: makeMockChainStorageRoot().makeChildNode('thisElectorate'),
      marshaller: makeBoard().getReadonlyMarshaller(),
    });

  const poserInvitation = await E(committeeCreator).getPoserInvitation();
  const invitationAmount = await E(E(zoe).getInvitationIssuer()).getAmountOf(
    poserInvitation,
  );

  const governedTerms = {
    governedParams: {
      [MALLEABLE_NUMBER]: {
        type: ParamTypes.NAT,
        value: 602214090000000000000000n,
      },
      [CONTRACT_ELECTORATE]: {
        type: ParamTypes.INVITATION,
        value: invitationAmount,
      },
    },
    governedApis: ['governanceApi'],
  };
  const governorTerms = {
    timer,
    electorateInstance,
    governedContractInstallation: governed,
    governed: {
      terms: governedTerms,
      issuerKeywordRecord: {},
    },
  };

  const governorFacets = await E(zoe).startInstance(
    governor,
    {},
    governorTerms,
    {
      governed: {
        initialPoserInvitation: poserInvitation,
      },
    },
  );

  return { governorFacets, installs, invitationAmount, committeeCreator };
};

const setUpVoterAndVote = async (committeeCreator, zoe, qHandle, choice) => {
  const invitations = await E(committeeCreator).getVoterInvitations();

  const seat = E(zoe).offer(invitations[0]);
  const { voter } = E.get(E(seat).getOfferResult());
  return E(voter).castBallotFor(qHandle, [choice]);
};

test('governParam no votes', async t => {
  const { zoe } = await setUpZoeForTest(() => {});
  const timer = buildManualTimer(t.log);
  const { governorFacets, installs, invitationAmount } =
    await setUpGovernedContract(
      zoe,
      { committeeName: 'Demos', committeeSize: 1 },
      timer,
    );

  /** @type {GovernedPublicFacet<unknown>} */
  const publicFacet = E(governorFacets.creatorFacet).getPublicFacet();
  const notifier = makeNotifierFromAsyncIterable(
    await E(publicFacet).getSubscription(),
  );
  const update1 = await notifier.getUpdateSince();
  t.like(update1, {
    value: {
      current: {
        MalleableNumber: { type: 'nat', value: 602214090000000000000000n },
      },
    },
  });

  const paramChangeSpec = harden({
    paramPath: { key: 'governedParams' },
    changes: { [MALLEABLE_NUMBER]: 25n },
  });

  const { outcomeOfUpdate } = await E(
    governorFacets.creatorFacet,
  ).voteOnParamChanges(installs.counter, 2n, paramChangeSpec);

  await E(timer).tick();
  await E(timer).tick();

  await E.when(outcomeOfUpdate, outcome => t.fail(`${outcome}`)).catch(e =>
    t.is(e, 'No quorum'),
  );

  // no update2 because the value didn't change

  t.deepEqual(await E(publicFacet).getGovernedParams(), {
    Electorate: {
      type: 'invitation',
      value: invitationAmount,
    },
    MalleableNumber: {
      type: 'nat',
      value: 602214090000000000000000n,
    },
  });
});

test('multiple params bad change', async t => {
  const { zoe } = await setUpZoeForTest(() => {});
  const timer = buildManualTimer(t.log);
  const { governorFacets, installs } = await setUpGovernedContract(
    zoe,
    { committeeName: 'Demos', committeeSize: 1 },
    timer,
  );

  const paramChangesSpec = harden({
    paramPath: { key: 'governedParams' },
    changes: {
      [CONTRACT_ELECTORATE]: 13n,
      [MALLEABLE_NUMBER]: 42n,
    },
  });

  await t.throwsAsync(
    () =>
      E(governorFacets.creatorFacet).voteOnParamChanges(
        installs.counter,
        2n,
        paramChangesSpec,
      ),
    {
      message:
        'In "getAmountOf" method of (Zoe Invitation issuer) arg 0: bigint "[13n]" - Must be a remotable (Payment)',
    },
  );
});

test('change multiple params', async t => {
  const { zoe } = await setUpZoeForTest(() => {});
  const timer = buildManualTimer(t.log);
  const { governorFacets, installs, invitationAmount, committeeCreator } =
    await setUpGovernedContract(
      zoe,
      { committeeName: 'Demos', committeeSize: 1 },
      timer,
    );

  /** @type {GovernedPublicFacet<unknown>} */
  const publicFacet = await E(governorFacets.creatorFacet).getPublicFacet();
  const notifier = makeNotifierFromAsyncIterable(
    await E(publicFacet).getSubscription(),
  );
  const update1 = await notifier.getUpdateSince();
  // constructing the fixture to deepEqual would complicate this with insufficient benefit
  t.is(
    // @ts-expect-error reaching into unknown values
    update1.value.current.Electorate.value.value[0].description,
    'questionPoser',
  );
  t.like(update1, {
    value: {
      current: {
        MalleableNumber: { type: 'nat', value: 602214090000000000000000n },
      },
    },
  });

  // This is the wrong kind of invitation, but governance can't tell
  const wrongInvitation = await E(committeeCreator).getPoserInvitation();

  const paramChangesSpec = harden({
    paramPath: { key: 'governedParams' },
    changes: {
      [CONTRACT_ELECTORATE]: wrongInvitation,
      [MALLEABLE_NUMBER]: 42n,
    },
  });

  const { outcomeOfUpdate, details: detailsP } = await E(
    governorFacets.creatorFacet,
  ).voteOnParamChanges(installs.counter, 2n, paramChangesSpec);

  const details = await detailsP;
  const positive = details.positions[0];
  await setUpVoterAndVote(
    committeeCreator,
    zoe,
    details.questionHandle,
    positive,
  );

  await E(timer).tick();
  await E(timer).tick();

  await E.when(outcomeOfUpdate, async outcomes => {
    t.deepEqual(outcomes, {
      changes: {
        [CONTRACT_ELECTORATE]: invitationAmount,
        [MALLEABLE_NUMBER]: 42n,
      },
    });
  }).catch(e => {
    t.fail(`expected success, got ${e}`);
  });

  const update2 = await notifier.getUpdateSince(update1.updateCount);
  t.like(update2, {
    value: {
      current: {
        MalleableNumber: { type: 'nat', value: 42n },
      },
    },
  });

  const paramsAfter = await E(publicFacet).getGovernedParams();
  t.deepEqual(paramsAfter.Electorate.value, invitationAmount);
  t.is(paramsAfter.MalleableNumber.value, 42n);
});

test('change multiple params used invitation', async t => {
  const { zoe } = await setUpZoeForTest(() => {});
  const timer = buildManualTimer(t.log);
  const { governorFacets, installs, invitationAmount, committeeCreator } =
    await setUpGovernedContract(
      zoe,
      { committeeName: 'Demos', committeeSize: 1 },
      timer,
    );

  /** @type {GovernedPublicFacet<unknown>} */
  const publicFacet = E(governorFacets.creatorFacet).getPublicFacet();
  const notifier = makeNotifierFromAsyncIterable(
    await E(publicFacet).getSubscription(),
  );
  const update1 = await notifier.getUpdateSince();
  t.like(update1, {
    value: {
      current: {
        MalleableNumber: { type: 'nat', value: 602214090000000000000000n },
      },
    },
  });

  // This is the wrong kind of invitation, but governance can't tell
  const wrongInvitation = await E(committeeCreator).getPoserInvitation();

  const paramChangesSpec = harden({
    paramPath: { key: 'governedParams' },
    changes: {
      [CONTRACT_ELECTORATE]: wrongInvitation,
      [MALLEABLE_NUMBER]: 42n,
    },
  });

  const { outcomeOfUpdate, details: detailsP } = await E(
    governorFacets.creatorFacet,
  ).voteOnParamChanges(installs.counter, 2n, paramChangesSpec);

  outcomeOfUpdate
    .then(o => t.fail(`update should break, ${o}`))
    .catch(e =>
      t.regex(
        e.message,
        /was not a live payment for brand/,
        'Invitatation was burned and should not be usable',
      ),
    );

  const details = await detailsP;
  const positive = details.positions[0];
  await setUpVoterAndVote(
    committeeCreator,
    zoe,
    details.questionHandle,
    positive,
  );

  await E(E(zoe).getInvitationIssuer()).burn(wrongInvitation);

  await E(timer).tick();
  await E(timer).tick();

  // no update2 because the value didn't change

  const paramsAfter = await E(publicFacet).getGovernedParams();
  t.deepEqual(paramsAfter.Electorate.value, invitationAmount);
  // original value
  t.is(paramsAfter.MalleableNumber.value, 602214090000000000000000n);
});

test('change param continuing invitation', async t => {
  const { zoe } = await setUpZoeForTest(() => {});
  const timer = buildManualTimer(t.log);
  const { governorFacets, installs, committeeCreator } =
    await setUpGovernedContract(
      zoe,
      { committeeName: 'Demos', committeeSize: 1 },
      timer,
    );

  /** @type {GovernedPublicFacet<unknown>} */
  const publicFacet = E(governorFacets.creatorFacet).getPublicFacet();
  const notifier = makeNotifierFromAsyncIterable(
    await E(publicFacet).getSubscription(),
  );
  const update1 = await notifier.getUpdateSince();
  t.like(update1, {
    value: {
      current: {
        MalleableNumber: { type: 'nat', value: 602214090000000000000000n },
      },
    },
  });

  const paramChangesSpec = harden({
    paramPath: { key: 'governedParams' },
    changes: { [MALLEABLE_NUMBER]: 42n },
  });

  const { outcomeOfUpdate, details: detailsP } = await E(
    governorFacets.creatorFacet,
  ).voteOnParamChanges(installs.counter, 2n, paramChangesSpec);

  outcomeOfUpdate
    .then(o => t.deepEqual(o, { changes: { MalleableNumber: 42n } }))
    .catch(e => t.fail(`Expected vote to succeed, but got ${e}`));

  const details = await detailsP;
  const positive = details.positions[0];
  const invitations = await E(committeeCreator).getVoterInvitations();

  const seat = E(zoe).offer(invitations[0]);
  const { invitationMakers } = E.get(E(seat).getOfferResult());
  const voteInvitation = E(invitationMakers).makeVoteInvitation(
    details.questionHandle,
  );
  await E(zoe).offer(voteInvitation, {}, {}, { positions: [positive] });

  await E(timer).tick();
  await E(timer).tick();
  await eventLoopIteration();

  const paramsAfter = await E(publicFacet).getGovernedParams();
  t.is(paramsAfter.MalleableNumber.value, 42n);

  const update2 = await notifier.getUpdateSince(update1.updateCount);
  t.like(update2, {
    value: {
      current: {
        MalleableNumber: { type: 'nat', value: 42n },
      },
    },
  });
});
