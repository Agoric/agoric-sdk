import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { buildZoeManualTimer } from '@agoric/zoe/tools/manualTimer.js';
import {
  coerceQuestionSpec,
  ChoiceMethod,
  ElectionType,
  QuorumRule,
} from '../../src/index.js';

const issue = harden({ text: 'will it blend?' });
const positions = [harden({ text: 'yes' }), harden({ text: 'no' })];
const timer = buildZoeManualTimer(console.log);
const closingRule = { timer, deadline: 37n };

test('good QuestionSpec', t => {
  t.truthy(
    coerceQuestionSpec(
      harden({
        method: ChoiceMethod.UNRANKED,
        issue,
        positions,
        electionType: ElectionType.SURVEY,
        maxChoices: 1,
        maxWinners: 1,
        closingRule,
        quorumRule: QuorumRule.MAJORITY,
        tieOutcome: positions[1],
      }),
    ),
  );
});

test('bad Issue', t => {
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
      message: / - Must match one of /,
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
    { message: / - Must match one of / },
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
    { message: / - Must match one of / },
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
          maxChoices: 1,
          closingRule,
          quorumRule: 0.5,
          tieOutcome: positions[1],
        }),
      ),
    { message: / - Must match one of / },
  );
});

test('bad tieOutcome', t => {
  t.throws(
    () =>
      coerceQuestionSpec(
        harden({
          method: ChoiceMethod.ORDER,
          issue,
          positions,
          electionType: ElectionType.SURVEY,
          maxChoices: 1,
          maxWinners: 1,
          closingRule,
          quorumRule: QuorumRule.NO_QUORUM,
          tieOutcome: { text: 'try again' },
        }),
      ),
    {
      message:
        '{"text":"try again"} - Must match one of [{"text":"yes"},{"text":"no"}]',
    },
  );
});

test('bad maxChoices', t => {
  t.throws(
    () =>
      coerceQuestionSpec(
        harden({
          method: ChoiceMethod.UNRANKED,
          issue,
          positions,
          electionType: ElectionType.SURVEY,
          maxChoices: 0,
          maxWinners: 1,
          closingRule,
          quorumRule: QuorumRule.NO_QUORUM,
          tieOutcome: positions[1],
        }),
      ),
    { message: / - Must match one of / },
  );
});

test('bad positions', t => {
  t.throws(
    () =>
      coerceQuestionSpec({
        method: ChoiceMethod.ORDER,
        issue,
        // @ts-expect-error intentionally erroneous
        positions: [{ text: 'yes' }, { verbiage: 'no' }],
        electionType: ElectionType.SURVEY,
        maxChoices: 1,
        closingRule,
        quorumRule: QuorumRule.NO_QUORUM,
        tieOutcome: positions[1],
      }),
    {
      message: / - Must match one of /,
    },
  );
});
