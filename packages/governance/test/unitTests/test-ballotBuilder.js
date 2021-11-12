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
  looksLikeQuestionSpec,
  ChoiceMethod,
  ElectionType,
  QuorumRule,
} from '../../src/index.js';

const issue = harden({ text: 'will it blend?' });
const positions = [harden({ text: 'yes' }), harden({ text: 'no' })];
const timer = buildManualTimer(console.log);
const closingRule = { timer, deadline: 37n };

test('good QuestionSpec', t => {
  t.truthy(
    looksLikeQuestionSpec(
      harden({
        method: ChoiceMethod.UNRANKED,
        issue,
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
      looksLikeQuestionSpec(
        // @ts-ignore Illegal Question
        harden({
          method: ChoiceMethod.UNRANKED,
          issue: 'will it blend?',
          positions,
          electionType: ElectionType.SURVEY,
          maxChoices: 2,
          closingRule,
          quorumRule: QuorumRule.MAJORITY,
          tieOutcome: positions[1],
        }),
      ),
    {
      message: 'A question can only be a pass-by-copy record: (a string)',
    },
  );
});

test('bad timer', t => {
  t.throws(
    () =>
      looksLikeQuestionSpec(
        // @ts-ignore Illegal timer
        harden({
          method: ChoiceMethod.UNRANKED,
          issue,
          positions,
          electionType: ElectionType.SURVEY,
          maxChoices: 2,
          closingRule: { timer: 37, deadline: 37n },
          quorumRule: QuorumRule.MAJORITY,
          tieOutcome: positions[1],
        }),
      ),
    { message: 'Timer must be a timer (a number)' },
  );
});

test('bad method', t => {
  t.throws(
    () =>
      looksLikeQuestionSpec(
        // @ts-ignore Illegal Method
        harden({
          method: 'choose',
          issue,
          positions,
          electionType: ElectionType.SURVEY,
          maxChoices: 2,
          closingRule,
          quorumRule: QuorumRule.MAJORITY,
          tieOutcome: positions[1],
        }),
      ),
    { message: 'Illegal (a string): (a string)' },
  );
});

test('bad Quorum', t => {
  t.throws(
    () =>
      looksLikeQuestionSpec(
        // @ts-ignore Illegal Quorum
        harden({
          method: ChoiceMethod.ORDER,
          issue,
          positions,
          electionType: ElectionType.SURVEY,
          maxChoices: 2,
          closingRule,
          quorumRule: 0.5,
          tieOutcome: positions[1],
        }),
      ),
    { message: 'Illegal (a string): (a number)' },
  );
});

test('bad tieOutcome', t => {
  t.throws(
    () =>
      looksLikeQuestionSpec(
        // @ts-ignore Illegal tieOutcome
        harden({
          method: ChoiceMethod.ORDER,
          issue,
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
      looksLikeQuestionSpec(
        harden({
          method: ChoiceMethod.ORDER,
          issue,
          positions,
          electionType: ElectionType.SURVEY,
          maxChoices: 0,
          closingRule,
          quorumRule: QuorumRule.NO_QUORUM,
          tieOutcome: positions[1],
        }),
      ),
    { message: 'maxChoices must be positive: (a number)' },
  );
});

test('bad positions', t => {
  t.throws(
    () =>
      looksLikeQuestionSpec({
        method: ChoiceMethod.ORDER,
        issue,
        positions: [{ text: 'yes' }, { text: 'no' }],
        electionType: ElectionType.SURVEY,
        maxChoices: 1,
        closingRule,
        quorumRule: QuorumRule.NO_QUORUM,
        tieOutcome: positions[1],
      }),
    {
      message: 'Cannot pass non-frozen objects like (an object). Use harden()',
    },
  );
});
