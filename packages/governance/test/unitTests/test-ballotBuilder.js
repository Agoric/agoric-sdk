// @ts-check

import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { buildManualTimer } from '@agoric/zoe/tools/manualTimer.js';
import {
  coerceQuestionSpec,
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
    coerceQuestionSpec(
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
      coerceQuestionSpec(
        // @ts-expect-error Illegal Question
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
      message: 'A question can only be a pass-by-copy record: "will it blend?"',
    },
  );
});

test('bad timer', t => {
  t.throws(
    () =>
      coerceQuestionSpec(
        // @ts-expect-error Illegal timer
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
    { message: 'Timer must be a timer 37' },
  );
});

test('bad method', t => {
  t.throws(
    () =>
      coerceQuestionSpec(
        // @ts-expect-error Illegal Method
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
    { message: 'Illegal "ChoiceMethod": "choose"' },
  );
});

test('bad Quorum', t => {
  t.throws(
    () =>
      coerceQuestionSpec(
        // @ts-expect-error Illegal Quorum
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
    { message: 'Illegal "QuorumRule": 0.5' },
  );
});

test('bad tieOutcome', t => {
  t.throws(
    () =>
      coerceQuestionSpec(
        // @ts-expect-error Illegal tieOutcome
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
      coerceQuestionSpec(
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
    { message: 'maxChoices must be positive: 0' },
  );
});

test('bad positions', t => {
  t.throws(
    () =>
      coerceQuestionSpec({
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
      message:
        'Cannot pass non-frozen objects like {"text":"yes"}. Use harden()',
    },
  );
});
