// @ts-check

import { assert, details as X, q } from '@agoric/assert';
import { mustBeComparable } from '@agoric/same-structure';
import { isNat } from '@agoric/nat';
import { amountMath, getMathKind, MathKind } from '@agoric/ertp';
import {
  isOnDemandExitRule,
  isWaivedExitRule,
  isAfterDeadlineExitRule,
} from './typeGuards';

import '../exported';
import './internal-types';

import { arrayToObj, assertSubset } from './objArrayConversion';

const firstCapASCII = /^[A-Z][a-zA-Z0-9_$]*$/;

// We adopt simple requirements on keywords so that they do not accidentally
// conflict with existing property names.
// We require keywords to be strings, ascii identifiers beginning with an
// upper case letter, and distinct from the stringified form of any number.
//
// Of numbers, only NaN and Infinity, when stringified to a property name,
// produce an ascii identifier beginning with an upper case letter.
// With this rule, a computed indexing expression like `a[+i]` cannot
// lookup a keyword-named property no matter what `i` is.
export const assertKeywordName = keyword => {
  assert.typeof(keyword, 'string');
  assert(
    firstCapASCII.test(keyword),
    X`keyword ${q(
      keyword,
    )} must be ascii and must start with a capital letter.`,
  );
  assert(
    keyword !== 'NaN' && keyword !== 'Infinity',
    X`keyword ${q(keyword)} must not be a number's name`,
  );
};

// Assert that the keys of `record` are all in `allowedKeys`. If a key
// of `record` is not in `allowedKeys`, throw an error. If a key in
// `allowedKeys` is not a key of record, we do not throw an error.
const assertKeysAllowed = (allowedKeys, record) => {
  const keys = Object.getOwnPropertyNames(record);
  assertSubset(allowedKeys, keys);
  // assert that there are no symbol properties.
  assert(
    Object.getOwnPropertySymbols(record).length === 0,
    X`no symbol properties allowed`,
  );
};

const cleanKeys = (allowedKeys, record) => {
  assertKeysAllowed(allowedKeys, record);
  return harden(Object.getOwnPropertyNames(record));
};

export const getKeywords = keywordRecord =>
  harden(Object.getOwnPropertyNames(keywordRecord));

const coerceAmountKeywordRecord = (
  allegedAmountKeywordRecord,
  getMathKindByBrand,
) => {
  const keywords = getKeywords(allegedAmountKeywordRecord);
  keywords.forEach(assertKeywordName);

  const amounts = Object.values(allegedAmountKeywordRecord);
  // Check that each value can be coerced using the amountMath
  // indicated by brand. `AmountMath.coerce` throws if coercion fails.
  const coercedAmounts = amounts.map(amount => {
    const brandMathKind = getMathKindByBrand(amount.brand);
    const amountMathKind = getMathKind(amount);
    // TODO: replace this assertion with a check of the mathKind
    // property on the brand, when that exists. Additionally, remove
    // the deprecated STRING_SET
    assert(
      amountMathKind === brandMathKind ||
        (brandMathKind === MathKind.STRING_SET &&
          amountMathKind === MathKind.SET),
      X`The amount ${amount} did not have the mathKind of the brand ${brandMathKind}`,
    );
    return amountMath.coerce(amount, amount.brand);
  });

  // Recreate the amountKeywordRecord with coercedAmounts.
  return arrayToObj(coercedAmounts, keywords);
};

export const cleanKeywords = keywordRecord => {
  // `getOwnPropertyNames` returns all the non-symbol properties
  // (both enumerable and non-enumerable).
  const keywords = Object.getOwnPropertyNames(keywordRecord);

  // Insist that there are no symbol properties.
  assert(
    Object.getOwnPropertySymbols(keywordRecord).length === 0,
    X`no symbol properties allowed`,
  );

  // Assert all key characters are ascii and keys start with a
  // capital letter.
  keywords.forEach(assertKeywordName);

  return keywords;
};

const expectedAfterDeadlineKeys = harden(['timer', 'deadline']);

const assertAfterDeadlineExitRule = exit => {
  assertKeysAllowed(expectedAfterDeadlineKeys, exit.afterDeadline);
  assert(exit.afterDeadline.timer !== undefined, X`timer must be defined`);
  assert(
    typeof exit.afterDeadline.deadline === 'bigint' &&
      isNat(exit.afterDeadline.deadline),
    X`deadline must be a Nat BigInt`,
  );
};

const assertExitValueNull = (exit, exitKey) =>
  assert(exit[exitKey] === null, `exit value must be null for key ${exitKey}`);

// We expect the single exit key to be one of the following:
const allowedExitKeys = harden(['onDemand', 'afterDeadline', 'waived']);

const assertExit = exit => {
  assert(
    Object.getOwnPropertyNames(exit).length === 1,
    X`exit ${exit} should only have one key`,
  );

  const [exitKey] = cleanKeys(allowedExitKeys, exit);
  if (isOnDemandExitRule(exit) || isWaivedExitRule(exit)) {
    assertExitValueNull(exit, exitKey);
  }
  if (isAfterDeadlineExitRule(exit)) {
    assertAfterDeadlineExitRule(exit);
  }
};

/**
 * check that keyword is not in both 'want' and 'give'.
 *
 * @param {Proposal["want"]} want
 * @param {Proposal["give"]} give
 */
const assertKeywordNotInBoth = (want, give) => {
  const wantKeywordSet = new Set(Object.getOwnPropertyNames(want));
  const giveKeywords = Object.getOwnPropertyNames(give);

  giveKeywords.forEach(keyword => {
    assert(
      !wantKeywordSet.has(keyword),
      X`a keyword cannot be in both 'want' and 'give'`,
    );
  });
};

const rootKeysAllowed = harden(['want', 'give', 'exit']);

/**
 * cleanProposal checks the keys and values of the proposal, including
 * the keys and values of the internal objects. The proposal may have
 * the following keys: `give`, `want`, and `exit`. These keys may be
 * omitted in the `proposal` argument passed to cleanProposal, but
 * anything other than these keys is not allowed. The values of `give`
 * and `want` must be "amountKeywordRecords", meaning that the keys
 * must be keywords and the values must be amounts. The value of
 * `exit`, if present, must be a record of one of the following forms:
 * `{ waived: null }` `{ onDemand: null }` `{ afterDeadline: { timer
 * :Timer, deadline :bigint } }
 *
 * @param {Proposal} proposal
 * @param {GetMathKindByBrand} getMathKindByBrand
 * @returns {ProposalRecord}
 */
export const cleanProposal = (proposal, getMathKindByBrand) => {
  mustBeComparable(proposal);
  assertKeysAllowed(rootKeysAllowed, proposal);

  // We fill in the default values if the keys are undefined.
  let { want = harden({}), give = harden({}) } = proposal;

  const {
    /** @type {ExitRule} */ exit = harden({ onDemand: null }),
  } = proposal;

  want = coerceAmountKeywordRecord(want, getMathKindByBrand);
  give = coerceAmountKeywordRecord(give, getMathKindByBrand);

  assertExit(exit);

  assertKeywordNotInBoth(want, give);

  return harden({ want, give, exit });
};
