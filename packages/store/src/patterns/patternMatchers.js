// @ts-check

import {
  assertChecker,
  Far,
  getTag,
  makeTagged,
  passStyleOf,
  hasOwnPropertyOf,
  nameForPassableSymbol,
} from '@endo/marshal';
import { identChecker } from '@agoric/assert';
import { applyLabelingError, listDifference } from '@agoric/internal';

import {
  compareRank,
  getPassStyleCover,
  intersectRankCovers,
  recordParts,
  unionRankCovers,
} from './rankOrder.js';
import { keyEQ, keyGT, keyGTE, keyLT, keyLTE } from '../keys/compareKeys.js';
import {
  assertKey,
  checkKey,
  isKey,
  checkScalarKey,
  isScalarKey,
  checkCopySet,
  checkCopyMap,
  copyMapKeySet,
  checkCopyBag,
} from '../keys/checkKey.js';

/// <reference types="ses"/>

const { quote: q, details: X } = assert;
const { entries, values } = Object;
const { ownKeys } = Reflect;

/** @type WeakSet<Pattern> */
const patternMemo = new WeakSet();

// /////////////////////// Match Helpers Helpers /////////////////////////////

/** For forward references to `M` */
let MM;

/**
 * The actual default values here are, at the present time, fairly
 * arbitrary choices and may change before they settle down. Of course
 * at some point we'll need to stop changing them. But we should first
 * see how our system holds up with these choices. The main criteria
 * is that they be big enough that "normal" innocent programs rarely
 * encounter these limits.
 *
 * Exported primarily for testing.
 */
export const defaultLimits = harden({
  decimalDigitsLimit: 100,
  stringLengthLimit: 100_000,
  symbolNameLengthLimit: 100,
  numPropertiesLimit: 80,
  propertyNameLengthLimit: 100,
  arrayLengthLimit: 10_000,
  numSetElementsLimit: 10_000,
  numUniqueBagElementsLimit: 10_000,
  numMapEntriesLimit: 5000,
});

/**
 * Use the result only to get the limits you need by destructuring.
 * Thus, the result only needs to support destructuring. The current
 * implementation uses inheritance as a cheap hack.
 *
 * @param {Limits} [limits]
 * @returns {AllLimits}
 */
const limit = (limits = {}) =>
  /** @type {AllLimits} */ (harden({ __proto__: defaultLimits, ...limits }));

const checkIsWellFormedWithLimit = (
  payload,
  mainPayloadShape,
  check,
  label,
) => {
  assert(Array.isArray(mainPayloadShape));
  if (!Array.isArray(payload)) {
    return check(false, X`${q(label)} payload must be an array: ${payload}`);
  }

  // Was the following, but its overuse of patterns caused an infinite regress
  // const payloadLimitShape = harden(
  //   M.split(
  //     mainPayloadShape,
  //     M.partial(harden([M.recordOf(M.string(), M.number())]), harden([])),
  //   ),
  // );
  // return checkMatches(payload, payloadLimitShape, check, label);

  const mainLength = mainPayloadShape.length;
  if (!(payload.length === mainLength || payload.length === mainLength + 1)) {
    return check(false, X`${q(label)} payload unexpected size: ${payload}`);
  }
  const limits = payload[mainLength];
  payload = harden(payload.slice(0, mainLength));
  // eslint-disable-next-line no-use-before-define
  if (!checkMatches(payload, mainPayloadShape, check, label)) {
    return false;
  }
  if (limits === undefined) {
    return true;
  }
  return (
    check(
      passStyleOf(limits) === 'copyRecord',
      X`Limits must be a record: ${q(limits)}`,
    ) &&
    entries(limits).every(([key, value]) =>
      check(
        passStyleOf(value) === 'number',
        X`Value of limit ${q(key)} but be a number: ${q(value)}`,
      ),
    )
  );
};

const checkDecimalDigitsLimit = (specimen, decimalDigitsLimit, check) => {
  if (
    Math.floor(Math.log10(Math.abs(Number(specimen)))) + 1 <=
    decimalDigitsLimit
  ) {
    return true;
  }
  return check(
    false,
    X`bigint ${specimen} must not have more than ${decimalDigitsLimit} digits`,
  );
};

/**
 * @returns {PatternKit}
 */
const makePatternKit = () => {
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

  /**
   * @typedef {string} Kind
   * It is either a PassStyle other than 'tagged', or, if the underlying
   * PassStyle is 'tagged', then the `getTag` value for tags that are
   * recognized at the store level of abstraction. For each of those
   * tags, a tagged record only has that kind if it satisfies the invariants
   * that the store level associates with that kind.
   */

  /**
   * @type {WeakMap<CopyTagged, Kind>}
   * Only for tagged records of recognized kinds whose store-level invariants
   * have already been checked.
   */
  const tagMemo = new WeakMap();

  /**
   * Checks only recognized tags, and only if the tagged
   * passes the invariants associated with that recognition.
   *
   * @param {Passable} tagged
   * @param {Kind} tag
   * @param {Checker} check
   * @returns {boolean}
   */
  const checkTagged = (tagged, tag, check) => {
    const matchHelper = maybeMatchHelper(tag);
    if (matchHelper) {
      // Buried here is the important case, where we process
      // the various patternNodes
      return matchHelper.checkIsWellFormed(tagged.payload, check);
    }
    switch (tag) {
      case 'copySet': {
        return checkCopySet(tagged, check);
      }
      case 'copyBag': {
        return checkCopyBag(tagged, check);
      }
      case 'copyMap': {
        return checkCopyMap(tagged, check);
      }
      default: {
        return check(
          false,
          X`cannot check unrecognized tag ${q(tag)}: ${tagged}`,
        );
      }
    }
  };

  /**
   * Returns only a recognized kind, and only if the specimen passes the
   * invariants associated with that recognition.
   * Otherwise, `check(false, ...)` and returns undefined
   *
   * @param {Passable} specimen
   * @param {Checker} [check]
   * @returns {Kind | undefined}
   */
  const kindOf = (specimen, check = identChecker) => {
    const passStyle = passStyleOf(specimen);
    if (passStyle !== 'tagged') {
      return passStyle;
    }
    // At this point we know that specimen is a well formed
    // as a tagged record, which is defined at the marshal level of abstraction,
    // since `passStyleOf` checks those invariants.
    if (tagMemo.has(specimen)) {
      return tagMemo.get(specimen);
    }
    const tag = getTag(specimen);
    if (checkTagged(specimen, tag, check)) {
      tagMemo.set(specimen, tag);
      return tag;
    }
    if (check !== identChecker) {
      check(false, X`cannot check unrecognized tag ${q(tag)}`);
    }
    return undefined;
  };
  harden(kindOf);

  /**
   * Checks only recognized kinds, and only if the specimen
   * passes the invariants associated with that recognition.
   *
   * @param {Passable} specimen
   * @param {Kind} kind
   * @param {Checker} check
   * @returns {boolean}
   */
  const checkKind = (specimen, kind, check) => {
    const realKind = kindOf(specimen, check);
    if (kind === realKind) {
      return true;
    }
    if (check !== identChecker) {
      // quoting without quotes
      const details = X([`${realKind} `, ` - Must be a ${kind}`], specimen);
      check(false, details);
    }
    return false;
  };

  /**
   * @param {Passable} specimen
   * @param {Key} keyAsPattern
   * @param {Checker} check
   * @return {boolean}
   */
  const checkAsKeyPatt = (specimen, keyAsPattern, check) => {
    if (keyEQ(specimen, keyAsPattern)) {
      return true;
    }
    return (
      check !== identChecker &&
      check(false, X`${specimen} - Must be: ${keyAsPattern}`)
    );
  };

  // /////////////////////// isPattern /////////////////////////////////////////

  /** @type {CheckPattern} */
  const checkPattern = (patt, check) => {
    if (isKey(patt)) {
      // All keys are patterns. For these, the keyMemo will do.
      // All primitives that are patterns are also keys, which this
      // also takes care of without memo. The rest of our checking logic
      // is only concerned with non-key patterns.
      return true;
    }
    if (patternMemo.has(patt)) {
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
   * @param {Passable} patt - known not to be a key, and therefore known
   * not to be primitive.
   * @param {Checker} check
   * @returns {boolean}
   */
  const checkPatternInternal = (patt, check) => {
    // Purposely parallels checkKey. TODO reuse more logic between them.
    // Most of the text of the switch below not dealing with matchers is
    // essentially identical.
    const checkIt = child => checkPattern(child, check);

    const kind = kindOf(patt, check);
    switch (kind) {
      case undefined: {
        return false;
      }
      case 'copyRecord': {
        // A copyRecord is a pattern iff all its children are
        // patterns
        return values(patt).every(checkIt);
      }
      case 'copyArray': {
        // A copyArray is a pattern iff all its children are
        // patterns
        return patt.every(checkIt);
      }
      case 'copyMap': {
        // A copyMap's keys are keys and therefore already known to be
        // patterns.
        // A copyMap is a pattern if its values are patterns.
        return checkPattern(patt.values, check);
      }
      case 'error':
      case 'promise': {
        return check(false, X`A ${q(kind)} cannot be a pattern`);
      }
      default: {
        if (maybeMatchHelper(kind) !== undefined) {
          return true;
        }
        return check(
          false,
          X`A passable of kind ${q(kind)} is not a pattern: ${patt}`,
        );
      }
    }
  };

  /**
   * @param {Passable} patt
   * @returns {boolean}
   */
  const isPattern = patt => checkPattern(patt, identChecker);

  /**
   * @param {Pattern} patt
   */
  const assertPattern = patt => {
    checkPattern(patt, assertChecker);
  };

  // /////////////////////// isKeyPattern //////////////////////////////////////

  /** @type {CheckKeyPattern} */
  const checkKeyPattern = (patt, check) => {
    if (isKey(patt)) {
      // In principle, all keys are patterns, but only scalars are currently
      // supported as keys.
      return check(isScalarKey(patt), X`non-scalar keys are not yet supported`);
    }
    // eslint-disable-next-line no-use-before-define
    return checkKeyPatternInternal(patt, check);
  };

  /**
   * @param {Passable} patt
   * @param {Checker} check
   * @returns {boolean}
   */
  const checkKeyPatternInternal = (patt, check) => {
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
  const isKeyPattern = patt => checkKeyPattern(patt, identChecker);

  /**
   * @param {Pattern} patt
   */
  const assertKeyPattern = patt => {
    checkKeyPattern(patt, assertChecker);
  };

  // /////////////////////// matches ///////////////////////////////////////////

  /**
   * @param {Passable} specimen
   * @param {Pattern} pattern
   * @param {Checker} check
   * @param {string|number} [label]
   * @returns {boolean}
   */
  const checkMatches = (specimen, pattern, check, label = undefined) =>
    // eslint-disable-next-line no-use-before-define
    applyLabelingError(checkMatchesInternal, [specimen, pattern, check], label);

  /**
   * @param {Passable} specimen
   * @param {Pattern} patt
   * @param {Checker} check
   * @returns {boolean}
   */
  const checkMatchesInternal = (specimen, patt, check) => {
    // Worth being a bit verbose and repetitive in order to optimize
    const patternKind = kindOf(patt, check);
    const specimenKind = kindOf(specimen); // may be undefined
    switch (patternKind) {
      case undefined: {
        return assert.fail(X`pattern expected: ${patt}`);
      }
      case 'promise': {
        return assert.fail(X`promises cannot be patterns: ${patt}`);
      }
      case 'error': {
        return assert.fail(X`errors cannot be patterns: ${patt}`);
      }
      case 'undefined':
      case 'null':
      case 'boolean':
      case 'number':
      case 'bigint':
      case 'string':
      case 'symbol':
      case 'copySet':
      case 'copyBag':
      case 'remotable': {
        // These kinds are necessarily keys
        return checkAsKeyPatt(specimen, patt, check);
      }
      case 'copyArray': {
        if (isKey(patt)) {
          // Takes care of patterns which are keys, so the rest of this
          // logic can assume patterns that are not keys.
          return checkAsKeyPatt(specimen, patt, check);
        }
        if (specimenKind !== 'copyArray') {
          return check(
            false,
            X`${specimen} - Must be a copyArray to match a copyArray pattern: ${patt}`,
          );
        }
        const { length } = patt;
        if (specimen.length !== length) {
          return check(
            false,
            X`Array ${specimen} - Must be as long as copyArray pattern: ${patt}`,
          );
        }
        return patt.every((p, i) => checkMatches(specimen[i], p, check, i));
      }
      case 'copyRecord': {
        if (isKey(patt)) {
          // Takes care of patterns which are keys, so the rest of this
          // logic can assume patterns that are not keys.
          return checkAsKeyPatt(specimen, patt, check);
        }
        if (specimenKind !== 'copyRecord') {
          return check(
            false,
            X`${specimen} - Must be a copyRecord to match a copyRecord pattern: ${patt}`,
          );
        }
        const [specimenNames, specimenValues] = recordParts(specimen);
        const [pattNames, pattValues] = recordParts(patt);
        const missing = listDifference(pattNames, specimenNames);
        if (missing.length >= 1) {
          return check(
            false,
            X`${specimen} - Must have missing properties ${q(missing)}`,
          );
        }
        const unexpected = listDifference(specimenNames, pattNames);
        if (unexpected.length >= 1) {
          return check(
            false,
            X`${specimen} - Must not have unexpected properties: ${q(
              unexpected,
            )}`,
          );
        }
        return pattNames.every((label, i) =>
          checkMatches(specimenValues[i], pattValues[i], check, label),
        );
      }
      case 'copyMap': {
        if (isKey(patt)) {
          // Takes care of patterns which are keys, so the rest of this
          // logic can assume patterns that are not keys.
          return checkAsKeyPatt(specimen, patt, check);
        }
        if (specimenKind !== 'copyMap') {
          return check(
            false,
            X`${specimen} - Must be a copyMap to match a copyMap pattern: ${patt}`,
          );
        }
        const { payload: pattPayload } = patt;
        const { payload: specimenPayload } = specimen;
        const pattKeySet = copyMapKeySet(pattPayload);
        const specimenKeySet = copyMapKeySet(specimenPayload);
        // Compare keys as copySets
        if (!checkMatches(specimenKeySet, pattKeySet, check)) {
          return false;
        }
        const pattValues = pattPayload.values;
        const specimenValues = specimenPayload.values;
        // compare values as copyArrays
        return checkMatches(specimenValues, pattValues, check);
      }
      default: {
        const matchHelper = maybeMatchHelper(patternKind);
        if (matchHelper) {
          return matchHelper.checkMatches(specimen, patt.payload, check);
        }
        assert.fail(X`internal: should have recognized ${q(patternKind)} `);
      }
    }
  };

  /**
   * @param {Passable} specimen
   * @param {Pattern} patt
   * @returns {boolean}
   */
  const matches = (specimen, patt) =>
    checkMatches(specimen, patt, identChecker);

  /**
   * Returning normally indicates success. Match failure is indicated by
   * throwing.
   *
   * @param {Passable} specimen
   * @param {Pattern} patt
   * @param {string|number} [label]
   */
  const fit = (specimen, patt, label = undefined) => {
    if (checkMatches(specimen, patt, identChecker, label)) {
      return;
    }
    // should only throw
    checkMatches(specimen, patt, assertChecker, label);
    assert.fail(X`internal: ${label}: inconsistent pattern match: ${q(patt)}`);
  };

  // /////////////////////// getRankCover //////////////////////////////////////

  /** @type {GetRankCover} */
  const getRankCover = (patt, encodePassable) => {
    if (isKey(patt)) {
      const encoded = encodePassable(patt);
      if (encoded !== undefined) {
        return [encoded, `${encoded}~`];
      }
    }
    const passStyle = passStyleOf(patt);
    switch (passStyle) {
      case 'copyArray': {
        // XXX this doesn't get along with the world of cover === pair of
        // strings. In the meantime, fall through to the default which
        // returns a cover that covers all copyArrays.
        //
        // const rankCovers = patt.map(p => getRankCover(p, encodePassable));
        // return harden([
        //   rankCovers.map(([left, _right]) => left),
        //   rankCovers.map(([_left, right]) => right),
        // ]);
        break;
      }
      case 'copyRecord': {
        // XXX this doesn't get along with the world of cover === pair of
        // strings. In the meantime, fall through to the default which
        // returns a cover that covers all copyRecords.
        //
        // const pattKeys = ownKeys(patt);
        // const pattEntries = harden(pattKeys.map(key => [key, patt[key]]));
        // const [leftEntriesLimit, rightEntriesLimit] =
        //   getRankCover(pattEntries);
        // return harden([
        //   fromEntries(leftEntriesLimit),
        //   fromEntries(rightEntriesLimit),
        // ]);
        break;
      }
      case 'tagged': {
        const tag = getTag(patt);
        const matchHelper = maybeMatchHelper(tag);
        if (matchHelper) {
          // Buried here is the important case, where we process
          // the various patternNodes
          return matchHelper.getRankCover(patt.payload, encodePassable);
        }
        switch (tag) {
          case 'copySet': {
            // XXX this doesn't get along with the world of cover === pair of
            // strings. In the meantime, fall through to the default which
            // returns a cover that covers all copySets.
            //
            // // Should already be validated by checkPattern. But because this
            // // is a check that may loosen over time, we also assert
            // // everywhere we still rely on the restriction.
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
            break;
          }
          case 'copyMap': {
            // XXX this doesn't get along with the world of cover === pair of
            // strings. In the meantime, fall through to the default which
            // returns a cover that covers all copyMaps.
            //
            // // A matching copyMap must have the same keys, or at most one
            // // non-key key pattern. Thus we can assume that value positions
            // // match 1-to-1.
            // //
            // // TODO I may be overlooking that the less precise rankOrder
            // // equivalence class may cause values to be out of order,
            // // making this rankCover not actually cover. In that case, for
            // // all the values for keys at the same rank, we should union their
            // // rank covers. TODO POSSIBLE SILENT CORRECTNESS BUG
            // //
            // // If this is a bug, it probably affects the getRankCover
            // // cases of matchLTEHelper and matchGTEHelper on copyMap as
            // // well. See makeCopyMap for an idea on fixing
            // // this bug.
            // const [leftPayloadLimit, rightPayloadLimit] = getRankCover(
            //   patt.payload,
            //   encodePassable,
            // );
            // return harden([
            //   makeTagged('copyMap', leftPayloadLimit),
            //   makeTagged('copyMap', rightPayloadLimit),
            // ]);
            break;
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

  const arrayEveryMatchPattern = (array, patt, check, labelPrefix = '') => {
    if (checkKind(patt, 'match:any', identChecker)) {
      // if the pattern is M.any(), we know its true
      return true;
    }
    return array.every((el, i) =>
      checkMatches(el, patt, check, `${labelPrefix}[${i}]`),
    );
  };

  // /////////////////////// Match Helpers /////////////////////////////////////

  /** @type {MatchHelper} */
  const matchAnyHelper = Far('match:any helper', {
    checkMatches: (_specimen, _matcherPayload, _check) => true,

    checkIsWellFormed: (matcherPayload, check) =>
      check(
        matcherPayload === undefined,
        X`match:any payload: ${matcherPayload} - Must be undefined`,
      ),

    getRankCover: (_matchPayload, _encodePassable) => ['', '{'],

    checkKeyPattern: (_matcherPayload, _check) => true,
  });

  /** @type {MatchHelper} */
  const matchAndHelper = Far('match:and helper', {
    checkMatches: (specimen, patts, check) => {
      return patts.every(patt => checkMatches(specimen, patt, check));
    },

    checkIsWellFormed: (allegedPatts, check) => {
      const checkIt = patt => checkPattern(patt, check);
      return (
        check(
          passStyleOf(allegedPatts) === 'copyArray',
          X`Needs array of sub-patterns: ${allegedPatts}`,
        ) && allegedPatts.every(checkIt)
      );
    },

    getRankCover: (patts, encodePassable) =>
      intersectRankCovers(
        compareRank,
        patts.map(p => getRankCover(p, encodePassable)),
      ),

    checkKeyPattern: (patts, check) => {
      return patts.every(patt => checkKeyPattern(patt, check));
    },
  });

  /** @type {MatchHelper} */
  const matchOrHelper = Far('match:or helper', {
    checkMatches: (specimen, patts, check) => {
      const { length } = patts;
      if (length === 0) {
        return check(
          false,
          X`${specimen} - no pattern disjuncts to match: ${patts}`,
        );
      }
      if (patts.some(patt => matches(specimen, patt))) {
        return true;
      }
      return check(false, X`${specimen} - Must match one of ${patts}`);
    },

    checkIsWellFormed: matchAndHelper.checkIsWellFormed,

    getRankCover: (patts, encodePassable) =>
      unionRankCovers(
        compareRank,
        patts.map(p => getRankCover(p, encodePassable)),
      ),

    checkKeyPattern: (patts, check) => {
      return patts.every(patt => checkKeyPattern(patt, check));
    },
  });

  /** @type {MatchHelper} */
  const matchNotHelper = Far('match:not helper', {
    checkMatches: (specimen, patt, check) => {
      if (matches(specimen, patt)) {
        return check(
          false,
          X`${specimen} - Must fail negated pattern: ${patt}`,
        );
      } else {
        return true;
      }
    },

    checkIsWellFormed: checkPattern,

    getRankCover: (_patt, _encodePassable) => ['', '{'],

    checkKeyPattern,
  });

  /** @type {MatchHelper} */
  const matchScalarHelper = Far('match:scalar helper', {
    checkMatches: (specimen, _matcherPayload, check) =>
      checkScalarKey(specimen, check),

    checkIsWellFormed: matchAnyHelper.checkIsWellFormed,

    getRankCover: (_matchPayload, _encodePassable) => ['a', 'z~'],

    checkKeyPattern: (_matcherPayload, _check) => true,
  });

  /** @type {MatchHelper} */
  const matchKeyHelper = Far('match:key helper', {
    checkMatches: (specimen, _matcherPayload, check) =>
      checkKey(specimen, check),

    checkIsWellFormed: matchAnyHelper.checkIsWellFormed,

    getRankCover: (_matchPayload, _encodePassable) => ['a', 'z~'],

    checkKeyPattern: (_matcherPayload, _check) => true,
  });

  /** @type {MatchHelper} */
  const matchPatternHelper = Far('match:pattern helper', {
    checkMatches: (specimen, _matcherPayload, check) =>
      checkPattern(specimen, check),

    checkIsWellFormed: matchAnyHelper.checkIsWellFormed,

    getRankCover: (_matchPayload, _encodePassable) => ['a', 'z~'],

    checkKeyPattern: (_matcherPayload, _check) => true,
  });

  /** @type {MatchHelper} */
  const matchKindHelper = Far('match:kind helper', {
    checkMatches: checkKind,

    checkIsWellFormed: (allegedKeyKind, check) =>
      check(
        typeof allegedKeyKind === 'string',
        X`match:kind: payload: ${allegedKeyKind} - A kind name must be a string`,
      ),

    getRankCover: (kind, _encodePassable) => {
      let style;
      switch (kind) {
        case 'copySet':
        case 'copyMap': {
          style = 'tagged';
          break;
        }
        default: {
          style = kind;
          break;
        }
      }
      return getPassStyleCover(style);
    },

    checkKeyPattern: (kind, check) => {
      switch (kind) {
        case 'boolean':
        case 'number':
        case 'bigint':
        case 'string':
        case 'symbol':
        case 'remotable':
        case 'undefined': {
          return true;
        }
        default: {
          return check(false, X`${kind} keys are not supported`);
        }
      }
    },
  });

  /** @type {MatchHelper} */
  const matchBigintHelper = Far('match:bigint helper', {
    checkMatches: (specimen, [limits = undefined], check) => {
      const { decimalDigitsLimit } = limit(limits);
      return (
        checkKind(specimen, 'bigint', check) &&
        checkDecimalDigitsLimit(specimen, decimalDigitsLimit, check)
      );
    },

    checkIsWellFormed: (payload, check) =>
      checkIsWellFormedWithLimit(
        payload,
        harden([]),
        check,
        'match:bigint payload',
      ),

    getRankCover: (_matchPayload, _encodePassable) =>
      getPassStyleCover('bigint'),

    checkKeyPattern: (_matcherPayload, _check) => true,
  });

  /** @type {MatchHelper} */
  const matchNatHelper = Far('match:nat helper', {
    checkMatches: (specimen, [limits = undefined], check) => {
      const { decimalDigitsLimit } = limit(limits);
      return (
        checkKind(specimen, 'bigint', check) &&
        check(specimen >= 0n, X`${specimen} - Must be non-negative`) &&
        checkDecimalDigitsLimit(specimen, decimalDigitsLimit, check)
      );
    },

    checkIsWellFormed: (payload, check) =>
      checkIsWellFormedWithLimit(
        payload,
        harden([]),
        check,
        'match:nat payload',
      ),

    getRankCover: (_matchPayload, _encodePassable) =>
      // TODO Could be more precise
      getPassStyleCover('bigint'),

    checkKeyPattern: (_matcherPayload, _check) => true,
  });

  /** @type {MatchHelper} */
  const matchStringHelper = Far('match:string helper', {
    checkMatches: (specimen, [limits = undefined], check) => {
      const { stringLengthLimit } = limit(limits);
      return (
        checkKind(specimen, 'string', check) &&
        check(
          specimen.length <= stringLengthLimit,
          X`string ${specimen} must not be bigger than ${stringLengthLimit}`,
        )
      );
    },

    checkIsWellFormed: (payload, check) =>
      checkIsWellFormedWithLimit(
        payload,
        harden([]),
        check,
        'match:string payload',
      ),

    getRankCover: (_matchPayload, _encodePassable) =>
      getPassStyleCover('string'),

    checkKeyPattern: (_matcherPayload, _check) => true,
  });

  /** @type {MatchHelper} */
  const matchSymbolHelper = Far('match:symbol helper', {
    checkMatches: (specimen, [limits = undefined], check) => {
      const { symbolNameLengthLimit } = limit(limits);
      if (!checkKind(specimen, 'symbol', check)) {
        return false;
      }
      const symbolName = nameForPassableSymbol(specimen);
      assert.typeof(
        symbolName,
        'string',
        X`internal: Passable symbol ${specimen} must have a passable name`,
      );
      return check(
        symbolName.length <= symbolNameLengthLimit,
        X`Symbol name ${q(
          symbolName,
        )} must not be bigger than ${symbolNameLengthLimit}`,
      );
    },

    checkIsWellFormed: (payload, check) =>
      checkIsWellFormedWithLimit(
        payload,
        harden([]),
        check,
        'match:bigint payload',
      ),

    getRankCover: (_matchPayload, _encodePassable) =>
      getPassStyleCover('symbol'),

    checkKeyPattern: (_matcherPayload, _check) => true,
  });

  /** @type {MatchHelper} */
  const matchRemotableHelper = Far('match:remotable helper', {
    checkMatches: (specimen, remotableDesc, check) => {
      // Unfortunate duplication of checkKind logic, but no better choices.
      if (checkKind(specimen, 'remotable', identChecker)) {
        return true;
      }
      if (check === identChecker) {
        return false;
      }
      let specimenKind = passStyleOf(specimen);
      if (specimenKind === 'tagged') {
        specimenKind = getTag(specimen);
      }
      const { label } = remotableDesc;

      // quoting without quotes
      const details = X(
        [`${specimenKind} `, ` - Must be a remotable (${label})`],
        specimen,
      );
      return check(false, details);
    },

    checkIsWellFormed: (allegedRemotableDesc, check) =>
      checkMatches(
        allegedRemotableDesc,
        harden({ label: MM.string() }),
        check,
        'match:remotable payload',
      ),

    getRankCover: (_remotableDesc, _encodePassable) =>
      getPassStyleCover('remotable'),

    checkKeyPattern: (_remotableDesc, _check) => true,
  });

  /** @type {MatchHelper} */
  const matchLTEHelper = Far('match:lte helper', {
    checkMatches: (specimen, rightOperand, check) =>
      check(
        keyLTE(specimen, rightOperand),
        X`${specimen} - Must be <= ${rightOperand}`,
      ),

    checkIsWellFormed: checkKey,

    getRankCover: (rightOperand, encodePassable) => {
      const passStyle = passStyleOf(rightOperand);
      // The prefer-const makes no sense when some of the variables need
      // to be `let`
      // eslint-disable-next-line prefer-const
      let [leftBound, rightBound] = getPassStyleCover(passStyle);
      const newRightBound = `${encodePassable(rightOperand)}~`;
      if (newRightBound !== undefined) {
        rightBound = newRightBound;
      }
      return [leftBound, rightBound];
    },

    checkKeyPattern: (rightOperand, check) =>
      checkKeyPattern(rightOperand, check),
  });

  /** @type {MatchHelper} */
  const matchLTHelper = Far('match:lt helper', {
    checkMatches: (specimen, rightOperand, check) =>
      check(
        keyLT(specimen, rightOperand),
        X`${specimen} - Must be < ${rightOperand}`,
      ),

    checkIsWellFormed: checkKey,

    getRankCover: matchLTEHelper.getRankCover,

    checkKeyPattern: (rightOperand, check) =>
      checkKeyPattern(rightOperand, check),
  });

  /** @type {MatchHelper} */
  const matchGTEHelper = Far('match:gte helper', {
    checkMatches: (specimen, rightOperand, check) =>
      check(
        keyGTE(specimen, rightOperand),
        X`${specimen} - Must be >= ${rightOperand}`,
      ),

    checkIsWellFormed: checkKey,

    getRankCover: (rightOperand, encodePassable) => {
      const passStyle = passStyleOf(rightOperand);
      // The prefer-const makes no sense when some of the variables need
      // to be `let`
      // eslint-disable-next-line prefer-const
      let [leftBound, rightBound] = getPassStyleCover(passStyle);
      const newLeftBound = encodePassable(rightOperand);
      if (newLeftBound !== undefined) {
        leftBound = newLeftBound;
      }
      return [leftBound, rightBound];
    },

    checkKeyPattern: (rightOperand, check) =>
      checkKeyPattern(rightOperand, check),
  });

  /** @type {MatchHelper} */
  const matchGTHelper = Far('match:gt helper', {
    checkMatches: (specimen, rightOperand, check) =>
      check(
        keyGT(specimen, rightOperand),
        X`${specimen} - Must be > ${rightOperand}`,
      ),

    checkIsWellFormed: checkKey,

    getRankCover: matchGTEHelper.getRankCover,

    checkKeyPattern: (rightOperand, check) =>
      checkKeyPattern(rightOperand, check),
  });

  /** @type {MatchHelper} */
  const matchRecordOfHelper = Far('match:recordOf helper', {
    checkMatches: (
      specimen,
      [keyPatt, valuePatt, limits = undefined],
      check,
    ) => {
      const { numPropertiesLimit, propertyNameLengthLimit } = limit(limits);
      return (
        checkKind(specimen, 'copyRecord', check) &&
        check(
          ownKeys(specimen).length <= numPropertiesLimit,
          X`Must not have more than ${q(
            numPropertiesLimit,
          )} properties: ${specimen}`,
        ) &&
        entries(specimen).every(
          ([key, value]) =>
            applyLabelingError(
              check,
              [
                key.length <= propertyNameLengthLimit,
                X`Property name must not be longer than ${q(
                  propertyNameLengthLimit,
                )}`,
              ],
              key,
            ) &&
            checkMatches(
              harden([key, value]),
              harden([keyPatt, valuePatt]),
              check,
              key,
            ),
        )
      );
    },

    checkIsWellFormed: (payload, check) =>
      checkIsWellFormedWithLimit(
        payload,
        harden([MM.pattern(), MM.pattern()]),
        check,
        'match:recordOf payload',
      ),

    getRankCover: _entryPatt => getPassStyleCover('copyRecord'),

    checkKeyPattern: (_entryPatt, check) =>
      check(false, X`Records not yet supported as keys`),
  });

  /** @type {MatchHelper} */
  const matchArrayOfHelper = Far('match:arrayOf helper', {
    checkMatches: (specimen, [subPatt, limits = undefined], check) => {
      const { arrayLengthLimit } = limit(limits);
      return (
        checkKind(specimen, 'copyArray', check) &&
        check(
          specimen.length <= arrayLengthLimit,
          X`Array length ${specimen.length} must be <= limit ${arrayLengthLimit}`,
        ) &&
        arrayEveryMatchPattern(specimen, subPatt, check)
      );
    },

    checkIsWellFormed: (payload, check) =>
      checkIsWellFormedWithLimit(
        payload,
        harden([MM.pattern()]),
        check,
        'match:arrayOf payload',
      ),

    getRankCover: () => getPassStyleCover('copyArray'),

    checkKeyPattern: (_, check) =>
      check(false, X`Arrays not yet supported as keys`),
  });

  /** @type {MatchHelper} */
  const matchSetOfHelper = Far('match:setOf helper', {
    checkMatches: (specimen, [keyPatt, limits = undefined], check) => {
      const { numSetElementsLimit } = limit(limits);
      return (
        checkKind(specimen, 'copySet', check) &&
        check(
          specimen.payload.length < numSetElementsLimit,
          X`Set must not have more than ${q(numSetElementsLimit)} elements: ${
            specimen.payload.length
          }`,
        ) &&
        arrayEveryMatchPattern(specimen.payload, keyPatt, check, 'set elements')
      );
    },

    checkIsWellFormed: (payload, check) =>
      checkIsWellFormedWithLimit(
        payload,
        harden([MM.pattern()]),
        check,
        'match:setOf payload',
      ),

    getRankCover: () => getPassStyleCover('tagged'),

    checkKeyPattern: (_, check) =>
      check(false, X`CopySets not yet supported as keys`),
  });

  /** @type {MatchHelper} */
  const matchBagOfHelper = Far('match:bagOf helper', {
    checkMatches: (
      specimen,
      [keyPatt, countPatt, limits = undefined],
      check,
    ) => {
      const { numUniqueBagElementsLimit, decimalDigitsLimit } = limit(limits);
      return (
        checkKind(specimen, 'copyBag', check) &&
        check(
          specimen.payload.length <= numUniqueBagElementsLimit,
          X`Bag must not have more than ${q(
            numUniqueBagElementsLimit,
          )} unique elements: ${specimen}`,
        ) &&
        specimen.payload.every(
          ([key, count], i) =>
            checkMatches(key, keyPatt, check, `bag keys[${i}]`) &&
            applyLabelingError(
              checkDecimalDigitsLimit,
              [count, decimalDigitsLimit, check],
              `bag counts[${i}]`,
            ) &&
            checkMatches(count, countPatt, check, `bag counts[${i}]`),
        )
      );
    },

    checkIsWellFormed: (payload, check) =>
      checkIsWellFormedWithLimit(
        payload,
        harden([MM.pattern(), MM.pattern()]),
        check,
        'match:bagOf payload',
      ),

    getRankCover: () => getPassStyleCover('tagged'),

    checkKeyPattern: (_, check) =>
      check(false, X`CopyBags not yet supported as keys`),
  });

  /** @type {MatchHelper} */
  const matchMapOfHelper = Far('match:mapOf helper', {
    checkMatches: (
      specimen,
      [keyPatt, valuePatt, limits = undefined],
      check,
    ) => {
      const { numMapEntriesLimit } = limit(limits);
      return (
        checkKind(specimen, 'copyMap', check) &&
        check(
          specimen.payload.keys.length <= numMapEntriesLimit,
          X`CopyMap must have no more than ${q(
            numMapEntriesLimit,
          )} entries: ${specimen}`,
        ) &&
        arrayEveryMatchPattern(
          specimen.payload.keys,
          keyPatt,
          check,
          'map keys',
        ) &&
        arrayEveryMatchPattern(
          specimen.payload.values,
          valuePatt,
          check,
          'map values',
        )
      );
    },

    checkIsWellFormed: (payload, check) =>
      checkIsWellFormedWithLimit(
        payload,
        harden([MM.pattern(), MM.pattern()]),
        check,
        'match:mapOf payload',
      ),

    getRankCover: _entryPatt => getPassStyleCover('tagged'),

    checkKeyPattern: (_entryPatt, check) =>
      check(false, X`CopyMap not yet supported as keys`),
  });

  /** @type {MatchHelper} */
  const matchSplitHelper = Far('match:split helper', {
    checkMatches: (specimen, [base, rest = undefined], check) => {
      const baseStyle = passStyleOf(base);
      if (!checkKind(specimen, baseStyle, check)) {
        return false;
      }
      let specB;
      let specR;
      if (baseStyle === 'copyArray') {
        const { length: baseLen } = base;
        // Frozen below
        specB = specimen.slice(0, baseLen);
        specR = specimen.slice(baseLen);
      } else {
        assert(baseStyle === 'copyRecord');
        // Not yet frozen! Mutated in place
        specB = {};
        specR = {};
        for (const [name, value] of entries(specimen)) {
          if (hasOwnPropertyOf(base, name)) {
            specB[name] = value;
          } else {
            specR[name] = value;
          }
        }
      }
      harden(specB);
      harden(specR);
      return (
        checkMatches(specB, base, check, 'required-parts') &&
        (rest === undefined || checkMatches(specR, rest, check, 'rest-parts'))
      );
    },

    checkIsWellFormed: (splitArgs, check) => {
      if (
        passStyleOf(splitArgs) === 'copyArray' &&
        (splitArgs.length === 1 || splitArgs.length === 2)
      ) {
        const [base, rest = undefined] = splitArgs;
        const baseStyle = passStyleOf(base);
        if (
          isPattern(base) &&
          (baseStyle === 'copyArray' || baseStyle === 'copyRecord') &&
          (rest === undefined || isPattern(rest))
        ) {
          return true;
        }
      }
      return check(
        false,
        X`Must be an array of a base structure and an optional rest pattern: ${splitArgs}`,
      );
    },

    getRankCover: ([base, _rest = undefined]) =>
      getPassStyleCover(passStyleOf(base)),

    checkKeyPattern: ([base, _rest = undefined], check) =>
      check(false, X`${q(passStyleOf(base))} not yet supported as keys`),
  });

  /** @type {MatchHelper} */
  const matchPartialHelper = Far('match:partial helper', {
    checkMatches: (specimen, [base, rest = undefined], check) => {
      const baseStyle = passStyleOf(base);
      if (!checkKind(specimen, baseStyle, check)) {
        return false;
      }
      let specB;
      let specR;
      let newBase;
      if (baseStyle === 'copyArray') {
        const { length: specimenLen } = specimen;
        const { length: baseLen } = base;
        if (specimenLen < baseLen) {
          newBase = harden(base.slice(0, specimenLen));
          specB = specimen;
          // eslint-disable-next-line no-use-before-define
          specR = [];
        } else {
          newBase = [...base];
          specB = specimen.slice(0, baseLen);
          specR = specimen.slice(baseLen);
        }
        for (let i = 0; i < newBase.length; i += 1) {
          // For the optional base array parts, an undefined specimen element
          // matches unconditionally.
          if (specB[i] === undefined) {
            // eslint-disable-next-line no-use-before-define
            newBase[i] = M.any();
          }
        }
      } else {
        assert(baseStyle === 'copyRecord');
        // Not yet frozen! Mutated in place
        specB = {};
        specR = {};
        newBase = {};
        for (const [name, value] of entries(specimen)) {
          if (hasOwnPropertyOf(base, name)) {
            // For the optional base record parts, an undefined specimen value
            // matches unconditionally.
            if (value !== undefined) {
              specB[name] = value;
              newBase[name] = base[name];
            }
          } else {
            specR[name] = value;
          }
        }
      }
      harden(specB);
      harden(specR);
      harden(newBase);
      return (
        checkMatches(specB, newBase, check, 'optional-parts') &&
        (rest === undefined || checkMatches(specR, rest, check, 'rest-parts'))
      );
    },

    checkIsWellFormed: matchSplitHelper.checkIsWellFormed,

    getRankCover: matchSplitHelper.getRankCover,

    checkKeyPattern: matchSplitHelper.checkKeyPattern,
  });

  /** @type {Record<string, MatchHelper>} */
  const HelpersByMatchTag = harden({
    'match:any': matchAnyHelper,
    'match:and': matchAndHelper,
    'match:or': matchOrHelper,
    'match:not': matchNotHelper,

    'match:scalar': matchScalarHelper,
    'match:key': matchKeyHelper,
    'match:pattern': matchPatternHelper,
    'match:kind': matchKindHelper,
    'match:bigint': matchBigintHelper,
    'match:nat': matchNatHelper,
    'match:string': matchStringHelper,
    'match:symbol': matchSymbolHelper,
    'match:remotable': matchRemotableHelper,

    'match:lt': matchLTHelper,
    'match:lte': matchLTEHelper,
    'match:gte': matchGTEHelper,
    'match:gt': matchGTHelper,

    'match:arrayOf': matchArrayOfHelper,
    'match:recordOf': matchRecordOfHelper,
    'match:setOf': matchSetOfHelper,
    'match:bagOf': matchBagOfHelper,
    'match:mapOf': matchMapOfHelper,
    'match:split': matchSplitHelper,
    'match:partial': matchPartialHelper,
  });

  const makeMatcher = (tag, payload) => {
    const matcher = makeTagged(tag, payload);
    assertPattern(matcher);
    return matcher;
  };

  const makeKindMatcher = kind => makeMatcher('match:kind', kind);

  const AnyShape = makeMatcher('match:any', undefined);
  const ScalarShape = makeMatcher('match:scalar', undefined);
  const KeyShape = makeMatcher('match:key', undefined);
  const PatternShape = makeMatcher('match:pattern', undefined);
  const BooleanShape = makeKindMatcher('boolean');
  const NumberShape = makeKindMatcher('number');
  const BigIntShape = makeTagged('match:bigint', []);
  const NatShape = makeTagged('match:nat', []);
  const StringShape = makeTagged('match:string', []);
  const SymbolShape = makeTagged('match:symbol', []);
  const RecordShape = makeTagged('match:recordOf', [AnyShape, AnyShape]);
  const ArrayShape = makeTagged('match:arrayOf', [AnyShape]);
  const SetShape = makeTagged('match:setOf', [AnyShape]);
  const BagShape = makeTagged('match:bagOf', [AnyShape, AnyShape]);
  const MapShape = makeTagged('match:mapOf', [AnyShape, AnyShape]);
  const RemotableShape = makeKindMatcher('remotable');
  const ErrorShape = makeKindMatcher('error');
  const PromiseShape = makeKindMatcher('promise');
  const UndefinedShape = makeKindMatcher('undefined');

  /**
   * For when the last element of the payload is the optional limits,
   * so that when it is `undefined` it is dropped from the end of the
   * payloads array.
   *
   * @param {string} tag
   * @param {Passable[]} payload
   */
  const makeLimitsMatcher = (tag, payload) => {
    if (payload[payload.length - 1] === undefined) {
      payload = harden(payload.slice(0, payload.length - 1));
    }
    return makeMatcher(tag, payload);
  };

  const makeRemotableMatcher = (label = undefined) =>
    label === undefined
      ? RemotableShape
      : makeMatcher('match:remotable', harden({ label }));

  /**
   * @param {'sync'|'async'} callKind
   * @param {ArgGuard[]} argGuards
   * @param {ArgGuard[]} [optionalArgGuards]
   * @param {ArgGuard} [restArgGuard]
   * @returns {MethodGuardMaker}
   */
  const makeMethodGuardMaker = (
    callKind,
    argGuards,
    optionalArgGuards = undefined,
    restArgGuard = undefined,
  ) =>
    harden({
      optional: (...optArgGuards) => {
        assert(
          optionalArgGuards === undefined,
          X`Can only have one set of optional guards`,
        );
        assert(
          restArgGuard === undefined,
          X`optional arg guards must come before rest arg`,
        );
        return makeMethodGuardMaker(callKind, argGuards, optArgGuards);
      },
      rest: rArgGuard => {
        assert(restArgGuard === undefined, X`Can only have one rest arg`);
        return makeMethodGuardMaker(
          callKind,
          argGuards,
          optionalArgGuards,
          rArgGuard,
        );
      },
      returns: (returnGuard = UndefinedShape) =>
        harden({
          klass: 'methodGuard',
          callKind,
          argGuards,
          optionalArgGuards,
          restArgGuard,
          returnGuard,
        }),
    });

  const makeAwaitArgGuard = argGuard =>
    harden({
      klass: 'awaitArg',
      argGuard,
    });

  // //////////////////

  /** @type {MatcherNamespace} */
  const M = harden({
    any: () => AnyShape,
    and: (...patts) => makeMatcher('match:and', patts),
    or: (...patts) => makeMatcher('match:or', patts),
    not: subPatt => makeMatcher('match:not', subPatt),

    scalar: () => ScalarShape,
    key: () => KeyShape,
    pattern: () => PatternShape,
    kind: makeKindMatcher,
    boolean: () => BooleanShape,
    number: () => NumberShape,
    bigint: (limits = undefined) =>
      limits ? makeLimitsMatcher('match:bigint', [limits]) : BigIntShape,
    nat: (limits = undefined) =>
      limits ? makeLimitsMatcher('match:nat', [limits]) : NatShape,
    string: (limits = undefined) =>
      limits ? makeLimitsMatcher('match:string', [limits]) : StringShape,
    symbol: (limits = undefined) =>
      limits ? makeLimitsMatcher('match:symbol', [limits]) : SymbolShape,
    record: (limits = undefined) =>
      limits ? M.recordOf(M.any(), M.any(), limits) : RecordShape,
    array: (limits = undefined) =>
      limits ? M.arrayOf(M.any(), limits) : ArrayShape,
    set: (limits = undefined) => (limits ? M.setOf(M.any(), limits) : SetShape),
    bag: (limits = undefined) =>
      limits ? M.bagOf(M.any(), M.any(), limits) : BagShape,
    map: (limits = undefined) =>
      limits ? M.mapOf(M.any(), M.any(), limits) : MapShape,
    remotable: makeRemotableMatcher,
    error: () => ErrorShape,
    promise: () => PromiseShape,
    undefined: () => UndefinedShape,
    null: () => null,

    lt: rightOperand => makeMatcher('match:lt', rightOperand),
    lte: rightOperand => makeMatcher('match:lte', rightOperand),
    eq: key => {
      assertKey(key);
      return key === undefined ? M.undefined() : key;
    },
    neq: key => M.not(M.eq(key)),
    gte: rightOperand => makeMatcher('match:gte', rightOperand),
    gt: rightOperand => makeMatcher('match:gt', rightOperand),

    recordOf: (keyPatt = M.any(), valuePatt = M.any(), limits = undefined) =>
      makeLimitsMatcher('match:recordOf', [keyPatt, valuePatt, limits]),
    arrayOf: (subPatt = M.any(), limits = undefined) =>
      makeLimitsMatcher('match:arrayOf', [subPatt, limits]),
    setOf: (keyPatt = M.any(), limits = undefined) =>
      makeLimitsMatcher('match:setOf', [keyPatt, limits]),
    bagOf: (keyPatt = M.any(), countPatt = M.any(), limits = undefined) =>
      makeLimitsMatcher('match:bagOf', [keyPatt, countPatt, limits]),
    mapOf: (keyPatt = M.any(), valuePatt = M.any(), limits = undefined) =>
      makeLimitsMatcher('match:mapOf', [keyPatt, valuePatt, limits]),
    split: (base, rest = undefined) =>
      makeMatcher('match:split', rest === undefined ? [base] : [base, rest]),
    partial: (base, rest = undefined) =>
      makeMatcher('match:partial', rest === undefined ? [base] : [base, rest]),

    eref: t => M.or(t, M.promise()),
    opt: t => M.or(t, M.undefined()),

    interface: (interfaceName, methodGuards, { sloppy = false } = {}) => {
      for (const [_, methodGuard] of entries(methodGuards)) {
        assert(
          methodGuard.klass === 'methodGuard',
          X`unrecognize method guard ${methodGuard}`,
        );
      }
      return harden({
        klass: 'Interface',
        interfaceName,
        methodGuards,
        sloppy,
      });
    },
    call: (...argGuards) => makeMethodGuardMaker('sync', argGuards),
    callWhen: (...argGuards) => makeMethodGuardMaker('async', argGuards),

    await: argGuard => makeAwaitArgGuard(argGuard),
  });

  return harden({
    checkMatches,
    matches,
    fit,
    assertPattern,
    isPattern,
    assertKeyPattern,
    isKeyPattern,
    getRankCover,
    M,
  });
};

// Only include those whose meaning is independent of an imputed sort order
// of remotables, or of encoding of passable as sortable strings. Thus,
// getRankCover is omitted. To get one, you'd need to instantiate
// `makePatternKit()` yourself. Since there are currently no external
// uses of `getRankCover`, for clarity during development, `makePatternKit`
// is not currently exported.
export const {
  checkMatches,
  matches,
  fit,
  assertPattern,
  isPattern,
  assertKeyPattern,
  isKeyPattern,
  getRankCover,
  M,
} = makePatternKit();

MM = M;
