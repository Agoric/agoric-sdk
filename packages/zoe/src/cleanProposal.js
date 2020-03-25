import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import { mustBeComparable } from '@agoric/same-structure';

import { arrayToObj } from './objArrayConversion';

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

// Assert that the keys of record, if present, are in expectedKeys.
// Return the keys after asserting this.
const checkKeys = (expectedKeys, record) => {
  // Assert that keys, if present, match expectedKeys.
  const keys = Object.getOwnPropertyNames(record);
  keys.forEach(key => {
    assert.typeof(key, 'string');
    assert(
      expectedKeys.includes(key),
      details`key ${key} was not an expected key`,
    );
  });
  // assert that there are no symbol properties.
  assert(
    Object.getOwnPropertySymbols(record).length === 0,
    details`no symbol properties allowed`,
  );
  return keys;
};

const coerceAmountKeywordRecordValues = (
  amountMathKeywordRecord,
  validatedKeywords,
  allegedAmountKeywordRecord,
) => {
  // Check that each value can be coerced using the amountMath indexed
  // by keyword. `AmountMath.coerce` throws if coercion fails.
  const coercedAmounts = validatedKeywords.map(keyword =>
    amountMathKeywordRecord[keyword].coerce(
      allegedAmountKeywordRecord[keyword],
    ),
  );

  // Recreate the amountKeywordRecord with coercedAmounts.
  return arrayToObj(coercedAmounts, validatedKeywords);
};

export const coerceAmountKeywordRecord = (
  amountMathKeywordRecord,
  keywords,
  allegedAmountKeywordRecord,
) => {
  const validatedKeywords = checkKeys(keywords, allegedAmountKeywordRecord);
  return coerceAmountKeywordRecordValues(
    amountMathKeywordRecord,
    validatedKeywords,
    allegedAmountKeywordRecord,
  );
};

export const cleanProposal = (keywords, amountMathKeywordRecord, proposal) => {
  const expectedRootKeys = ['want', 'give', 'exit'];
  mustBeComparable(proposal);
  checkKeys(expectedRootKeys, proposal);

  // We fill in the default values if the keys are undefined.
  let { want = harden({}), give = harden({}) } = proposal;
  const { exit = harden({ onDemand: null }) } = proposal;

  want = coerceAmountKeywordRecord(amountMathKeywordRecord, keywords, want);
  give = coerceAmountKeywordRecord(amountMathKeywordRecord, keywords, give);

  // Check exit
  assert(
    Object.getOwnPropertyNames(exit).length === 1,
    details`exit ${proposal.exit} should only have one key`,
  );
  // We expect the single exit key to be one of the following:
  const expectedExitKeys = ['onDemand', 'afterDeadline', 'waived'];
  const [exitKey] = checkKeys(expectedExitKeys, exit);
  if (exitKey === 'onDemand' || exitKey === 'waived') {
    assert(
      exit[exitKey] === null,
      `exit value must be null for key ${exitKey}`,
    );
  }
  if (exitKey === 'afterDeadline') {
    const expectedAfterDeadlineKeys = ['timer', 'deadline'];
    checkKeys(expectedAfterDeadlineKeys, exit.afterDeadline);
    // timers must have a 'setWakeup' function which takes a deadline
    // and an object as arguments.
    // TODO: document timer interface
    // https://github.com/Agoric/agoric-sdk/issues/751
    // TODO: how to check methods on presences?
  }

  const hasPropDefined = (obj, prop) => obj[prop] !== undefined;

  // Create an unfrozen version of 'want' in case we need to add
  // properties.
  const wantObj = { ...want };

  keywords.forEach(keyword => {
    // check that keyword is not in both 'want' and 'give'.
    const wantHas = hasPropDefined(wantObj, keyword);
    const giveHas = hasPropDefined(give, keyword);
    assert(
      !(wantHas && giveHas),
      details`a keyword cannot be in both 'want' and 'give'`,
    );
    // If keyword is in neither, fill in with a 'want' of empty.
    if (!(wantHas || giveHas)) {
      wantObj[keyword] = amountMathKeywordRecord[keyword].getEmpty();
    }
  });

  return harden({
    want: wantObj,
    give,
    exit,
  });
};
