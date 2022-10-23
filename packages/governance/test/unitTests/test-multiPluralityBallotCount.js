import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeStoredPublishKit } from '@agoric/notifier';
import {
  eventLoopIteration,
  makeFakeMarshaller,
} from '@agoric/notifier/tools/testSupports.js';
import { makeMockChainStorageRoot } from '@agoric/vats/tools/storage-test-utils.js';
import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { E } from '@endo/eventual-send';
import {
  ChoiceMethod,
  coerceQuestionSpec,
  ElectionType,
  QuorumRule,
} from '../../src/index.js';
import { makeMultiPluralityVoteCounter } from '../../src/multiPluralityVoteCounter.js';

const SIMPLE_ISSUE = harden({
  text: 'Fish or Beef or Pork or Chicken or Duck?',
});
const FISH = harden({ text: 'Fish' });
const BEEF = harden({ text: 'Beef' });
const PORK = harden({ text: 'Pork' });
const CHICKEN = harden({ text: 'Chicken' });
const DUCK = harden({ text: 'Duck' });

const FAKE_CLOSING_RULE = {
  timer: buildManualTimer(console.log),
  deadline: 3n,
};

const FAKE_COUNTER_INSTANCE = makeHandle('Instance');

function makePublisherFromFakes() {
  const storageRoot = makeMockChainStorageRoot();
  const publishKit = makeStoredPublishKit(storageRoot, makeFakeMarshaller());
  return { publisher: publishKit.publisher, storageRoot };
}

test('multi plurality contested', async t => {
  const questionSpec = coerceQuestionSpec({
    method: ChoiceMethod.PLURALITY,
    issue: SIMPLE_ISSUE,
    positions: [FISH, BEEF, PORK, CHICKEN, DUCK],
    electionType: ElectionType.SURVEY,
    maxChoices: 1,
    maxWinners: 3,
    closingRule: FAKE_CLOSING_RULE,
    quorumRule: QuorumRule.NO_QUORUM,
    tieOutcome: BEEF,
  });
  const { publisher, storageRoot } = makePublisherFromFakes();
  const { publicFacet, creatorFacet, closeFacet } =
    makeMultiPluralityVoteCounter(
      questionSpec,
      0n,
      FAKE_COUNTER_INSTANCE,
      publisher,
    );

  const template = publicFacet.getQuestion();
  const aliceSeat = makeHandle('Voter');
  const bobSeat = makeHandle('Voter');
  const tedSeat = makeHandle('Voter');
  const carolSeat = makeHandle('Voter');
  const jackSeat = makeHandle('Voter');

  const positions = template.getDetails().positions;
  t.deepEqual(positions.length, 5);

  E(creatorFacet).submitVote(aliceSeat, [positions[0]], 2n);
  E(creatorFacet).submitVote(bobSeat, [positions[2]], 15n);
  E(creatorFacet).submitVote(tedSeat, [positions[1]], 27n);
  E(creatorFacet).submitVote(carolSeat, [positions[3]], 17n);
  await E(creatorFacet).submitVote(jackSeat, [positions[4]], 14n);
  closeFacet.closeVoting();

  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, [BEEF, CHICKEN, PORK]);

  await eventLoopIteration();
  t.like(storageRoot.getBody('mockChainStorageRoot'), {
    outcome: 'win',
    position: [BEEF, CHICKEN, PORK],
  });
});

test('multi plurality tiecome', async t => {
  const questionSpec = coerceQuestionSpec({
    method: ChoiceMethod.PLURALITY,
    issue: SIMPLE_ISSUE,
    positions: [FISH, BEEF, PORK, CHICKEN, DUCK],
    electionType: ElectionType.SURVEY,
    maxChoices: 1,
    maxWinners: 3,
    closingRule: FAKE_CLOSING_RULE,
    quorumRule: QuorumRule.NO_QUORUM,
    tieOutcome: BEEF,
  });
  const { publisher, storageRoot } = makePublisherFromFakes();
  const { publicFacet, creatorFacet, closeFacet } =
    makeMultiPluralityVoteCounter(
      questionSpec,
      0n,
      FAKE_COUNTER_INSTANCE,
      publisher,
    );

  const template = publicFacet.getQuestion();
  const aliceSeat = makeHandle('Voter');
  const bobSeat = makeHandle('Voter');
  const tedSeat = makeHandle('Voter');
  const carolSeat = makeHandle('Voter');
  const jackSeat = makeHandle('Voter');

  const positions = template.getDetails().positions;
  t.deepEqual(positions.length, 5);

  E(creatorFacet).submitVote(aliceSeat, [positions[0]], 2n);
  E(creatorFacet).submitVote(bobSeat, [positions[2]], 15n);
  E(creatorFacet).submitVote(tedSeat, [positions[1]], 27n);
  E(creatorFacet).submitVote(carolSeat, [positions[3]], 17n);
  await E(creatorFacet).submitVote(jackSeat, [positions[4]], 15n);
  closeFacet.closeVoting();

  const outcome = await E(publicFacet).getOutcome();
  t.deepEqual(outcome, BEEF);

  await eventLoopIteration();
  t.like(storageRoot.getBody('mockChainStorageRoot'), {
    outcome: 'win',
    position: BEEF,
  });
});
