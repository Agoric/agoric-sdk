// @ts-check

import { sameValueZero, passStyleOf, REMOTE_STYLE } from '@agoric/marshal';
import { assert, details as d, q } from '@agoric/assert';

import './types';

const { values } = Object;

/**
 * Special property name within a copyRecord that marks the copyRecord as
 * representing a non-literal pattern record. See `isGround`.
 */
const PATTERN_KIND = '@pattern';

/**
 * A pattern record that matches any specimen, i.e., a wildcard.
 */
const STAR_PATTERN = harden({ [PATTERN_KIND]: '*' });

/**
 * If `passable` is a pattern record, return the string identifying what kind
 * of pattern this pattern record represents. Else return undefined.
 *
 * @param {Passable} passable
 * @returns {PatternKind | undefined}
 */
const patternKindOf = passable => {
  const passStyle = passStyleOf(passable);
  if (passStyle === 'copyRecord' && PATTERN_KIND in passable) {
    const patternKind = passable[PATTERN_KIND];
    assert.string(patternKind);
    return patternKind;
  }
  return undefined;
};
harden(patternKindOf);

/**
 * A *passable* object is a pass-by-copy superstructure ending in
 * non-pass-by-copy leaves, each of which is either a promise or a
 * REMOTE_STYLE. A passable object in which none of the leaves are promises
 * is a *comparable*. A comparable object in which none of the
 * copyRecords are pattern records is *ground*. All other comparables are
 * *non-ground*.
 *
 * Only some contexts care about the distinction between ground and non-ground,
 * such as the arguments to the `match` function below. For most other purposes,
 * these are simply passable and comparable objects. However, some uses of
 * `sameStructure` to compare comparables should probably either be guarded by
 * `isGround` tests or converted to `match` calls.
 *
 * @param {Passable} passable
 * @returns {boolean}
 */
function isGround(passable) {
  const passStyle = passStyleOf(passable);
  switch (passStyle) {
    case 'null':
    case 'undefined':
    case 'string':
    case 'boolean':
    case 'number':
    case 'bigint':
    case REMOTE_STYLE:
    case 'copyError': {
      return true;
    }
    case 'promise': {
      return false;
    }
    case 'copyArray': {
      return passable.every(isGround);
    }
    case 'copyRecord': {
      const patternKind = patternKindOf(passable);
      if (patternKind !== undefined) {
        return false;
      }
      return values(passable).every(isGround);
    }
    default: {
      throw new TypeError(`unrecognized passStyle ${passStyle}`);
    }
  }
}
harden(isGround);

/**
 * @param {Pattern} outerPattern
 * @param {Ground} outerSpecimen
 * @returns {boolean}
 */
function matches(outerPattern, outerSpecimen) {
  assert(isGround(outerSpecimen), d`Can only match against ground comparables`);

  // TODO Reduce redundancy with sameStructure.
  function matchesInternal(pattern, specimen) {
    const patternKind = patternKindOf(pattern);
    switch (patternKind) {
      case undefined: {
        const patternStyle = passStyleOf(pattern);
        const specimenStyle = passStyleOf(specimen);
        assert(
          patternStyle !== 'promise',
          d`Cannot structurally compare promises: ${pattern}`,
        );
        assert(
          specimenStyle !== 'promise',
          d`Cannot structurally compare promises: ${specimen}`,
        );

        if (patternStyle !== specimenStyle) {
          return false;
        }
        switch (patternStyle) {
          case 'null':
          case 'undefined':
          case 'string':
          case 'boolean':
          case 'number':
          case 'bigint':
          case REMOTE_STYLE: {
            return sameValueZero(pattern, specimen);
          }
          case 'copyRecord':
          case 'copyArray': {
            const leftNames = Object.getOwnPropertyNames(pattern);
            const rightNames = Object.getOwnPropertyNames(specimen);
            if (leftNames.length !== rightNames.length) {
              return false;
            }
            for (const name of leftNames) {
              // TODO: Better hasOwnProperty check
              if (!Object.getOwnPropertyDescriptor(specimen, name)) {
                return false;
              }
              // TODO: Make cycle tolerant
              if (!matchesInternal(pattern[name], specimen[name])) {
                return false;
              }
            }
            return true;
          }
          case 'copyError': {
            return (
              pattern.name === specimen.name &&
              pattern.message === specimen.message
            );
          }
          default: {
            throw new TypeError(`unrecognized passStyle ${patternStyle}`);
          }
        }
      }
      case '*': {
        // wildcard. matches anything.
        return true;
      }
      case 'or': {
        const { subPatterns } = pattern;
        assert(
          Array.isArray(subPatterns),
          d`The "or" pattern ${pattern} needs an array of subPatterns`,
        );
        return subPatterns.some(subPattern =>
          matchesInternal(subPattern, specimen),
        );
      }
      case 'and': {
        const { subPatterns } = pattern;
        assert(
          Array.isArray(subPatterns),
          d`The "and" pattern ${pattern} needs an array of subPatterns`,
        );
        return subPatterns.every(subPattern =>
          matchesInternal(subPattern, specimen),
        );
      }
      case '>=': {
        const { rightOperand } = pattern;
        const rightType = typeof rightOperand;
        assert(
          ['number', 'bigint', 'string', 'boolean'].includes(rightType),
          d`A magnitude comparison pattern ${pattern} needs a primitive comparable rightOperand`,
        );
        assert(
          isGround(rightOperand),
          d`magnitude comparisons need ground operands, not patterns ${pattern}`,
        );
        const leftType = typeof specimen;
        if (leftType === 'number' || leftType === 'bigint') {
          if (rightType !== 'number' && rightType !== 'bigint') {
            return false;
          }
        } else if (leftType !== rightType) {
          return false;
        }
        return specimen >= rightOperand;
      }
      default: {
        throw assert.fail(d`unrecognized pattern kind ${q(patternKind)}`);
      }
    }
  }
  return matchesInternal(outerPattern, outerSpecimen);
}
harden(matches);

export {
  PATTERN_KIND as PATTERN,
  STAR_PATTERN,
  patternKindOf,
  matches,
  isGround,
};
