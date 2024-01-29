import { M } from '@endo/patterns';

// The purpose of this module is to provide snapshotted (and possibly stale)
// copies of various patterns and guards from packages that this package
// does not depend on, except for performance testing. Besides avoiding
// dependencies that are otherwise unnecessary, this lets these copies be
// updated on a schedule independent of the actual, based on our tradeoffs
// of measurement fidelity wrt the actual vs measurement comparison against
// previous measurements.

export const BrandShape = M.remotable('Brand');
export const PaymentShape = M.remotable('Payment');
const TimerShape = M.remotable('timerHandle');

const AmountValueShape = M.or(M.nat(), M.set(), M.arrayOf(M.key()), M.bag());

export const AmountShape = harden({
  brand: BrandShape,
  value: AmountValueShape,
});

const AmountKeywordRecordShape = M.recordOf(M.string(), AmountShape);
const AmountPatternKeywordRecordShape = M.recordOf(M.string(), M.pattern());

const TimerBrandShape = M.remotable('TimerBrand');
const TimestampValueShape = M.nat();
const TimestampRecordShape = harden({
  timerBrand: TimerBrandShape,
  absValue: TimestampValueShape,
});
const TimestampShape = M.or(TimestampRecordShape, TimestampValueShape);

export const FullProposalShape = harden({
  want: AmountPatternKeywordRecordShape,
  give: AmountKeywordRecordShape,
  // To accept only one, we could use M.or rather than M.partial,
  // but the error messages would have been worse. Rather,
  // cleanProposal's assertExit checks that there's exactly one.
  exit: M.partial(
    {
      onDemand: null,
      waived: null,
      afterDeadline: {
        timer: M.eref(TimerShape),
        deadline: TimestampShape,
      },
    },
    {},
  ),
});

export const ProposalShape = M.partial(FullProposalShape);
