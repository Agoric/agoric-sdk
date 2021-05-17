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

// The current state of the code deosn't resolve unbonding because it was
// originally used in a context where we were more focused on keeping records.
// Now that we're focused on paying the rewards, this should be cleaned up, so
// that delegations get merged into one object when they unbond.

function slashStake(slashFactor, stake) {
  return floorDivide(multiply(slashFactor, stake), 100.0);
}

function slash(slashFactor, stake, delegator, progeny, old, next) {
  if (progeny) {
    progeny.forEach(p => p.slashed(slashFactor));
  } else {
    delegator.slashed(slashStake(slashFactor, stake), old, next);
    old.getValidator().slashDelegation(old, next);
  }
}

export function makeUnbonding(delegator, stake, validator, end) {
  let progeny;
  /** @type {Delegation} */
  const unbonding = harden({
    getDelegator: _ => delegator,
    getStake: _ => stake,
    getValidator: _ => validator,
    slashed: slashFactor => {
      const next = makeUnbonding(delegator, slashStake(slashFactor, stake));
      slash(slashFactor, stake, delegator, progeny, unbonding, next);
    },
    unbond: _ => {
      throw Error(`can't unbond an unbonding`);
    },
    accumulateStake: soFar => soFar,
    redelegate: (dest, delta, _newEnd) => {
      if (delta > stake) {
        throw Error(`can't redelegate more than current stake`);
      }
      // eslint-disable-next-line no-use-before-define
      const redelegation = makeRedelegation(delta, dest, unbonding, end);
      if (delta === stake) {
        progeny = [redelegation];
        return { redelegation };
      } else {
        const replacement = makeUnbonding(
          delegator,
          subtract(stake, delta),
          validator,
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

export function makeRedelegation(stake, destValidator, delegation, end) {
  let progeny;
  /** @type {Delegation} */
  const redelegation = harden({
    getDelegator: _ => delegation.getDelegator(),
    getStake: _ => stake,
    getValidator: _ => destValidator,
    slashed: slashFactor => {
      const reduced = slashStake(slashFactor, stake);
      const next = makeRedelegation(reduced, destValidator, delegation, end);
      const delegator = delegation.getDelegator();
      slash(slashFactor, reduced, delegator, progeny, redelegation, next);
    },
    unbond: (delta, newEnd) => {
      if (delta > stake) {
        throw Error(`can't redelegate more than current stake`);
      }
      const unbonding = makeUnbonding(
        delegation.getDelegator(),
        delta,
        destValidator,
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
          end,
        );
        progeny = [replacement, unbonding];
        return { replacement, unbonding };
      }
    },
    accumulateStake: (soFar, id) => {
      if (id === delegation.getDelegator().getDelegatorId()) {
        return soFar;
      } else {
        return add(soFar, stake);
      }
    },
    redelegate: (dest, delta, newEnd) => {
      if (delta > stake) {
        throw Error(`can't redelegate more than current stake`);
      }
      const redel = makeRedelegation(delta, dest, redelegation, newEnd);
      if (delta === stake) {
        progeny = [redel];
        return { redelegation: redel };
      } else {
        const replacement = makeRedelegation(
          subtract(stake, delta),
          destValidator,
          delegation,
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

export function makeDelegation(delegator, stake, validator) {
  let progeny;
  /** @type {Delegation} */
  const delegation = harden({
    getDelegator: _ => delegator,
    getStake: _ => stake,
    getValidator: _ => validator,
    slashed: slashFactor => {
      const reduced = slashStake(slashFactor, stake);
      const next = makeDelegation(delegator, reduced, validator);
      slash(slashFactor, stake, delegator, progeny, delegation, next);
    },
    unbond: (delta, end) => {
      if (delta > stake) {
        throw Error(`can't unbond more than current stake`);
      }
      const unbonding = makeUnbonding(delegator, delta, validator, end);
      if (delta === stake) {
        progeny = [unbonding];
        return { unbonding };
      } else {
        const replacement = makeDelegation(
          delegator,
          subtract(stake, delta),
          validator,
        );
        progeny = [unbonding, replacement];
        return { unbonding, replacement };
      }
    },
    accumulateStake: soFar => add(stake, soFar),
    redelegate: (dest, delta, newEnd) => {
      if (delta > stake) {
        throw Error(`can't redelegate more than current stake`);
      }
      const redelegation = makeRedelegation(delta, dest, delegation, newEnd);
      if (delta === stake) {
        progeny = [redelegation];
        return { redelegation };
      } else {
        const replacement = makeDelegation(
          delegator,
          subtract(stake, delta),
          validator,
        );
        progeny = [replacement, redelegation];
        return { redelegation, replacement };
      }
    },
    activeAt: _ => true,
  });
  return delegation;
}
