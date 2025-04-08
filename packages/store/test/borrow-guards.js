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

/**
 * TODO: need a pattern to test `kindOf(specimen) === 'match:containerHas'` to
 * to ensure that the pattern-level invariants are met.
 *
 * TODO: check all uses of M.tagged to see if they have the same weakness.
 *
 * @see {HasBound}
 */
export const HasBoundShape = M.tagged('match:containerHas');

/** @see {AmountValueBound} */
const AmountValueBoundShape = M.or(AmountValueShape, HasBoundShape);

/** @see {AmountBound} */
export const AmountBoundShape = harden({
  brand: BrandShape,
  value: AmountValueBoundShape,
});

const AmountKeywordRecordShape = M.recordOf(M.string(), AmountShape);
const AmountBoundKeywordRecordShape = M.recordOf(M.string(), AmountBoundShape);

const TimerBrandShape = M.remotable('TimerBrand');
const TimestampValueShape = M.nat();
const TimestampRecordShape = harden({
  timerBrand: TimerBrandShape,
  absValue: TimestampValueShape,
});
const TimestampShape = M.or(TimestampRecordShape, TimestampValueShape);

export const FullProposalShape = harden({
  want: AmountBoundKeywordRecordShape,
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
