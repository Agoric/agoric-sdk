import { assert, details, q } from '@agoric/assert';
import { mustBeComparable } from '@agoric/same-structure';

import { arrayToObj, assertSubset } from './objArrayConversion';

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
  const firstCapASCII = /^[A-Z][a-zA-Z0-9_$]*$/;
  assert(
    firstCapASCII.test(keyword),
    details`keyword ${q(
      keyword,
    )} must be ascii and must start with a capital letter.`,
  );
  assert(
    keyword !== 'NaN' && keyword !== 'Infinity',
    details`keyword ${q(keyword)} must not be a number's name`,
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
    details`no symbol properties allowed`,
  );
};

const cleanKeys = (allowedKeys, record) => {
  assertKeysAllowed(allowedKeys, record);
  return Object.getOwnPropertyNames(record);
};

export const getKeywords = keywordRecord =>
  harden(Object.getOwnPropertyNames(keywordRecord));

export const coerceAmountKeywordRecord = (
  getAmountMath,
  allegedAmountKeywordRecord,
) => {
  const keywords = getKeywords(allegedAmountKeywordRecord);
  keywords.forEach(assertKeywordName);

  const amounts = Object.values(allegedAmountKeywordRecord);
  // Check that each value can be coerced using the amountMath
  // indicated by brand. `AmountMath.coerce` throws if coercion fails.
  const coercedAmounts = amounts.map(amount =>
    getAmountMath(amount.brand).coerce(amount),
  );

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
    details`no symbol properties allowed`,
  );

  // Assert all key characters are ascii and keys start with a
  // capital letter.
  keywords.forEach(assertKeywordName);

  return keywords;
};

// cleanProposal checks the keys and values of the proposal, including
// the keys and values of the internal objects. The proposal may have
// the following keys: `give`, `want`, and `exit`. These keys may be
// omitted in the `proposal` argument passed to cleanProposal, but
// anything other than these keys is not allowed. The values of `give`
// and `want` must be "amountKeywordRecords", meaning that the keys
// must be keywords and the values must be amounts. The value of
// `exit`, if present, must be a record of one of the following forms:
// `{ waived: null }` `{ onDemand: null }` `{ afterDeadline: { timer
// :Timer, deadline :Number } }
export const cleanProposal = (getAmountMath, proposal) => {
  const rootKeysAllowed = ['want', 'give', 'exit'];
  mustBeComparable(proposal);
  assertKeysAllowed(rootKeysAllowed, proposal);

  // We fill in the default values if the keys are undefined.
  let { want = harden({}), give = harden({}) } = proposal;
  const { exit = harden({ onDemand: null }) } = proposal;

  want = coerceAmountKeywordRecord(getAmountMath, want);
  give = coerceAmountKeywordRecord(getAmountMath, give);

  // Check exit
  assert(
    Object.getOwnPropertyNames(exit).length === 1,
    details`exit ${proposal.exit} should only have one key`,
  );
  // We expect the single exit key to be one of the following:
  const allowedExitKeys = ['onDemand', 'afterDeadline', 'waived'];
  const [exitKey] = cleanKeys(allowedExitKeys, exit);
  if (exitKey === 'onDemand' || exitKey === 'waived') {
    assert(
      exit[exitKey] === null,
      `exit value must be null for key ${exitKey}`,
    );
  }
  if (exitKey === 'afterDeadline') {
    const expectedAfterDeadlineKeys = ['timer', 'deadline'];
    assertKeysAllowed(expectedAfterDeadlineKeys, exit.afterDeadline);
    assert(
      exit.afterDeadline.timer !== undefined,
      details`timer must be defined`,
    );
    assert(
      exit.afterDeadline.deadline !== undefined,
      details`deadline must be defined`,
    );
    // timers must have a 'setWakeup' function which takes a deadline
    // and an object as arguments.
    // TODO: document timer interface
    // https://github.com/Agoric/agoric-sdk/issues/751
    // TODO: how to check methods on presences?
  }

  // check that keyword is not in both 'want' and 'give'.
  const wantKeywordSet = new Set(Object.getOwnPropertyNames(want));
  const giveKeywords = Object.getOwnPropertyNames(give);

  giveKeywords.forEach(keyword => {
    assert(
      !wantKeywordSet.has(keyword),
      details`a keyword cannot be in both 'want' and 'give'`,
    );
  });

  return harden({ want, give, exit });
};
