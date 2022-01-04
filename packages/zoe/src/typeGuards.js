// @ts-check

import { AmountShape } from '@agoric/ertp';
import { M } from '@agoric/store';

export const ExitOnDemandShape = harden({ onDemand: null });

export const ExitWaivedShape = harden({ waived: null });

export const ExitAfterDeadlineShape = harden({
  afterDeadline: { timer: M.remotable(), deadline: M.nat() },
});

export const ExitRuleShape = M.or(
  ExitOnDemandShape,
  ExitWaivedShape,
  ExitAfterDeadlineShape,
);

export const KeywordRecordPatternOf = valuePatt =>
  M.recordOf(M.string(), valuePatt);

export const AmountKeywordRecordShape = KeywordRecordPatternOf(AmountShape);

export const PatternKeywordRecordShape = KeywordRecordPatternOf(M.pattern());

export const ProposalShape = M.partial(
  {
    want: M.or(undefined, PatternKeywordRecordShape),
    give: M.or(undefined, AmountKeywordRecordShape),
    exit: M.or(undefined, ExitRuleShape),
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
