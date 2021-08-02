// @ts-check

import {
  assertChecker,
  everyPassableChild,
  Far,
  getPassStyleCover,
  getTag,
  intersectRankCovers,
  makeTagged,
  passStyleOf,
  somePassableChild,
  unionRankCovers,
} from '@agoric/marshal';
import { keyEQ, keyGT, keyGTE, keyLT, keyLTE } from '../keys/compareKeys.js';
import { checkKey, isKey } from '../keys/checkKey.js';
import { checkCopySet, makeCopySet } from '../keys/copySet.js';
import { checkCopyMap, copyMapKeySet } from '../keys/copyMap.js';

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

const { entries, fromEntries } = Object;
const { ownKeys } = Reflect;
const { quote: q, details: X } = assert;

/**
 * If this is a recognized match tag, return the MatchHelper.
 * Otherwise result undefined.
 *
 * @param {string} tag
 * @returns {MatchHelper=}
 */
const maybeMatchHelper = tag =>
  // eslint-disable-next-line no-use-before-define
  HelpersByMatchTag[tag];

// /////////////////////// isPattern ///////////////////////////////////////////

/** @type WeakSet<Pattern> */
const patternMemo = new WeakSet();

/** @type {CheckPattern} */
export const checkPattern = (patt, check = x => x) => {
  if (isKey(patt)) {
    // All keys are patterns. For these, the keyMemo will do.
    // All primitives that are patterns are also keys, which this
    // also takes care of without memo. The rest of our checking logic
    // is only concerned with non-key patterns.
    return true;
  }
  // eslint-disable-next-line no-use-before-define
  const result = checkPatternInternal(patt, check);
  if (result) {
    patternMemo.add(patt);
  }
  return result;
};
harden(checkPattern);

/**
 * @param {Passable} patt
 * @param {Checker=} check
 * @returns {boolean}
 */
const checkPatternInternal = (patt, check = x => x) => {
  // Purposely parallels checkKey. TODO reuse more logic between them.
  // Most of the text of the switch below not dealing with matchers is
  // essentially identical.
  const checkIt = child => checkPattern(child, check);

  const passStyle = passStyleOf(patt);
  switch (passStyle) {
    case 'copyRecord':
    case 'copyArray': {
      // A copyRecord or copyArray is a pattern iff all its children are
      // patterns
      return everyPassableChild(patt, checkIt);
    }
    case 'tagged': {
      const tag = getTag(patt);
      const matchHelper = maybeMatchHelper(tag);
      if (matchHelper !== undefined) {
        // This check guarantees the payload invariants assumed by the other
        // matchHelper methods.
        return matchHelper.checkIsMatcherPayload(patt.payload, check);
      }
      switch (tag) {
        case 'copySet': {
          if (!checkCopySet(patt, check)) {
            return false;
          }
          // For a copySet to be a pattern, all its elements must be patterns.
          // If all the elements are keys, then the copySet pattern is also
          // a key and is already taken of. For the case where some elements
          // are non-key patterns, general support is both hard and not
          // currently needed. Currently, we only need a copySet of a single
          // non-key pattern element.
          assert(
            patt.payload.length === 1,
            X`Non-singleton copySets with matcher not yet implemented: ${patt}`,
          );
          return checkPattern(patt.payload[0], check);
        }
        case 'copyMap': {
          return (
            checkCopyMap(patt, check) &&
            // For a copyMap to be a pattern, all its keys and values must
            // be patterns. For value patterns, we support full pattern
            // matching. For key patterns, only support
            // the same limited matching as with copySet elements.

            // Check keys as a copySet
            checkPattern(copyMapKeySet(patt), check) &&
            // Check values as a copyMap
            checkPattern(patt.values, check)
          );
        }
        default: {
          return check(
            false,
            X`A passable tagged ${q(tag)} is not a key: ${patt}`,
          );
        }
      }
    }
    case 'error':
    case 'promise': {
      return check(false, X`A ${q(passStyle)} cannot be a pattern`);
    }
    default: {
      // Unexpected tags are just non-patterns, but an unexpected passStyle
      // is always an error.
      assert.fail(X`unexpected passStyle ${q(passStyle)}: ${patt}`);
    }
  }
};

/**
 * @param {Passable} patt
 * @returns {boolean}
 */
export const isPattern = patt => checkPattern(patt);
harden(isPattern);

/**
 * @param {Pattern} patt
 */
export const assertPattern = patt => {
  checkPattern(patt, assertChecker);
};
harden(assertPattern);

// /////////////////////// matches /////////////////////////////////////////////

/** @type {CheckMatches} */
export const checkMatches = (specimen, patt, check = x => x) => {
  if (isKey(patt)) {
    // Takes care of all patterns which are keys, so the rest of this
    // logic can assume patterns that are not key.
    return check(
      keyEQ(specimen, patt),
      X`${specimen} - Must be equivalent to the literal pattern: ${patt}`,
    );
  }
  const specStyle = passStyleOf(specimen);
  const pattStyle = passStyleOf(patt);
  switch (pattStyle) {
    case 'copyArray': {
      if (specStyle !== 'copyArray') {
        return check(
          false,
          X`${specimen} - Must be a copyArray to match a copyArray pattern: ${patt}`,
        );
      }
      const { length } = patt;
      if (specimen.length !== length) {
        return check(
          false,
          X`Array ${specimen} - must be as long as copyArray pattern: ${patt}`,
        );
      }
      return everyPassableChild(patt, (p, i) =>
        checkMatches(specimen[i], p, check),
      );
    }
    case 'copyRecord': {
      if (specStyle !== 'copyRecord') {
        return check(
          false,
          X`${specimen} - Must be a copyRecord to match a copyRecord pattern: ${patt}`,
        );
      }
      const specNames = harden(
        ownKeys(specimen)
          .sort()
          .reverse(),
      );
      const pattNames = harden(
        ownKeys(patt)
          .sort()
          .reverse(),
      );
      if (!keyEQ(specNames, pattNames)) {
        return check(
          false,
          X`Record ${specimen} - Must have same property names as record pattern: ${patt}`,
        );
      }
      const specValues = harden(specNames.map(name => specimen[name]));
      const pattValues = harden(pattNames.map(name => patt[name]));
      return checkMatches(specValues, pattValues, check);
    }
    case 'tagged': {
      const pattTag = getTag(patt);
      const matchHelper = maybeMatchHelper(pattTag);
      if (matchHelper) {
        return matchHelper.checkMatches(specimen, patt.payload, check);
      }
      const msg = X`${specimen} - Only a ${q(pattTag)} matches a ${q(
        pattTag,
      )} pattern: ${patt}`;
      if (specStyle !== 'tagged') {
        return check(false, msg);
      }
      const specTag = getTag(specimen);
      if (pattTag !== specTag) {
        return check(false, msg);
      }
      const { payload: pattPayload } = patt;
      const { payload: specPayload } = specimen;
      switch (pattTag) {
        case 'copySet': {
          if (!checkCopySet(specimen, check)) {
            return false;
          }
          if (pattPayload.length !== specPayload.length) {
            return check(
              false,
              X`copySet ${specimen} - Must have as many elements as copySet pattern: ${patt}`,
            );
          }
          // Should already be validated by checkPattern. But because this
          // is a check that may loosen over time, we also assert everywhere
          // we still rely on the restriction.
          assert(
            patt.payload.length === 1,
            X`Non-singleton copySets with matcher not yet implemented: ${patt}`,
          );
          return checkMatches(specPayload[0], pattPayload[0], check);
        }
        case 'copyMap': {
          if (!checkCopySet(specimen, check)) {
            return false;
          }
          const pattKeySet = copyMapKeySet(pattPayload);
          const specKeySet = copyMapKeySet(specPayload);
          // Compare keys as copySets
          if (checkMatches(specKeySet, pattKeySet, check)) {
            return false;
          }
          const pattValues = pattPayload.values;
          const specValues = specPayload.values;
          // compare values as copyArrays
          return checkMatches(specValues, pattValues, check);
        }
        default: {
          assert.fail(X`Unexpected tag ${q(pattTag)}`);
        }
      }
    }
    default: {
      assert.fail(X`unexpected passStyle ${q(pattStyle)}: ${patt}`);
    }
  }
};
harden(checkMatches);

/**
 * @param {Passable} specimen
 * @param {Pattern} patt
 * @returns {boolean}
 */
export const matches = (specimen, patt) => checkMatches(specimen, patt);
harden(matches);

/**
 * @param {Passable} specimen
 * @param {Pattern} patt
 */
export const assertMatches = (specimen, patt) => {
  checkMatches(specimen, patt, assertChecker);
};
harden(assertMatches);

// /////////////////////// getRankCover ////////////////////////////////////////

/** @type {GetRankCover} */
const getRankCover = patt => {
  if (isKey(patt)) {
    return [patt, patt];
  }
  const passStyle = passStyleOf(patt);
  switch (passStyle) {
    case 'copyArray': {
      const rankCovers = patt.map(p => getRankCover(p));
      return harden([
        rankCovers.map(([left, _right]) => left),
        rankCovers.map(([_left, right]) => right),
      ]);
    }
    case 'copyRecord': {
      const pattKeys = ownKeys(patt);
      const pattEntries = harden(pattKeys.map(key => [key, patt[key]]));
      const [leftEntriesLimit, rightEntriesLimit] = getRankCover(pattEntries);
      return harden([
        fromEntries(leftEntriesLimit),
        fromEntries(rightEntriesLimit),
      ]);
    }
    case 'tagged': {
      const tag = getTag(patt);
      const matchHelper = maybeMatchHelper(tag);
      if (matchHelper) {
        return matchHelper.getRankCover(patt.payload);
      }
      switch (tag) {
        case 'copySet': {
          // Should already be validated by checkPattern. But because this
          // is a check that may loosen over time, we also assert everywhere
          // we still rely on the restriction.
          assert(
            patt.payload.length === 1,
            X`Non-singleton copySets with matcher not yet implemented: ${patt}`,
          );

          const [leftElementLimit, rightElementLimit] = getRankCover(
            patt.payload[0],
          );
          return harden([
            makeCopySet([leftElementLimit]),
            makeCopySet([rightElementLimit]),
          ]);
        }
        case 'copyMap': {
          // A matching copyMap must have the same keys, or at most one
          // non-key key pattern. Thus we can assume that value positions
          // match 1-to-1.
          //
          // TODO I may be overlooking that the less precise rankOrder
          // equivalence class may cause values to be out of order,
          // making this rankCover not actually cover. In that case, for
          // all the values for keys at the same rank, we should union their
          // rank covers. TODO POSSIBLE SILENT CORRECTNESS BUG
          //
          // If this is a bug, it probably affects the getRankCover
          // cases if matchLTEHelper and matchGTEHelper on copyMap as
          // well. See makeCopyMap for an idea on fixing
          // this bug.
          const [leftPayloadLimit, rightPayloadLimit] = getRankCover(
            patt.payload,
          );
          return harden([
            makeTagged('copyMap', leftPayloadLimit),
            makeTagged('copyMap', rightPayloadLimit),
          ]);
        }
        default: {
          break; // fall through to default
        }
      }
      break; // fall through to default
    }
    default: {
      break; // fall through to default
    }
  }
  return getPassStyleCover(passStyle);
};

// /////////////////////// Match Helpers ///////////////////////////////////////

/** @type {MatchHelper} */
const matchAnyHelper = Far('M.any helper', {
  checkIsMatcherPayload: (matcherPayload, check = x => x) =>
    check(
      matcherPayload === undefined,
      X`An M.any matcher's .payload must be undefined: ${matcherPayload}`,
    ),

  checkMatches: (_specimen, _matcherPayload, _check = x => x) => true,

  getRankCover: _matchPayload => [null, undefined],
});

/** @type {MatchHelper} */
const matchKindHelper = Far('M.kind helper', {
  checkIsMatcherPayload: (allegedKeyKind, check = x => x) =>
    check(
      // We cannot further restrict this to only possible passStyles
      // or tags, because we wish to allow matching of tags that we
      // don't know ahead of time. Do we need to separate the namespaces?
      // TODO are we asking for trouble by lumping passStyles and tags
      // together into kinds?
      typeof allegedKeyKind === 'string',
      X`A kind name must be a string: ${allegedKeyKind}`,
    ),

  checkMatches: (specimen, kind, check = x => x) =>
    check(
      passStyleOf(specimen) === kind ||
        (passStyleOf(specimen) === 'tagged' && getTag(specimen) === kind),
      X`${specimen} - Must have passStyle or tag ${q(kind)}`,
    ),

  getRankCover: kind => {
    switch (kind) {
      case 'copySet': {
        // The bounds in the cover are not valid copySets, which is fine.
        // They only need to be valid copyTagged that bound all possible
        // copySets. Thus, we need to call makeTagged directly, rather
        // than using makeCopySet.
        return [makeTagged('copySet', null), makeTagged('copySet', undefined)];
      }
      case 'copyMap': {
        // The bounds in the cover are not valid copyMaps, which is fine.
        // They only need to be valid copyTagged that bound all possible
        // copyMaps.
        return [makeTagged('copyMap', null), makeTagged('copyMap', undefined)];
      }
      default: {
        return getPassStyleCover(/** @type {PassStyle} */ (kind));
      }
    }
  },
});

/** @type {MatchHelper} */
const matchAndHelper = Far('match:and helper', {
  checkIsMatcherPayload: (allegedPatts, check = x => x) => {
    const checkIt = patt => checkPattern(patt, check);
    return (
      (check(
        passStyleOf(allegedPatts) === 'copyArray',
        X`Needs array of sub-patterns: ${allegedPatts}`,
      ) && everyPassableChild(allegedPatts, checkIt))
    );
  },

  checkMatches: (specimen, patts, check = x => x) => {
    const checkIt = patt => checkMatches(specimen, patt, check);
    return everyPassableChild(patts, checkIt);
  },

  getRankCover: patts => unionRankCovers(patts.map(getRankCover)),
});

/** @type {MatchHelper} */
const matchOrHelper = Far('match:or helper', {
  checkIsMatcherPayload: matchAndHelper.checkIsMatcherPayload,

  checkMatches: (specimen, patts, check = x => x) => {
    const checkIt = patt => checkMatches(specimen, patt, check);
    return (
      (check(
        patts.length >= 1,
        X`${specimen} - no pattern disjuncts to match: ${patts}`,
      ) && somePassableChild(patts, checkIt))
    );
  },

  getRankCover: patts => intersectRankCovers(patts.map(getRankCover)),
});

/** @type {MatchHelper} */
const matchNotHelper = Far('match:not helper', {
  checkIsMatcherPayload: checkPattern,

  checkMatches: (specimen, patt, check = x => x) => {
    if (matches(specimen, patt)) {
      return check(false, X`${specimen} - must fail negated pattern: ${patt}`);
    } else {
      return true;
    }
  },

  getRankCover: _patt => [null, undefined],
});

/** @type {MatchHelper} */
const matchLTEHelper = Far('match:lte helper', {
  checkIsMatcherPayload: checkKey,

  checkMatches: (specimen, rightOperand, check = x => x) =>
    check(
      keyLTE(specimen, rightOperand),
      X`${specimen} - Must be <= ${rightOperand}`,
    ),

  getRankCover: rightOperand => {
    const passStyle = passStyleOf(rightOperand);
    // The prefer-const makes no sense when some of the variables need
    // to be `let`
    // eslint-disable-next-line prefer-const
    let [leftBound, _rightBound] = getPassStyleCover(passStyle);
    switch (passStyle) {
      case 'number': {
        if (Number.isNaN(rightOperand)) {
          leftBound = NaN;
        }
        break;
      }
      case 'copyRecord': {
        leftBound = harden(
          fromEntries(entries(rightOperand).map(([k, _v]) => [k, null])),
        );
        break;
      }
      case 'tagged': {
        leftBound = makeTagged(getTag(rightOperand), null);
        switch (getTag(rightOperand)) {
          case 'copyMap': {
            const { keys } = rightOperand.payload;
            const values = keys.map(_ => null);
            // See note in getRankCover for copyMap about why we
            // may need to take variable values orders into account
            // to be correct.
            leftBound = makeTagged('copyMap', harden({ keys, values }));
            break;
          }
          default: {
            break;
          }
        }
        break;
      }
      case 'remotable': {
        // This does not make for a tighter rankCover, but if the
        // rankStore internally further optimizes, for example with
        // an identityHash of a virtual object it, then this might
        // help it take advantage of that.
        leftBound = rightOperand;
        break;
      }
      default: {
        break;
      }
    }
    return [leftBound, rightOperand];
  },
});

/** @type {MatchHelper} */
const matchLTHelper = Far('match:lt helper', {
  checkIsMatcherPayload: checkKey,

  checkMatches: (specimen, rightOperand, check = x => x) =>
    check(
      keyLT(specimen, rightOperand),
      X`${specimen} - Must be < ${rightOperand}`,
    ),

  getRankCover: matchLTEHelper.getRankCover,
});

/** @type {MatchHelper} */
const matchGTEHelper = Far('match:gte helper', {
  checkIsMatcherPayload: checkKey,

  checkMatches: (specimen, rightOperand, check = x => x) =>
    check(
      keyGTE(specimen, rightOperand),
      X`${specimen} - Must be >= ${rightOperand}`,
    ),

  getRankCover: rightOperand => {
    const passStyle = passStyleOf(rightOperand);
    // The prefer-const makes no sense when some of the variables need
    // to be `let`
    // eslint-disable-next-line prefer-const
    let [_leftBound, rightBound] = getPassStyleCover(passStyle);
    switch (passStyle) {
      case 'number': {
        if (Number.isNaN(rightOperand)) {
          rightBound = NaN;
        } else {
          rightBound = Infinity;
        }
        break;
      }
      case 'copyRecord': {
        rightBound = harden(
          fromEntries(entries(rightOperand).map(([k, _v]) => [k, undefined])),
        );
        break;
      }
      case 'tagged': {
        rightBound = makeTagged(getTag(rightOperand), undefined);
        switch (getTag(rightOperand)) {
          case 'copyMap': {
            const { keys } = rightOperand.payload;
            const values = keys.map(_ => undefined);
            // See note in getRankCover for copyMap about why we
            // may need to take variable values orders into account
            // to be correct.
            rightBound = makeTagged('copyMap', harden({ keys, values }));
            break;
          }
          default: {
            break;
          }
        }
        break;
      }
      case 'remotable': {
        // This does not make for a tighter rankCover, but if the
        // rankStore internally further optimizes, for example with
        // an identityHash of a virtual object it, then this might
        // help it take advantage of that.
        rightBound = rightOperand;
        break;
      }
      default: {
        break;
      }
    }
    return [rightOperand, rightBound];
  },
});

/** @type {MatchHelper} */
const matchGTHelper = Far('match:gt helper', {
  getMatchTag: () => 'gt',

  checkMatches: (specimen, rightOperand, check = x => x) =>
    check(
      keyGT(specimen, rightOperand),
      X`${specimen} - Must be > ${rightOperand}`,
    ),

  checkIsMatcherPayload: checkKey,

  getRankCover: matchGTEHelper.getRankCover,
});

/** @type {Record<string, MatchHelper>} */
const HelpersByMatchTag = harden({
  'match:any': matchAnyHelper,
  'match:kind': matchKindHelper,
  'match:and': matchAndHelper,
  'match:or': matchOrHelper,
  'match:not': matchNotHelper,
  'match:lt': matchLTHelper,
  'match:lte': matchLTEHelper,
  'match:gte': matchGTEHelper,
  'match:gt': matchGTHelper,
});
