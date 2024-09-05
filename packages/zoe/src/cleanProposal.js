import { assert, q, Fail } from '@endo/errors';
import { AmountMath, getAssetKind } from '@agoric/ertp';
import { objectMap } from '@agoric/internal';
import { assertRecord } from '@endo/marshal';
import { assertKey, assertPattern, mustMatch, isKey } from '@agoric/store';
import { FullProposalShape } from './typeGuards.js';

import './internal-types.js';

const { ownKeys } = Reflect;

export const MAX_KEYWORD_LENGTH = 100;

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
  keyword.length <= MAX_KEYWORD_LENGTH ||
    Fail`keyword ${q(keyword)} exceeded maximum length ${q(
      MAX_KEYWORD_LENGTH,
    )} characters; got ${keyword.length}`;
  firstCapASCII.test(keyword) ||
    Fail`keyword ${q(
      keyword,
    )} must be an ascii identifier starting with upper case.`;
  (keyword !== 'NaN' && keyword !== 'Infinity') ||
    Fail`keyword ${q(keyword)} must not be a number's name`;
};

/**
 * @param {{[name: string]: any}} uncleanKeywordRecord
 * @returns {string[]}
 */
export const cleanKeywords = uncleanKeywordRecord => {
  harden(uncleanKeywordRecord);
  assertRecord(uncleanKeywordRecord, 'keywordRecord');
  const keywords = ownKeys(uncleanKeywordRecord);

  // Assert all names are ascii identifiers starting with
  // an upper case letter.
  for (const keyword of keywords) {
    assertKeywordName(keyword);
  }

  return /** @type {string[]} */ (keywords);
};

export const coerceAmountPatternKeywordRecord = (
  allegedAmountKeywordRecord,
  getAssetKindByBrand,
) => {
  cleanKeywords(allegedAmountKeywordRecord);
  // FIXME objectMap should constrain the mapping function by the record's type
  return objectMap(allegedAmountKeywordRecord, amount => {
    // Check that each value can be coerced using the AmountMath
    // indicated by brand. `AmountMath.coerce` throws if coercion fails.
    if (isKey(amount)) {
      const brandAssetKind = getAssetKindByBrand(amount.brand);
      const assetKind = getAssetKind(amount);
      // TODO: replace this assertion with a check of the assetKind
      // property on the brand, when that exists.
      assetKind === brandAssetKind ||
        Fail`The amount ${amount} did not have the assetKind of the brand ${brandAssetKind}`;
      return AmountMath.coerce(amount.brand, amount);
    } else {
      assertPattern(amount);
      return amount;
    }
  });
};

/**
 *
 * @param {unknown} allegedAmountKeywordRecord
 * @param {*} getAssetKindByBrand
 * @returns {AmountKeywordRecord}
 */
export const coerceAmountKeywordRecord = (
  allegedAmountKeywordRecord,
  getAssetKindByBrand,
) => {
  const result = coerceAmountPatternKeywordRecord(
    allegedAmountKeywordRecord,
    getAssetKindByBrand,
  );
  assertKey(result);
  // @ts-expect-error checked cast
  return result;
};

/**
 * Just checks residual issues after matching ProposalShape.
 * Only known residual issue is verifying that it only has one of the
 * optional properties.
 *
 * @param {ExitRule} exit
 */
const assertExit = exit =>
  ownKeys(exit).length === 1 || Fail`exit ${exit} should only have one key`;

/**
 * check that keyword is not in both 'want' and 'give'.
 *
 * @param {ProposalRecord["want"]} want
 * @param {ProposalRecord["give"]} give
 */
const assertKeywordNotInBoth = (want, give) => {
  const wantKeywordSet = new Set(ownKeys(want));
  const giveKeywords = ownKeys(give);

  for (const keyword of giveKeywords) {
    !wantKeywordSet.has(keyword) ||
      Fail`a keyword cannot be in both 'want' and 'give'`;
  }
};

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
 * @param {GetAssetKindByBrand} getAssetKindByBrand
 * @returns {ProposalRecord}
 */
export const cleanProposal = (proposal, getAssetKindByBrand) => {
  assertRecord(proposal, 'proposal');
  // We fill in the default values if the keys are absent or undefined.
  const {
    want = harden({}),
    give = harden({}),
    exit = harden({ onDemand: null }),
    ...rest
  } = proposal;
  ownKeys(rest).length === 0 ||
    Fail`${proposal} - Must only have want:, give:, exit: properties: ${rest}`;

  const cleanedWant = coerceAmountPatternKeywordRecord(
    want,
    getAssetKindByBrand,
  );
  const cleanedGive = coerceAmountKeywordRecord(give, getAssetKindByBrand);

  const cleanedProposal = harden({
    want: cleanedWant,
    give: cleanedGive,
    exit,
  });
  mustMatch(cleanedProposal, FullProposalShape, 'proposal');
  assertExit(exit);
  assertKeywordNotInBoth(cleanedWant, cleanedGive);
  return cleanedProposal;
};
