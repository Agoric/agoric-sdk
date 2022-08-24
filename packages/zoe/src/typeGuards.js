// @ts-check

import { AmountSchema } from '@agoric/ertp';
import { M } from '@agoric/store';
import { TimestampValueSchema } from '@agoric/swingset-vat/src/vats/timer/typeGuards.js';

export const AmountKeywordRecordSchema = M.recordOf(M.string(), AmountSchema);
export const AmountPatternKeywordRecordSchema = M.recordOf(
  M.string(),
  M.pattern(),
);

/**
 * After defaults are filled in
 */
export const ProposalSchema = harden({
  want: AmountPatternKeywordRecordSchema,
  give: AmountKeywordRecordSchema,
  // To accept only one, we could use M.or rather than M.partial,
  // but the error messages would have been worse. Rather,
  // cleanProposal's assertExit checks that there's exactly one.
  exit: M.partial(
    {
      onDemand: null,
      waived: null,
      afterDeadline: {
        timer: M.remotable(),
        deadline: TimestampValueSchema,
      },
    },
    {},
  ),
});

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

export const InvitationElementSchema = M.split({
  description: M.string(),
  handle: M.remotable(), // invitationHandle
  instance: M.remotable(),
  installation: M.remotable(),
});
