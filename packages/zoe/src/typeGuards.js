// @ts-check

import { AmountPattern } from '@agoric/ertp';
import { M } from '@agoric/store';

export const ExitOnDemandPattern = harden({ onDemand: null });

export const ExitWaivedPattern = harden({ waived: null });

export const ExitAfterDeadlinePattern = harden({
  afterDeadline: { timer: M.remotable(), deadline: M.bigint() },
});

export const ExitRulePattern = M.or(
  ExitOnDemandPattern,
  ExitWaivedPattern,
  ExitAfterDeadlinePattern,
);

export const KeywordRecordPatternOf = valuePatt =>
  M.recordOf(M.string(), valuePatt);

export const AmountKeywordRecordPattern = KeywordRecordPatternOf(AmountPattern);

export const PatternKeywordRecordPattern = KeywordRecordPatternOf(M.pattern());

export const ProposalPattern = M.partial(
  {
    want: M.or(undefined, PatternKeywordRecordPattern),
    give: M.or(undefined, AmountKeywordRecordPattern),
    exit: M.or(undefined, ExitRulePattern),
  },
  {},
);

export const isOnDemandExitRule = exit => {
  const [exitKey] = Object.getOwnPropertyNames(exit);
  return exitKey === 'onDemand';
};

/**
 * @param {ExitRule} exit
 * @returns {exit is WaivedExitRule}
 */
export const isWaivedExitRule = exit => {
  const [exitKey] = Object.getOwnPropertyNames(exit);
  return exitKey === 'waived';
};

/**
 * @param {ExitRule} exit
 * @returns {exit is AfterDeadlineExitRule}
 */
export const isAfterDeadlineExitRule = exit => {
  const [exitKey] = Object.getOwnPropertyNames(exit);
  return exitKey === 'afterDeadline';
};
