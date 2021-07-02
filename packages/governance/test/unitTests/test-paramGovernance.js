/* global __dirname */

// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '@agoric/zoe/exported';

import { makeZoe } from '@agoric/zoe';
import bundleSource from '@agoric/bundle-source';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';
import { Far } from '@agoric/marshal';
import { makePromiseKit } from '@agoric/promise-kit';
import fakeVatAdmin from '@agoric/zoe/tools/fakeVatAdmin';
import { E } from '@agoric/eventual-send';

import { makeHandle } from '@agoric/zoe/src/makeHandle';
import {
  setupGovernance,
  makeParamChangePositions,
} from '../../src/governParam';
import {
  governedParameterTerms,
  MALLEABLE_NUMBER,
} from '../swingsetTests/contractGovernor/governedContract';

const ballotCounterRoot = `${__dirname}/../../src/binaryBallotCounter.js`;
const governedRoot = `${__dirname}/../swingsetTests/contractGovernor/governedContract.js`;

const makeInstall = async (sourceRoot, zoe) => {
  const bundle = await bundleSource(sourceRoot);
  return E(zoe).install(bundle);
};

test('governParam happy path with fakes', async t => {
  const zoe = makeZoe(fakeVatAdmin);

  const timer = buildManualTimer(console.log);

  const governedInstall = await makeInstall(governedRoot, zoe);
  const ballotCounterInstall = await makeInstall(ballotCounterRoot, zoe);

  const governedFacets = await E(zoe).startInstance(
    governedInstall,
    {},
    { governedParams: governedParameterTerms },
  );
  const accessor = governedFacets.creatorFacet.getParamMgrAccessor();

  const paramSpec = { key: 'contractParams', parameterName: MALLEABLE_NUMBER };
  const { positive } = makeParamChangePositions(paramSpec, 25n);

  const fakeCounterPublic = Far('fake ballotCounter public', {
    getOutcome: () => positive,
    getDetails: () => undefined,
  });
  const questionPoser = Far('poser', {
    addQuestion: () => {
      return {
        publicFacet: fakeCounterPublic,
        instance: makeHandle('counter'),
      };
    },
  });

  const paramGovernor = setupGovernance(
    accessor,
    // @ts-ignore questionPoser is a fake
    questionPoser,
    governedFacets.instance,
    timer,
  );

  const { outcomeOfUpdate } = await E(paramGovernor).voteOnParamChange(
    paramSpec,
    25n,
    ballotCounterInstall,
    2n,
  );

  await E.when(outcomeOfUpdate, outcome => t.is(outcome, 25n)).catch(e =>
    t.fail(e),
  );

  t.deepEqual(governedFacets.publicFacet.getState(), {
    MalleableNumber: {
      name: MALLEABLE_NUMBER,
      type: 'nat',
      value: 25n,
    },
  });
});

test('governParam no votes', async t => {
  const timer = buildManualTimer(console.log);
  const zoe = makeZoe(fakeVatAdmin);

  const ballotCounterInstall = await makeInstall(ballotCounterRoot, zoe);
  const governedInstall = await makeInstall(governedRoot, zoe);

  const governedFacets = await E(zoe).startInstance(
    governedInstall,
    {},
    { governedParams: governedParameterTerms },
  );
  const accessor = governedFacets.creatorFacet.getParamMgrAccessor();

  const paramSpec = { key: 'contractParams', parameterName: MALLEABLE_NUMBER };

  const outcomeKit = makePromiseKit();
  outcomeKit.reject('no quorum');

  const fakeCounterPublic = Far('fake ballotCounter public', {
    getOutcome: () => outcomeKit.promise,
    getDetails: () => undefined,
  });

  outcomeKit.promise.catch(() => {});
  fakeCounterPublic.getOutcome().catch(() => {});

  const questionPoser = Far('poser', {
    addQuestion: () => {
      return {
        publicFacet: fakeCounterPublic,
        instance: makeHandle('counter'),
      };
    },
  });

  const paramGovernor = setupGovernance(
    accessor,
    // @ts-ignore questionPoser is a fake
    questionPoser,
    governedFacets.instance,
    timer,
  );

  const { outcomeOfUpdate } = await E(paramGovernor).voteOnParamChange(
    paramSpec,
    25n,
    ballotCounterInstall,
    2n,
  );

  await E.when(outcomeOfUpdate, outcome => t.fail(`${outcome}`)).catch(e =>
    t.is(e, 'no quorum'),
  );

  t.deepEqual(governedFacets.publicFacet.getState(), {
    MalleableNumber: {
      name: MALLEABLE_NUMBER,
      type: 'nat',
      value: 602214090000000000000000n,
    },
  });
});

test('governParam bad update', async t => {
  const zoe = makeZoe(fakeVatAdmin);
  const timer = buildManualTimer(console.log);

  const ballotCounterInstall = await makeInstall(ballotCounterRoot, zoe);
  const governedInstall = await makeInstall(governedRoot, zoe);

  const governedFacets = await E(zoe).startInstance(
    governedInstall,
    {},
    { governedParams: governedParameterTerms },
  );
  const brokenParamMgr = Far('broken ParamMgr', {
    getParam: () => {
      return harden({ type: 'nat' });
    },
  });
  const accessor = Far('param accessor', {
    get: () => brokenParamMgr,
  });

  const paramSpec = { key: 'contractParams', parameterName: MALLEABLE_NUMBER };
  const { positive } = makeParamChangePositions(paramSpec, 25n);

  const fakeDetails = { stuff: 'nonsense' };
  const fakeCounterPublic = Far('fake ballotCounter public', {
    getOutcome: () => positive,
    getDetails: () => fakeDetails,
  });

  const handle = makeHandle('ballot counter');
  const questionPoser = Far('poser', {
    addQuestion: () => {
      return { publicFacet: fakeCounterPublic, instance: handle };
    },
  });

  const paramGovernor = setupGovernance(
    // @ts-ignore accessor is a fake
    accessor,
    questionPoser,
    governedFacets.instance,
    timer,
  );

  const { details, outcomeOfUpdate } = await E(paramGovernor).voteOnParamChange(
    paramSpec,
    25n,
    ballotCounterInstall,
    2n,
  );
  t.deepEqual(await details, fakeDetails);

  await t.throwsAsync(
    outcomeOfUpdate,
    {
      message: 'target has no method "updateMalleableNumber", has ["getParam"]',
    },
    'Expected a throw',
  );

  t.deepEqual(governedFacets.publicFacet.getState(), {
    MalleableNumber: {
      name: MALLEABLE_NUMBER,
      type: 'nat',
      value: 602214090000000000000000n,
    },
  });
});
