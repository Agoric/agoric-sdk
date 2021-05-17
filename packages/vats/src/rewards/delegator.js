// @ts-check

import { natSafeMath } from '@agoric/zoe/src/contractSupport';

/** A Delegator that tracks which validators it has delegated to. */

const { subtract } = natSafeMath;

export function makeDelegator(delegatorAddr, initialStake) {
  // TODO(cth) This should probablyl be indexed by validator.

  // Now that we'll clean it up as time passes, there should be a canonical live
  // delegation for each pair of validator and delegator. As bonding periods
  // expire the shares would get merged back into the canonical one.

  const delegations = new Set();

  // unpledged is really "never pledged". Until we monitor unbondings, and
  // respond when they mature, we qon't know how much is available to be
  // withdrawn or delegated anew.
  let unpledgedStake = initialStake;

  let totalStake = initialStake;

  // We track totalStake and unPledged. You can directly delegate() stake that
  // is pristine. Otherwise you have to identify the previous
  // delegation/redelegation/unbonding and redelegate() it. If identified
  // redelegation/unbonding stake has matured, you'll get a clean new
  // delegation. This will be true until we clean up unbonding at every block.
  //
  // When unbonding stakes are proactively settled, we could track pledged,
  // unpledged, unbonding and repledging as time-indexed delegations.
  // Unpledged is incremented by deposits and matured unbonding, and
  //  decremented by delegation and withdrawals.
  // Pledged is incremented by delegation and matured redelegations, and
  // decremented by unbonding. Redelegation of pledged stake doesn't move stake.
  // Pledging is incremented by redelegation of unbonding stake, and decremented
  //  when those mature.
  // Unbonding is incremented by unbonding and decremented by redelegation.
  // Notice that redelegation of pledged assets doesn't change these sums

  function addDelegation(delegation) {
    delegations.add(delegation);
    const delta = delegation.getStake();
    unpledgedStake = subtract(unpledgedStake, delta);
  }

  function unbond(delegation, delta, end) {
    if (!delegations.has(delegation)) {
      throw Error(`must identify one of my delegations`);
    }

    const { unbonding, replacement } = delegation.unbond(delta, end);
    delegations.delete(delegation);
    delegations.add(unbonding);
    if (replacement) {
      delegations.add(replacement);
    }
    return { unbonding, replacement };
  }

  function redelegate(delegation, destValidator, delta, end) {
    if (!delegations.has(delegation)) {
      throw Error(`must identify one of my delegations`);
    }

    const { redelegation, replacement } = delegation.redelegate(
      destValidator,
      delta,
      end,
    );
    delegations.delete(delegation);
    delegations.add(redelegation);
    if (replacement) {
      delegations.add(replacement);
    }

    return { redelegation, replacement };
  }

  function slashed(slashValue, old, next) {
    totalStake = subtract(totalStake, slashValue);
    delegations.delete(old);
    delegations.add(next);
  }

  /** @type {Delegator} */
  return harden({
    addDelegation,
    unbond,
    redelegate,
    getDelegatorAddr: _ => delegatorAddr,
    slashed,
    getStake: _ => totalStake,
  });
}
