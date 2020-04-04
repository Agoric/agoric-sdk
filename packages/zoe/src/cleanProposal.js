import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import { mustBeComparable } from '@agoric/same-structure';

import { arrayToObj, assertSubset } from './objArrayConversion';

export const assertCapASCII = keyword => {
  assert.typeof(keyword, 'string');
  const firstCapASCII = /^[A-Z][a-zA-Z0-9_$]*$/;
  assert(
    firstCapASCII.test(keyword),
    details`keyword ${keyword} must be ascii and must start with a capital letter.`,
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
  amountMathKeywordRecord,
  allKeywords,
  allegedAmountKeywordRecord,
) => {
  const sparseKeywords = cleanKeys(allKeywords, allegedAmountKeywordRecord);
  // Check that each value can be coerced using the amountMath indexed
  // by keyword. `AmountMath.coerce` throws if coercion fails.
  const coercedAmounts = sparseKeywords.map(keyword =>
    amountMathKeywordRecord[keyword].coerce(
      allegedAmountKeywordRecord[keyword],
    ),
  );

  // Recreate the amountKeywordRecord with coercedAmounts.
  return arrayToObj(coercedAmounts, sparseKeywords);
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
  keywords.forEach(assertCapASCII);

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
export const cleanProposal = (
  issuerKeywordRecord,
  amountMathKeywordRecord,
  proposal,
) => {
  const rootKeysAllowed = ['want', 'give', 'exit'];
  mustBeComparable(proposal);
  assertKeysAllowed(rootKeysAllowed, proposal);

  // We fill in the default values if the keys are undefined.
  let { want = harden({}), give = harden({}) } = proposal;
  const { exit = harden({ onDemand: null }) } = proposal;

  const allKeywords = getKeywords(issuerKeywordRecord);
  want = coerceAmountKeywordRecord(amountMathKeywordRecord, allKeywords, want);
  give = coerceAmountKeywordRecord(amountMathKeywordRecord, allKeywords, give);

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
