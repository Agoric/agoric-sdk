// @ts-check

import {
  assertChecker,
  everyPassableChild,
  Far,
  getTag,
  makeTagged,
  passStyleOf,
} from '@agoric/marshal';
import {
  compareRank,
  getPassStyleCover,
  intersectRankCovers,
  unionRankCovers,
} from './rankOrder.js';
import { keyEQ, keyGT, keyGTE, keyLT, keyLTE } from '../keys/compareKeys.js';
import {
  assertKey,
  checkKey,
  isKey,
  checkScalarKey,
  isScalarKey,
} from '../keys/checkKey.js';
import { checkCopySet /* , makeCopySet XXX TEMP */ } from '../keys/copySet.js';
import { checkCopyMap, copyMapKeySet } from '../keys/copyMap.js';

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

// const { entries, fromEntries } = Object; // XXX TEMP
const { ownKeys } = Reflect;
const { quote: q, details: X } = assert;

/** @type WeakSet<Pattern> */
const patternMemo = new WeakSet();

/**
 * @returns {Object}
 */
export const makePatternKit = () => {
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

  /** @type {CheckPattern} */
  const checkPattern = (patt, check = x => x) => {
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
  const isPattern = patt => checkPattern(patt);

  /**
   * @param {Pattern} patt
   */
  const assertPattern = patt => {
    checkPattern(patt, assertChecker);
  };

  // /////////////////////// isKeyPattern ///////////////////////////////////////////

  /** @type {CheckKeyPattern} */
  const checkKeyPattern = (patt, check = x => x) => {
    if (isKey(patt)) {
      // In principle, all keys are patterns, but only scalars are currently supported as keys.
      return check(isScalarKey(patt), X`non-scalar keys are not yet supported`);
    }
    // eslint-disable-next-line no-use-before-define
    return checkKeyPatternInternal(patt, check);
  };

  /**
   * @param {Passable} patt
   * @param {Checker=} check
   * @returns {boolean}
   */
  const checkKeyPatternInternal = (patt, check = x => x) => {
    // Purposely parallels checkKey. TODO reuse more logic between them.
    // Most of the text of the switch below not dealing with matchers is
    // essentially identical.
    const passStyle = passStyleOf(patt);
    switch (passStyle) {
      case 'copyRecord':
      case 'copyArray': {
        return check(false, X`non-scalar keys are not yet supported`);
      }
      case 'tagged': {
        const tag = getTag(patt);
        const matchHelper = maybeMatchHelper(tag);
        if (matchHelper !== undefined) {
          // This check guarantees the payload invariants assumed by the other
          // matchHelper methods.
          return matchHelper.checkKeyPattern(patt.payload, check);
        }
        switch (tag) {
          case 'copySet':
          case 'copyMap': {
            return check(false, X`non-scalar keys are not yet supported`);
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
  const isKeyPattern = patt => checkKeyPattern(patt);

  /**
   * @param {Pattern} patt
   */
  const assertKeyPattern = patt => {
    checkKeyPattern(patt, assertChecker);
  };

  // /////////////////////// matches /////////////////////////////////////////////

  /** @type {CheckMatches} */
  const checkMatches = (specimen, patt, check = x => x) => {
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

  /**
   * @param {Passable} specimen
   * @param {Pattern} patt
   * @returns {boolean}
   */
  const matches = (specimen, patt) => checkMatches(specimen, patt);

  /**
   * @param {Passable} specimen
   * @param {Pattern} patt
   */
  const assertMatches = (specimen, patt) => {
    checkMatches(specimen, patt, assertChecker);
  };

  // /////////////////////// getRankCover ////////////////////////////////////////

  /** @type {GetRankCover} */
  const getRankCover = (patt, encodeKey) => {
    if (isKey(patt)) {
      const encoded = encodeKey(patt);
      return [encoded, `${encoded}~`];
    }
    const passStyle = passStyleOf(patt);
    switch (passStyle) {
      case 'copyArray': {
        const rankCovers = patt.map(p => getRankCover(p, encodeKey));
        return harden([
          rankCovers.map(([left, _right]) => left),
          rankCovers.map(([_left, right]) => right),
        ]);
      }
      case 'copyRecord': {
        // XXX this doesn't get along with the world of cover === pair of strings
        // const pattKeys = ownKeys(patt);
        // const pattEntries = harden(pattKeys.map(key => [key, patt[key]]));
        // const [leftEntriesLimit, rightEntriesLimit] = getRankCover(pattEntries);
        // return harden([
        //   fromEntries(leftEntriesLimit),
        //   fromEntries(rightEntriesLimit),
        // ]);
        assert.fail('not supporting copyRecord patterns yet'); // XXX TEMP
      }
      case 'tagged': {
        const tag = getTag(patt);
        const matchHelper = maybeMatchHelper(tag);
        if (matchHelper) {
          return matchHelper.getRankCover(patt.payload, encodeKey);
        }
        switch (tag) {
          case 'copySet': {
            // XXX this doesn't get along with the world of cover === pair of strings
            // // Should already be validated by checkPattern. But because this
            // // is a check that may loosen over time, we also assert everywhere
            // // we still rely on the restriction.
            // assert(
            //   patt.payload.length === 1,
            //   X`Non-singleton copySets with matcher not yet implemented: ${patt}`,
            // );
            //
            // const [leftElementLimit, rightElementLimit] = getRankCover(
            //   patt.payload[0],
            // );
            // return harden([
            //   makeCopySet([leftElementLimit]),
            //   makeCopySet([rightElementLimit]),
            // ]);
            assert.fail('not supporting copySet patterns yet'); // XXX TEMP
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
              encodeKey,
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

    getRankCover: (_matchPayload, _encodeKey) => ['', '{'],

    checkKeyPattern: (_matcherPayload, _check = x => x) => true,
  });

  /** @type {MatchHelper} */
  const matchScalarHelper = Far('M.scalar helper', {
    checkIsMatcherPayload: (matcherPayload, check = x => x) =>
      check(
        matcherPayload === undefined,
        X`An M.scalar matcher's .payload must be undefined: ${matcherPayload}`,
      ),

    checkMatches: (specimen, _matcherPayload, check = x => x) =>
      checkScalarKey(specimen, check),

    getRankCover: (_matchPayload, _encodeKey) => ['a', 'z~'],

    checkKeyPattern: (_matcherPayload, _check = x => x) => true,
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

    getRankCover: (kind, _encodeKey) => {
      switch (kind) {
        case 'copySet': {
          // The bounds in the cover are not valid copySets, which is fine.
          // They only need to be valid copyTagged that bound all possible
          // copySets. Thus, we need to call makeTagged directly, rather
          // than using makeCopySet.
          return [
            makeTagged('copySet', null),
            makeTagged('copySet', undefined),
          ];
        }
        case 'copyMap': {
          // The bounds in the cover are not valid copyMaps, which is fine.
          // They only need to be valid copyTagged that bound all possible
          // copyMaps.
          return [
            makeTagged('copyMap', null),
            makeTagged('copyMap', undefined),
          ];
        }
        default: {
          return getPassStyleCover(/** @type {PassStyle} */ (kind));
        }
      }
    },

    checkKeyPattern: (kind, check = x => x) => {
      switch (kind) {
        case 'boolean':
        case 'number':
        case 'bigint':
        case 'string':
        case 'symbol':
        case 'remotable':
        case 'undefined':
          return true;
        default:
          return check(false, X`${kind} keys are not supported`);
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
      return patts.every(patt => checkMatches(specimen, patt, check));
    },

    getRankCover: (patts, encodeKey) =>
      intersectRankCovers(
        compareRank,
        patts.map(p => getRankCover(p, encodeKey)),
      ),

    checkKeyPattern: (patts, check = x => x) => {
      return patts.every(patt => checkKeyPattern(patt, check));
    },
  });

  /** @type {MatchHelper} */
  const matchOrHelper = Far('match:or helper', {
    checkIsMatcherPayload: matchAndHelper.checkIsMatcherPayload,

    checkMatches: (specimen, patts, check = x => x) => {
      return (
        (check(
          patts.length >= 1,
          X`${specimen} - no pattern disjuncts to match: ${patts}`,
        ) && !patts.every(patt => !checkMatches(specimen, patt, check)))
      );
    },

    getRankCover: (patts, encodeKey) =>
      unionRankCovers(
        compareRank,
        patts.map(p => getRankCover(p, encodeKey)),
      ),

    checkKeyPattern: (patts, check = x => x) => {
      return patts.every(patt => checkKeyPattern(patt, check));
    },
  });

  /** @type {MatchHelper} */
  const matchNotHelper = Far('match:not helper', {
    checkIsMatcherPayload: checkPattern,

    checkMatches: (specimen, patt, check = x => x) => {
      if (matches(specimen, patt)) {
        return check(
          false,
          X`${specimen} - must fail negated pattern: ${patt}`,
        );
      } else {
        return true;
      }
    },

    getRankCover: (_patt, _encodeKey) => ['', '{'],

    checkKeyPattern: (patt, check = x => x) => checkKeyPattern(patt, check),
  });

  /** @type {MatchHelper} */
  const matchLTEHelper = Far('match:lte helper', {
    checkIsMatcherPayload: checkKey,

    checkMatches: (specimen, rightOperand, check = x => x) =>
      check(
        keyLTE(specimen, rightOperand),
        X`${specimen} - Must be <= ${rightOperand}`,
      ),

    getRankCover: (rightOperand, encodeKey) => {
      const passStyle = passStyleOf(rightOperand);
      // The prefer-const makes no sense when some of the variables need
      // to be `let`
      // eslint-disable-next-line prefer-const
      let [leftBound, _rightBound] = getPassStyleCover(passStyle);
      switch (passStyle) {
        case 'number': {
          if (Number.isNaN(rightOperand)) {
            // leftBound = NaN;
            leftBound = 'f'; // XXX BOGUS
          }
          break;
        }
        case 'copyRecord': {
          // XXX this doesn't get along with the world of cover === pair of strings
          // leftBound = harden(
          //   fromEntries(entries(rightOperand).map(([k, _v]) => [k, null])),
          // );
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
          leftBound = encodeKey(rightOperand);
          break;
        }
        default: {
          break;
        }
      }
      return [leftBound, `${encodeKey(rightOperand)}~`];
    },

    checkKeyPattern: (rightOperand, check = x => x) =>
      checkKeyPattern(rightOperand, check),
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

    checkKeyPattern: (rightOperand, check = x => x) =>
      checkKeyPattern(rightOperand, check),
  });

  /** @type {MatchHelper} */
  const matchGTEHelper = Far('match:gte helper', {
    checkIsMatcherPayload: checkKey,

    checkMatches: (specimen, rightOperand, check = x => x) =>
      check(
        keyGTE(specimen, rightOperand),
        X`${specimen} - Must be >= ${rightOperand}`,
      ),

    getRankCover: (rightOperand, encodeKey) => {
      const passStyle = passStyleOf(rightOperand);
      // The prefer-const makes no sense when some of the variables need
      // to be `let`
      // eslint-disable-next-line prefer-const
      let [_leftBound, rightBound] = getPassStyleCover(passStyle);
      switch (passStyle) {
        case 'number': {
          if (Number.isNaN(rightOperand)) {
            // rightBound = NaN;
            rightBound = 'f';
          } else {
            // rightBound = Infinity;
            rightBound = 'f~';
          }
          break;
        }
        case 'copyRecord': {
          // XXX this doesn't get along with the world of cover === pair of strings
          // rightBound = harden(
          //   fromEntries(entries(rightOperand).map(([k, _v]) => [k, undefined])),
          // );
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
          rightBound = encodeKey(rightOperand);
          break;
        }
        default: {
          break;
        }
      }
      return [encodeKey(rightOperand), rightBound];
    },

    checkKeyPattern: (rightOperand, check = x => x) =>
      checkKeyPattern(rightOperand, check),
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

    checkKeyPattern: (rightOperand, check = x => x) =>
      checkKeyPattern(rightOperand, check),
  });

  /** @type {Record<string, MatchHelper>} */
  const HelpersByMatchTag = harden({
    'match:any': matchAnyHelper,
    'match:scalar': matchScalarHelper,
    'match:kind': matchKindHelper,
    'match:and': matchAndHelper,
    'match:or': matchOrHelper,
    'match:not': matchNotHelper,
    'match:lt': matchLTHelper,
    'match:lte': matchLTEHelper,
    'match:gte': matchGTEHelper,
    'match:gt': matchGTHelper,
  });

  const patt = p => {
    assertPattern(p);
    return p;
  };

  const M = harden({
    any: () => patt(makeTagged('match:any', undefined)),
    scalar: () => patt(makeTagged('match:scalar', undefined)),
    and: (...patts) => patt(makeTagged('match:and', patts)),
    or: (...patts) => patt(makeTagged('match:or', patts)),
    not: subPatt => patt(makeTagged('match:not', subPatt)),

    kind: kind => patt(makeTagged('match:kind', kind)),
    boolean: () => M.kind('boolean'),
    number: () => M.kind('number'),
    bigint: () => M.kind('bigint'),
    string: () => M.kind('string'),
    symbol: () => M.kind('symbol'),
    record: () => M.kind('copyRecord'),
    array: () => M.kind('copyArray'),
    set: () => M.kind('copySet'),
    map: () => M.kind('copyMap'),
    remotable: () => M.kind('remotable'),
    error: () => M.kind('error'),
    promise: () => M.kind('promise'),

    /**
     * All keys including `undefined` are already valid patterns and
     * so can validly represent themselves. But optional pattern arguments
     * `(pattern = undefined) => ...`
     * cannot distinguish between `undefined` passed as a pattern vs
     * omission of the argument. It will interpret the first as the
     * second. Thus, when a passed pattern does not also need to be a key,
     * we recommend passing `M.undefined()` instead of `undefined`.
     */
    undefined: () => M.kind('undefined'),
    null: () => null,

    lt: rightSide => patt(makeTagged('match:lt', rightSide)),
    lte: rightSide => patt(makeTagged('match:lte', rightSide)),
    eq: key => {
      assertKey(key);
      return key === undefined ? M.undefined() : key;
    },
    neq: key => M.not(M.eq(key)),
    gte: rightSide => patt(makeTagged('match:gte', rightSide)),
    gt: rightSide => patt(makeTagged('match:gt', rightSide)),

    // TODO make more precise
    arrayOf: _elementPatt => M.array(),
    recordOf: _entryPatt => M.record(),
    setOf: _elementPatt => M.set(),
    mapOf: _entryPatt => M.map(),
  });

  return harden({
    matches,
    assertMatches,
    assertPattern,
    isPattern,
    assertKeyPattern,
    isKeyPattern,
    getRankCover,
    M,
  });
};
