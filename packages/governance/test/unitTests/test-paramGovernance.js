// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import '@agoric/zoe/exported.js';

import { makeZoeKit } from '@agoric/zoe';
import bundleSource from '@agoric/bundle-source';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { Far } from '@agoric/marshal';
import { makePromiseKit } from '@agoric/promise-kit';
import fakeVatAdmin from '@agoric/zoe/tools/fakeVatAdmin.js';
import { E } from '@agoric/eventual-send';

import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import path from 'path';

import {
  setupGovernance,
  makeParamChangePositions,
} from '../../src/governParam.js';
import {
  governedParameterInitialValues,
  MALLEABLE_NUMBER,
} from '../swingsetTests/contractGovernor/governedContract.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const voteCounterRoot = `${dirname}/../../src/binaryVoteCounter.js`;
const governedRoot = `${dirname}/../swingsetTests/contractGovernor/governedContract.js`;

const makeInstall = async (sourceRoot, zoe) => {
  const bundle = await bundleSource(sourceRoot);
  return E(zoe).install(bundle);
};

test('governParam happy path with fakes', async t => {
  const { zoeService } = makeZoeKit(fakeVatAdmin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);

  const timer = buildManualTimer(console.log);

  const governedInstall = await makeInstall(governedRoot, zoe);
  const voteCounterInstall = await makeInstall(voteCounterRoot, zoe);

  const governedFacets = await E(zoe).startInstance(
    governedInstall,
    {},
    { main: governedParameterInitialValues },
  );
  const Retriever = governedFacets.creatorFacet.getParamMgrRetriever();

  const paramSpec = { key: 'contractParams', parameterName: MALLEABLE_NUMBER };
  const { positive } = makeParamChangePositions(paramSpec, 25n);

  const fakeCounterPublic = Far('fake voteCounter public', {
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
    Retriever,
    // @ts-ignore questionPoser is a fake
    questionPoser,
    governedFacets.instance,
    timer,
  );

  const { outcomeOfUpdate } = await E(paramGovernor).voteOnParamChange(
    paramSpec,
    25n,
    voteCounterInstall,
    2n,
  );

  await E.when(outcomeOfUpdate, outcome => t.is(outcome, 25n)).catch(e =>
    t.fail(e),
  );

  t.deepEqual(governedFacets.publicFacet.getGovernedParamsValues(), {
    main: {
      MalleableNumber: {
        name: MALLEABLE_NUMBER,
        type: 'nat',
        value: 25n,
      },
    },
  });
});

test('governParam no votes', async t => {
  const timer = buildManualTimer(console.log);
  const { zoeService } = makeZoeKit(fakeVatAdmin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);

  const voteCounterInstall = await makeInstall(voteCounterRoot, zoe);
  const governedInstall = await makeInstall(governedRoot, zoe);

  const governedFacets = await E(zoe).startInstance(
    governedInstall,
    {},
    { main: governedParameterInitialValues },
  );
  const Retriever = governedFacets.creatorFacet.getParamMgrRetriever();

  const paramSpec = { key: 'contractParams', parameterName: MALLEABLE_NUMBER };

  const outcomeKit = makePromiseKit();
  outcomeKit.reject('no quorum');

  const fakeCounterPublic = Far('fake voteCounter public', {
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
    Retriever,
    // @ts-ignore questionPoser is a fake
    questionPoser,
    governedFacets.instance,
    timer,
  );

  const { outcomeOfUpdate } = await E(paramGovernor).voteOnParamChange(
    paramSpec,
    25n,
    voteCounterInstall,
    2n,
  );

  await E.when(outcomeOfUpdate, outcome => t.fail(`${outcome}`)).catch(e =>
    t.is(e, 'no quorum'),
  );

  t.deepEqual(governedFacets.publicFacet.getGovernedParamsValues(), {
    main: {
      MalleableNumber: {
        name: MALLEABLE_NUMBER,
        type: 'nat',
        value: 602214090000000000000000n,
      },
    },
  });
});

test('governParam bad update', async t => {
  const { zoeService } = makeZoeKit(fakeVatAdmin);
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);
  const timer = buildManualTimer(console.log);

  const voteCounterInstall = await makeInstall(voteCounterRoot, zoe);
  const governedInstall = await makeInstall(governedRoot, zoe);

  const governedFacets = await E(zoe).startInstance(
    governedInstall,
    {},
    { main: governedParameterInitialValues },
  );
  const brokenParamMgr = Far('broken ParamMgr', {
    getParam: () => {
      return harden({ type: 'nat' });
    },
  });
  const retriever = Far('paramMgr retriever', {
    get: () => brokenParamMgr,
  });

  const paramSpec = { key: 'contractParams', parameterName: MALLEABLE_NUMBER };
  const { positive } = makeParamChangePositions(paramSpec, 25n);

  const fakeDetails = { stuff: 'nonsense' };
  const fakeCounterPublic = Far('fake voteCounter public', {
    getOutcome: () => positive,
    getDetails: () => fakeDetails,
  });

  const fakeVoteCounter = makeHandle('vote counter');
  const questionPoser = Far('poser', {
    addQuestion: () => {
      return { publicFacet: fakeCounterPublic, instance: fakeVoteCounter };
    },
  });

  const paramGovernor = setupGovernance(
    // @ts-ignore retriever is a fake
    retriever,
    questionPoser,
    governedFacets.instance,
    timer,
  );

  const { details, outcomeOfUpdate } = await E(paramGovernor).voteOnParamChange(
    paramSpec,
    25n,
    voteCounterInstall,
    2n,
  );
  // @ts-ignore details are from a fake
  t.deepEqual(await details, fakeDetails);

  await t.throwsAsync(
    outcomeOfUpdate,
    {
      message: 'target has no method "updateMalleableNumber", has ["getParam"]',
    },
    'Expected a throw',
  );

  t.deepEqual(governedFacets.publicFacet.getGovernedParamsValues(), {
    main: {
      MalleableNumber: {
        name: MALLEABLE_NUMBER,
        type: 'nat',
        value: 602214090000000000000000n,
      },
    },
  });
});
