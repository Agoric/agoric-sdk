// @ts-check

import './types';

import { natSafeMath } from '@agoric/zoe/src/contractSupport';

const { multiply, floorDivide, add, subtract } = natSafeMath;

/**
 * delegations represent the current state of delegation/redelegation/unbonding
 * with a polymorphic interface.
 *
 * accessors: getStake(), getDelegator(), getValidator()
 * slashed() tells the delegator of these shares to reduce stake
 * accumulateStake(soFar, validatorID) is a step in a reduce() to compute the
 *   effect of this delegation on the validator's stake.
 * unbond() returns one or two records { unbonding, replacement }. The returned
 *   record(s) replace the record that previously was there.
 * redelegate() returns one or two records { redelegation, replacement }. The
 *   returned record(s) replace the record that previously was there.
 */

// The current state of the code doesn't resolve unbonding because it was
// originally used in a context where we were more focused on keeping records.
// Now that we're focused on paying the rewards, this should be cleaned up, so
// that delegations get merged into one object when they unbond.

function slashStake(slashFactor, stake) {
  return floorDivide(multiply(slashFactor, stake), 100.0);
}

function slash(slashFactor, stake, delegator, progeny, old, next) {
  if (progeny) {
    progeny.forEach(p => p.slashed(slashFactor));
    return false;
  } else {
    delegator.slashed(slashStake(slashFactor, stake), old, next);
    old.getValidator().slashDelegation(old, next);
    return true;
  }
}

export function makeUnbonding(delegator, stake, validator, start, end) {
  let progeny;
  /** @type {Delegation} */
  const unbonding = harden({
    getDelegator: _ => delegator,
    getStake: _ => stake,
    getValidator: _ => validator,
    slashed: slashFactor => {
      const next = makeUnbonding(
        delegator,
        slashStake(slashFactor, stake),
        undefined,
        start,
      );
      if (slash(slashFactor, stake, delegator, progeny, unbonding, next)) {
        progeny = [next];
      }
    },
    unbond: _ => {
      throw Error(`can't unbond an unbonding`);
    },
    redelegate: (dest, delta, _newEnd) => {
      if (delta > stake) {
        throw Error(`can't redelegate more than current stake`);
      }
      // eslint-disable-next-line no-use-before-define
      const redelegation = makeRedelegation(delta, dest, unbonding, start, end);
      if (delta === stake) {
        progeny = [redelegation];
        return { redelegation };
      } else {
        const replacement = makeUnbonding(
          delegator,
          subtract(stake, delta),
          validator,
          start,
          end,
        );
        progeny = [redelegation, replacement];
        return { redelegation, replacement };
      }
    },
    activeAt: block => end > block,
  });
  return unbonding;
}

export function makeRedelegation(stake, destValidator, delegation, start, end) {
  let progeny;
  /** @type {Delegation} */
  const redelegation = harden({
    getDelegator: _ => delegation.getDelegator(),
    getStake: _ => stake,
    getValidator: _ => destValidator,
    slashed: slashFactor => {
      const reduced = slashStake(slashFactor, stake);
      const next = makeRedelegation(
        reduced,
        destValidator,
        delegation,
        start,
        end,
      );
      const delegator = delegation.getDelegator();
      if (slash(slashFactor, reduced, delegator, progeny, redelegation, next)) {
        progeny = [next];
      }
    },
    unbond: (delta, newEnd) => {
      if (delta > stake) {
        throw Error(`can't redelegate more than current stake`);
      }
      const unbonding = makeUnbonding(
        delegation.getDelegator(),
        delta,
        destValidator,
        start,
        newEnd,
      );
      if (delta === stake) {
        progeny = [unbonding];
        return { unbonding };
      } else {
        const replacement = makeRedelegation(
          subtract(stake, delta),
          destValidator,
          delegation,
          start,
          end,
        );
        progeny = [replacement, unbonding];
        return { replacement, unbonding };
      }
    },
    redelegate: (dest, delta, newEnd) => {
      if (delta > stake) {
        throw Error(`can't redelegate more than current stake`);
      }
      const redel = makeRedelegation(delta, dest, redelegation, start, newEnd);
      if (delta === stake) {
        progeny = [redel];
        return { redelegation: redel };
      } else {
        const replacement = makeRedelegation(
          subtract(stake, delta),
          destValidator,
          delegation,
          start,
          end,
        );
        progeny = [replacement, redel];
        return { redelegation: redel, replacement };
      }
    },
    activeAt: block => end > block,
  });
  return redelegation;
}

export function makeDelegation(delegator, stake, validator, start) {
  let progeny;
  /** @type {Delegation} */
  const delegation = harden({
    getDelegator: _ => delegator,
    getStake: _ => stake,
    getValidator: _ => validator,
    slashed: slashFactor => {
      const reduced = slashStake(slashFactor, stake);
      const next = makeDelegation(delegator, reduced, validator, start);
      if (slash(slashFactor, stake, delegator, progeny, delegation, next)) {
        progeny = [next];
      }
    },
    unbond: (delta, startUnbonding, end) => {
      if (delta > stake) {
        throw Error(`can't unbond more than current stake`);
      }
      const unbonding = makeUnbonding(
        delegator,
        delta,
        validator,
        startUnbonding,
        end,
      );
      if (delta === stake) {
        progeny = [unbonding];
        return { unbonding };
      } else {
        const replacement = makeDelegation(
          delegator,
          subtract(stake, delta),
          validator,
          start,
        );
        progeny = [unbonding, replacement];
        return { unbonding, replacement };
      }
    },
    redelegate: (dest, delta, newEnd) => {
      if (delta > stake) {
        throw Error(`can't redelegate more than current stake`);
      }
      const redelegation = makeRedelegation(
        delta,
        dest,
        delegation,
        start,
        newEnd,
      );
      if (delta === stake) {
        progeny = [redelegation];
        return { redelegation };
      } else {
        const replacement = makeDelegation(
          delegator,
          subtract(stake, delta),
          validator,
          start,
        );
        progeny = [replacement, redelegation];
        return { redelegation, replacement };
      }
    },
    activeAt: _ => true,
  });
  return delegation;
}
