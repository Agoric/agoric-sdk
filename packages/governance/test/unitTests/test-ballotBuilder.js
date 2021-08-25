// @ts-check

// TODO Remove babel-standalone preinitialization
// https://github.com/endojs/endo/issues/768
// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/babel-standalone';
// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import {
  looksLikeBallotSpec,
  ChoiceMethod,
  ElectionType,
  QuorumRule,
} from '../../src/ballotBuilder.js';

const question = harden({ text: 'will it blend?' });
const positions = [harden({ text: 'yes' }), harden({ text: 'no' })];
const timer = buildManualTimer(console.log);
const closingRule = { timer, deadline: 37n };

test('good BallotSpec', t => {
  t.truthy(
    looksLikeBallotSpec(
      harden({
        method: ChoiceMethod.CHOOSE_N,
        question,
        positions,
        electionType: ElectionType.SURVEY,
        maxChoices: 2,
        closingRule,
        quorumRule: QuorumRule.MAJORITY,
        tieOutcome: positions[1],
      }),
    ),
  );
});

test('bad Question', t => {
  t.throws(
    () =>
      looksLikeBallotSpec(
        // @ts-ignore Illegal Question
        harden({
          method: ChoiceMethod.CHOOSE_N,
          question: 'will it blend?',
          positions,
          electionType: ElectionType.SURVEY,
          maxChoices: 2,
          closingRule,
          quorumRule: QuorumRule.MAJORITY,
          tieOutcome: positions[1],
        }),
      ),
    {
      message: 'A question can only be a pass-by-copy record: "will it blend?"',
    },
  );
});

test('bad timer', t => {
  t.throws(
    () =>
      looksLikeBallotSpec(
        // @ts-ignore Illegal timer
        harden({
          method: ChoiceMethod.CHOOSE_N,
          question,
          positions,
          electionType: ElectionType.SURVEY,
          maxChoices: 2,
          closingRule: { timer: 37, deadline: 37n },
          quorumRule: QuorumRule.MAJORITY,
          tieOutcome: positions[1],
        }),
      ),
    { message: 'Timer must be a timer 37' },
  );
});

test('bad method', t => {
  t.throws(
    () =>
      looksLikeBallotSpec(
        // @ts-ignore Illegal Method
        harden({
          method: 'choose',
          question,
          positions,
          electionType: ElectionType.SURVEY,
          maxChoices: 2,
          closingRule,
          quorumRule: QuorumRule.MAJORITY,
          tieOutcome: positions[1],
        }),
      ),
    { message: 'Illegal "ChoiceMethod": "choose"' },
  );
});

test('bad Quorum', t => {
  t.throws(
    () =>
      looksLikeBallotSpec(
        // @ts-ignore Illegal Quorum
        harden({
          method: ChoiceMethod.ORDER,
          question,
          positions,
          electionType: ElectionType.SURVEY,
          maxChoices: 2,
          closingRule,
          quorumRule: 0.5,
          tieOutcome: positions[1],
        }),
      ),
    { message: 'Illegal "QuorumRule": 0.5' },
  );
});

test('bad tieOutcome', t => {
  t.throws(
    () =>
      looksLikeBallotSpec(
        // @ts-ignore Illegal tieOutcome
        harden({
          method: ChoiceMethod.ORDER,
          question,
          positions,
          electionType: ElectionType.SURVEY,
          maxChoices: 2,
          closingRule,
          quorumRule: QuorumRule.NO_QUORUM,
          tieOutcome: 'try again',
        }),
      ),
    { message: 'tieOutcome must be a legal position: "try again"' },
  );
});

test('bad maxChoices', t => {
  t.throws(
    () =>
      looksLikeBallotSpec(
        harden({
          method: ChoiceMethod.ORDER,
          question,
          positions,
          electionType: ElectionType.SURVEY,
          maxChoices: 0,
          closingRule,
          quorumRule: QuorumRule.NO_QUORUM,
          tieOutcome: positions[1],
        }),
      ),
    { message: 'maxChoices must be positive: 0' },
  );
});

test('bad positions', t => {
  t.throws(
    () =>
      looksLikeBallotSpec({
        method: ChoiceMethod.ORDER,
        question,
        positions: [{ text: 'yes' }, { text: 'no' }],
        electionType: ElectionType.SURVEY,
        maxChoices: 1,
        closingRule,
        quorumRule: QuorumRule.NO_QUORUM,
        tieOutcome: positions[1],
      }),
    {
      message:
        'Cannot pass non-frozen objects like {"text":"yes"}. Use harden()',
    },
  );
});
