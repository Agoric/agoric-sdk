// @ts-check

import { AmountMath } from '@agoric/ertp';
import { assertStructure } from '@agoric/marshal';
import { isNat } from '@agoric/nat';

import { assertArray, assertRecord } from './assertPassStyleOf.js';

const { details: X } = assert;

/**
 * Constants for the kinds of closing conditions we support.
 *
 * @type {ClosingConditionChoices}
 */
const CLOSING_CONDITIONS = {
  AFTER_DEADLINE: 'afterDeadline',
  ON_DEMAND: 'onDemand',
  OPTIMISTIC: 'optimistic',
};
harden(CLOSING_CONDITIONS);

/**
 * // TODO: define Conditions
 *
 * @param {Conditions} conditions
 * @returns {Conditions}
 */
const cleanConditions = conditions => {
  // This check ensures that there are no promises in the conditions.
  // TODO: improve error message?
  assertStructure(conditions);
  // TODO: is this unnecessary given assertStructure? What should the
  // order be?
  assertRecord(conditions, 'conditions');
  const { wantedAmounts = [], closingConditions } = conditions;
  assertArray(wantedAmounts, 'wantedAmounts');
  // TODO: cleanProposal.js had a check that the perceived assetKind
  // of the value matched the brand's assetKind. Consider alternative
  // approaches or include that here. It seems like that should be
  // part of ERTP instead.
  const cleanedWantedAllocation = wantedAmounts.map(amount =>
    AmountMath.coerce(amount.brand, amount),
  );

  let cleanedClosingConditions = harden({
    condition: CLOSING_CONDITIONS.ON_DEMAND,
  });

  if (closingConditions) {
    assertRecord(closingConditions, 'closingConditions');
    const { condition } = closingConditions;
    // TODO: clean this up
    if (condition === CLOSING_CONDITIONS.AFTER_DEADLINE) {
      assert(closingConditions.timer !== undefined, X`timer must be defined`);
      assert(
        typeof closingConditions.deadline === 'bigint' &&
          isNat(closingConditions.deadline),
        X`deadline must be a Nat BigInt`,
      );
      cleanedClosingConditions = harden({
        condition: CLOSING_CONDITIONS.AFTER_DEADLINE,
        timer: closingConditions.timer,
        deadline: closingConditions.deadline,
      });
    } else {
      assert(
        condition === CLOSING_CONDITIONS.ON_DEMAND,
        `Closing conditions can only be AFTER_DEADLINE or ON_DEMAND, not ${condition}`,
      );
    }
    // TODO: add handling for OPTIMISTIC
  }
  return harden({
    wantedAllocation: cleanedWantedAllocation,
    closingConditions: cleanedClosingConditions,
  });
};
harden(cleanConditions);
export { cleanConditions, CLOSING_CONDITIONS };
