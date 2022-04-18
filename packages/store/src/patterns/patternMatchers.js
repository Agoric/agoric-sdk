/* eslint-disable no-use-before-define */
// @ts-check

import {
  assertChecker,
  Far,
  getTag,
  makeTagged,
  passStyleOf,
  hasOwnPropertyOf,
} from '@endo/marshal';
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

/** @type WeakSet<Pattern> */
const patternMemo = new WeakSet();

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
    // eslint-disable-next-line no-use-before-define
    const result = checkPatternInternal(patt, check);
    if (result) {
      patternMemo.add(patt);
    }
    return result;
  };

  /**
   * @param {Passable} patt
   * @param {Checker} check
   * @returns {boolean}
   */
  const checkPatternInternal = (patt, check) => {
    // Purposely parallels checkKey. TODO reuse more logic between them.
    // Most of the text of the switch below not dealing with matchers is
    // essentially identical.
    const checkIt = child => checkPattern(child, check);

    const passStyle = passStyleOf(patt);
    switch (passStyle) {
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
      case 'tagged': {
        const tag = getTag(patt);
        const matchHelper = maybeMatchHelper(tag);
        if (matchHelper !== undefined) {
          // This check guarantees the payload invariants assumed by the other
          // matchHelper methods.
          return matchHelper.checkIsMatcherPayload(patt.payload, check);
        }
        switch (tag) {
          case 'copySet':
          case 'copyBag': {
            assert(
              !isKey(patt),
              X`internal: The key case should have been dealt with earlier: ${patt}`,
            );
            return check(
              false,
              X`A ${q(tag)} must be a Key but was not: ${patt}`,
            );
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
              X`A passable tagged ${q(tag)} is not a pattern: ${patt}`,
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
  const isPattern = patt => checkPattern(patt, x => x);

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
  const isKeyPattern = patt => checkKeyPattern(patt, x => x);

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
    if (isKey(patt)) {
      // Takes care of all patterns which are keys, so the rest of this
      // logic can assume patterns that are not key.
      return check(keyEQ(specimen, patt), X`${specimen} - Must be: ${patt}`);
    }
    assertPattern(patt);
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
            X`Array ${specimen} - Must be as long as copyArray pattern: ${patt}`,
          );
        }
        return patt.every((p, i) => checkMatches(specimen[i], p, check, i));
      }
      case 'copyRecord': {
        if (specStyle !== 'copyRecord') {
          return check(
            false,
            X`${specimen} - Must be a copyRecord to match a copyRecord pattern: ${patt}`,
          );
        }
        const [specNames, specValues] = recordParts(specimen);
        const [pattNames, pattValues] = recordParts(patt);
        {
          const missing = listDifference(pattNames, specNames);
          if (missing.length >= 1) {
            return check(
              false,
              X`${specimen} - Must have missing properties ${q(missing)}`,
            );
          }
          const unexpected = listDifference(specNames, pattNames);
          if (unexpected.length >= 1) {
            return check(
              false,
              X`${specimen} - Must not have unexpected properties: ${q(
                unexpected,
              )}`,
            );
          }
        }
        return pattNames.every((label, i) =>
          checkMatches(specValues[i], pattValues[i], check, label),
        );
      }
      case 'tagged': {
        const pattTag = getTag(patt);
        const matchHelper = maybeMatchHelper(pattTag);
        if (matchHelper) {
          return matchHelper.checkMatches(specimen, patt.payload, check);
        }
        if (specStyle !== 'tagged' || getTag(specimen) !== pattTag) {
          return check(
            false,
            X`${specimen} - Only a ${q(pattTag)} matches a ${q(
              pattTag,
            )} pattern: ${patt}`,
          );
        }
        const { payload: pattPayload } = patt;
        const { payload: specPayload } = specimen;
        switch (pattTag) {
          case 'copySet':
          case 'copyBag': {
            assert(
              !isKey(patt),
              X`internal: The key case should have been dealt with earlier: ${patt}`,
            );
            assert.fail(
              X`internal: A ${q(pattTag)} must be a Key but was not: ${patt}`,
            );
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
  const matches = (specimen, patt) => checkMatches(specimen, patt, x => x);

  /**
   * Returning normally indicates success. Match failure is indicated by
   * throwing.
   *
   * @param {Passable} specimen
   * @param {Pattern} patt
   * @param {string|number} [label]
   */
  const fit = (specimen, patt, label = undefined) => {
    checkMatches(specimen, patt, assertChecker, label);
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

  /**
   * @typedef {string} Kind
   * It is either a PassStyle other than 'tagged', or, if the underlying
   * PassStyle is 'tagged', then the `getTag` value.
   *
   * We cannot further restrict this to only possible passStyles
   * or known tags, because we wish to allow matching of tags that we
   * don't know ahead of time. Do we need to separate the namespaces?
   * TODO are we asking for trouble by lumping passStyles and tags
   * together into kinds?
   */

  /**
   * Checks only recognized kinds, and only if the specimen
   * passes the invariants associated with that recognition.
   * If the kind is unrecognized, then we must conservatively assume
   * that it does not satisfy invariants we cannot validate.
   *
   * @param {Passable} specimen
   * @param {Kind} kind
   * @param {Checker} check
   */
  const checkKind = (specimen, kind, check) => {
    assert(
      kind !== 'tagged',
      X`"tagged" is used as a kind escape and cannot be used as a kind`,
    );
    /** @type {Kind} */
    let specimenKind = passStyleOf(specimen);
    if (specimenKind !== 'tagged') {
      if (specimenKind === kind) {
        // passStyleOf already did all the invariant checking.
        return true;
      }
    } else {
      specimenKind = getTag(specimen);
      if (specimenKind === kind) {
        const matchHelper = maybeMatchHelper(kind);
        if (matchHelper) {
          // Buried here is the important case, where we process
          // the various patternNodes
          return matchHelper.checkIsMatcherPayload(specimen.payload, check);
        }
        switch (kind) {
          case 'copySet': {
            return checkCopySet(specimen, check);
          }
          case 'copyBag': {
            return checkCopyBag(specimen, check);
          }
          case 'copyMap': {
            return checkCopyMap(specimen, check);
          }
          default: {
            return check(false, X`cannot check unrecognized tag ${q(kind)}`);
          }
        }
      }
    }
    // quoting without quotes
    const details = X([`${specimenKind} `, ` - Must be a ${kind}`], specimen);
    return check(false, details);
  };

  // /////////////////////// Match Helpers /////////////////////////////////////

  /** @type {MatchHelper} */
  const matchAnyHelper = Far('match.any helper', {
    checkMatches: (_specimen, _matcherPayload, _check) => true,

    checkIsMatcherPayload: (matcherPayload, check) =>
      check(
        matcherPayload === undefined,
        X`Payload must be undefined: ${matcherPayload}`,
      ),

    getRankCover: (_matchPayload, _encodePassable) => ['', '{'],

    checkKeyPattern: (_matcherPayload, _check) => true,
  });

  /** @type {MatchHelper} */
  const matchAndHelper = Far('match:and helper', {
    checkMatches: (specimen, patts, check) => {
      return patts.every(patt => checkMatches(specimen, patt, check));
    },

    checkIsMatcherPayload: (allegedPatts, check) => {
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

    checkIsMatcherPayload: matchAndHelper.checkIsMatcherPayload,

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
          X`${specimen} - must fail negated pattern: ${patt}`,
        );
      } else {
        return true;
      }
    },

    checkIsMatcherPayload: checkPattern,

    getRankCover: (_patt, _encodePassable) => ['', '{'],

    checkKeyPattern,
  });

  /** @type {MatchHelper} */
  const matchScalarHelper = Far('M.scalar helper', {
    checkMatches: (specimen, _matcherPayload, check) =>
      checkScalarKey(specimen, check),

    checkIsMatcherPayload: matchAnyHelper.checkIsMatcherPayload,

    getRankCover: (_matchPayload, _encodePassable) => ['a', 'z~'],

    checkKeyPattern: (_matcherPayload, _check) => true,
  });

  /** @type {MatchHelper} */
  const matchKeyHelper = Far('M.key helper', {
    checkMatches: (specimen, _matcherPayload, check) =>
      checkKey(specimen, check),

    checkIsMatcherPayload: matchAnyHelper.checkIsMatcherPayload,

    getRankCover: (_matchPayload, _encodePassable) => ['a', 'z~'],

    checkKeyPattern: (_matcherPayload, _check) => true,
  });

  /** @type {MatchHelper} */
  const matchPatternHelper = Far('M.pattern helper', {
    checkMatches: (specimen, _matcherPayload, check) =>
      checkPattern(specimen, check),

    checkIsMatcherPayload: matchAnyHelper.checkIsMatcherPayload,

    getRankCover: (_matchPayload, _encodePassable) => ['a', 'z~'],

    checkKeyPattern: (_matcherPayload, _check) => true,
  });

  /** @type {MatchHelper} */
  const matchKindHelper = Far('M.kind helper', {
    checkMatches: checkKind,

    checkIsMatcherPayload: (allegedKeyKind, check) =>
      check(
        typeof allegedKeyKind === 'string',
        X`A kind name must be a string: ${allegedKeyKind}`,
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
        case 'undefined':
          return true;
        default:
          return check(false, X`${kind} keys are not supported`);
      }
    },
  });

  /** @type {MatchHelper} */
  const matchRemotableHelper = Far('match:remotable helper', {
    checkMatches: (specimen, remotableDesc, check) => {
      // Unfortunate duplication of checkKind logic, but no better choices.
      if (checkKind(specimen, 'remotable', x => x)) {
        return true;
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

    checkIsMatcherPayload: (allegedRemotableDesc, check) =>
      checkMatches(
        allegedRemotableDesc,
        harden({ label: M.string() }),
        check,
        'match:remotable payload',
      ),

    getRankCover: (_remotableDesc, _encodePassable) =>
      getPassStyleCover('remotable'),

    checkKeyPattern: (_remotableDesc, _check = x => x) => true,
  });

  /** @type {MatchHelper} */
  const matchLTEHelper = Far('match:lte helper', {
    checkMatches: (specimen, rightOperand, check) =>
      check(
        keyLTE(specimen, rightOperand),
        X`${specimen} - Must be <= ${rightOperand}`,
      ),

    checkIsMatcherPayload: checkKey,

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

    checkIsMatcherPayload: checkKey,

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

    checkIsMatcherPayload: checkKey,

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

    checkIsMatcherPayload: checkKey,

    getRankCover: matchGTEHelper.getRankCover,

    checkKeyPattern: (rightOperand, check) =>
      checkKeyPattern(rightOperand, check),
  });

  /** @type {MatchHelper} */
  const matchRecordOfHelper = Far('match:recordOf helper', {
    checkMatches: (specimen, entryPatt, check) =>
      checkKind(specimen, 'copyRecord', check) &&
      entries(specimen).every(el =>
        checkMatches(harden(el), entryPatt, check, el[0]),
      ),

    checkIsMatcherPayload: (entryPatt, check) =>
      checkMatches(
        entryPatt,
        harden([M.pattern(), M.pattern()]),
        check,
        'match:recordOf payload',
      ),

    getRankCover: _entryPatt => getPassStyleCover('copyRecord'),

    checkKeyPattern: (_entryPatt, check) =>
      check(false, X`Records not yet supported as keys`),
  });

  /** @type {MatchHelper} */
  const matchArrayOfHelper = Far('match:arrayOf helper', {
    checkMatches: (specimen, subPatt, check) =>
      checkKind(specimen, 'copyArray', check) &&
      specimen.every((el, i) => checkMatches(el, subPatt, check, i)),

    checkIsMatcherPayload: checkPattern,

    getRankCover: () => getPassStyleCover('copyArray'),

    checkKeyPattern: (_, check) =>
      check(false, X`Arrays not yet supported as keys`),
  });

  /** @type {MatchHelper} */
  const matchSetOfHelper = Far('match:setOf helper', {
    checkMatches: (specimen, keyPatt, check) =>
      checkKind(specimen, 'copySet', check) &&
      specimen.payload.every((el, i) => checkMatches(el, keyPatt, check, i)),

    checkIsMatcherPayload: checkPattern,

    getRankCover: () => getPassStyleCover('tagged'),

    checkKeyPattern: (_, check) =>
      check(false, X`CopySets not yet supported as keys`),
  });

  /** @type {MatchHelper} */
  const matchBagOfHelper = Far('match:bagOf helper', {
    checkMatches: (specimen, [keyPatt, countPatt], check) =>
      checkKind(specimen, 'copyBag', check) &&
      specimen.payload.every(
        ([key, count], i) =>
          checkMatches(key, keyPatt, check, `keys[${i}]`) &&
          checkMatches(count, countPatt, check, `counts[${i}]`),
      ),

    checkIsMatcherPayload: (entryPatt, check) =>
      checkMatches(
        entryPatt,
        harden([M.pattern(), M.pattern()]),
        check,
        'match:bagOf payload',
      ),

    getRankCover: () => getPassStyleCover('tagged'),

    checkKeyPattern: (_, check) =>
      check(false, X`CopyBags not yet supported as keys`),
  });

  /** @type {MatchHelper} */
  const matchMapOfHelper = Far('match:mapOf helper', {
    checkMatches: (specimen, [keyPatt, valuePatt], check) =>
      checkKind(specimen, 'copyMap', check) &&
      specimen.payload.keys.every((k, i) =>
        checkMatches(k, keyPatt, check, `keys[${i}]`),
      ) &&
      specimen.payload.values.every((v, i) =>
        checkMatches(v, valuePatt, check, `values[${i}]`),
      ),

    checkIsMatcherPayload: (entryPatt, check) =>
      checkMatches(
        entryPatt,
        harden([M.pattern(), M.pattern()]),
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

    checkIsMatcherPayload: (splitArgs, check) => {
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
        const { length: specLen } = specimen;
        const { length: baseLen } = base;
        if (specLen < baseLen) {
          newBase = harden(base.slice(0, specLen));
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

    checkIsMatcherPayload: matchSplitHelper.checkIsMatcherPayload,

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
  const BigintShape = makeKindMatcher('bigint');
  const NatShape = makeMatcher('match:gte', 0n);
  const StringShape = makeKindMatcher('string');
  const SymbolShape = makeKindMatcher('symbol');
  const RecordShape = makeKindMatcher('copyRecord');
  const ArrayShape = makeKindMatcher('copyArray');
  const SetShape = makeKindMatcher('copySet');
  const BagShape = makeKindMatcher('copyBag');
  const MapShape = makeKindMatcher('copyMap');
  const RemotableShape = makeKindMatcher('remotable');
  const ErrorShape = makeKindMatcher('error');
  const PromiseShape = makeKindMatcher('promise');
  const UndefinedShape = makeKindMatcher('undefined');

  const makeRemotableMatcher = (label = undefined) =>
    label === undefined
      ? RemotableShape
      : makeMatcher('match:remotable', harden({ label }));

  /**
   * @param {'sync'|'async'} callKind
   * @param {ArgGuard[]} argGuards
   * @param {ArgGuard[]} [optionalArgGuards]
   * @param {ArgGuard} [restArgGuard]
   * @returns {MethodGuard}
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
    bigint: () => BigintShape,
    nat: () => NatShape,
    string: () => StringShape,
    symbol: () => SymbolShape,
    record: () => RecordShape,
    array: () => ArrayShape,
    set: () => SetShape,
    bag: () => BagShape,
    map: () => MapShape,
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

    arrayOf: (subPatt = M.any()) => makeMatcher('match:arrayOf', subPatt),
    recordOf: (keyPatt = M.any(), valuePatt = M.any()) =>
      makeMatcher('match:recordOf', [keyPatt, valuePatt]),
    setOf: (keyPatt = M.any()) => makeMatcher('match:setOf', keyPatt),
    bagOf: (keyPatt = M.any(), countPatt = M.any()) =>
      makeMatcher('match:bagOf', [keyPatt, countPatt]),
    mapOf: (keyPatt = M.any(), valuePatt = M.any()) =>
      makeMatcher('match:mapOf', [keyPatt, valuePatt]),
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
  matches,
  fit,
  assertPattern,
  isPattern,
  assertKeyPattern,
  isKeyPattern,
  getRankCover,
  M,
} = makePatternKit();
