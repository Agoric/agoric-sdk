// @ts-check

import { AmountPattern } from '@agoric/ertp';
import { M, matches } from '@agoric/store';

export const ExitOnDemandPattern = harden({ onDemand: null });

export const ExitWaivedPattern = harden({ waived: null });

export const ExitAfterDeadlinePattern = harden({
  afterDeadline: { timer: M.remotable(), deadline: M.bigint() },
});

export const ExitTermsPattern = M.or(
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
    exit: M.or(undefined, ExitTermsPattern),
  },
  {},
);

/**
 * @param {ExitRule} exit
 * @returns {exit is OnDemandExitRule}
 */
export const isOnDemandExitRule = exit => matches(exit, ExitOnDemandPattern);

/**
 * @param {ExitRule} exit
 * @returns {exit is WaivedExitRule}
 */
export const isWaivedExitRule = exit => matches(exit, ExitWaivedPattern);

/**
 * @param {ExitRule} exit
 * @returns {exit is AfterDeadlineExitRule}
 */
export const isAfterDeadlineExitRule = exit =>
  matches(exit, ExitAfterDeadlinePattern);
