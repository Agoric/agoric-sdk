// @ts-check

import { natSafeMath } from '@agoric/zoe/src/contractSupport';
import { makeStore } from '@agoric/store';
import { details as X } from '@agoric/assert';

import { Status } from './bondingStatus';
import { makeDelegation } from './delegation';
import './types';

const { add, subtract, multiply, floorDivide } = natSafeMath;

export function makeValidator(validatorAddr, stakeAmount, commission = 0) {
  let status = Status.UNBONDED;
  let penaltyExpires;
  let currentShares = stakeAmount;
  // unbonding for a validator is all-or-nothing now. support partial unbonding.
  let unbondingFinishes = 0;

  // The complete collection of active delegations, redelegations and
  // unbondings. We don't yet reduce when unbonding expires, but we need to.
  // There should be a canonical live delegation for each pair of validator and
  // delegator. As bonding periods expire the shares would get merged back into
  // the canonical one.

  // maps from delegationKey to Set<Delegation>
  const delegationsByDelegator = makeStore('delegator');

  // use delegatorAddr as a key
  function delegationKey(delegation) {
    return delegation.getDelegator().getDelegatorAddr();
  }

  function storeDelegation(delegation) {
    const key = delegationKey(delegation);
    if (delegationsByDelegator.has(key)) {
      delegationsByDelegator.get(key).add(delegation);
    } else {
      const newSet = new Set();
      newSet.add(delegation);
      delegationsByDelegator.init(key, newSet);
    }
  }

  function replaceDelegation(priorDelegation, newDelegation) {
    const key = delegationKey(priorDelegation);
    assert(
      key === delegationKey(newDelegation),
      X`delegations must have same validator and delegator: ${key} !== delegationKey(newDelegation)`,
    );
    assert(
      delegationsByDelegator.has(key),
      X`priorDelegation must be in the set: ${key}`,
    );

    const delegationSet = delegationsByDelegator.get(key);
    delegationSet.delete(priorDelegation);
    delegationSet.add(newDelegation);
  }

  function addDelegation(delegator, stake) {
    // eslint-disable-next-line no-use-before-define
    const delegation = makeDelegation(delegator, stake, validator);
    storeDelegation(delegation);

    currentShares = add(currentShares, stake);
    delegator.addDelegation(delegation);
    return delegation;
  }

  // TODO(hibbert) returns one with at least share; should return a collection
  //  if there isn't one, and only fail if the total isn't enough
  function getDelegation(delegator, share) {
    const delegations = delegationsByDelegator.get(
      delegator.getDelegatorAddr(),
    );
    for (const [delegation] of delegations.entries()) {
      if (delegation.getStake() >= share) {
        return delegation;
      }
    }
    return undefined;
  }

  // a delegation is partially (or wholly) unbonding
  function unbond(replacement, original, delta) {
    replaceDelegation(original, replacement);
    currentShares = subtract(currentShares, delta);

    // TODO(hibbert): set a timer to clean up delegations
  }

  function redelegate(redelegation) {
    storeDelegation(redelegation);
    currentShares = add(currentShares, redelegation.getStake());
  }

  // redelegations name two validators. The source validator reduces the stake
  // assigned to them.
  function redelegateReduce(redelegation, original, replacement) {
    if (replacement) {
      replaceDelegation(original, replacement);
    } else {
      addDelegation(original);
    }
    currentShares = subtract(currentShares, redelegation.getStake());
  }

  // The validator is unbonding through choice or dropping from the active set.
  // All the delegations likewise
  function startUnbonding(end) {
    status = Status.UNBONDING;
    unbondingFinishes = end;
  }

  function rewardRecord(end, toCosmos, reward) {
    // const comm = commission.scale(reward);
    // const rew = commission.complement.scale(reward);
    // return {
    //   validatorAddr,
    //   end,
    //   reward,
    //   commission: 0,
    //   status,
    //   unbondingFinishes,
    //   currentShares,
    //   stakeAmount,
    // };

    // eslint-disable-next-line no-use-before-define
    toCosmos.commission(commission, validator);
    // eslint-disable-next-line no-use-before-define
    toCosmos.proposerReward(validator, reward);
  }

  function slash(slashFactor) {
    currentShares = floorDivide(
      multiply(subtract(100, slashFactor), currentShares),
      100.0,
    );
  }

  function slashDelegation(old, next) {
    replaceDelegation(old, next);
  }

  function totalStaked(block) {
    if (penaltyExpires && block < penaltyExpires) {
      return 0;
    }

    switch (status) {
      case Status.UNBONDED:
      case Status.HAS_LEFT:
      case Status.UNBONDING:
      default:
        return 0;

      case Status.BONDED:
        return currentShares;
    }
  }

  function penalize(start, duration) {
    penaltyExpires = add(start, duration);
  }

  function ready(timestamp) {
    if (timestamp < penaltyExpires) {
      // TODO(hibbert): set a timer and leave when it goes off
      // return a promise for the finish
      throw Error(`penalty doesn't expire until ${penaltyExpires}`);
    }
    return timestamp;
  }

  /** @type {Validator} */
  const validator = harden({
    addDelegation,
    getValidatorID: () => validatorAddr,
    setBonded: () => (status = Status.BONDED),
    setUnbonded: () => (status = Status.UNBONDED),
    startUnbonding,
    isBonded: () => Status.BONDED === status,
    isUnbonded: () => Status.UNBONDED === status,
    rewardRecord,
    totalStaked,
    unbond,
    redelegateReduce,
    redelegate,
    penalize,
    ready,
    slash,
    slashDelegation,
    getDelegation,
  });

  return validator;
}
