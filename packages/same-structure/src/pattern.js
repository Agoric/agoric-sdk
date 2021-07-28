// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import { assert, details as X, q } from '@agoric/assert';
import { PASS_STYLE, isComparable, passStyleOf } from '@agoric/marshal';

import { sameKey } from './sameKey.js';

const { ownKeys } = Reflect;

const TheAnything = harden({
  [PASS_STYLE]: 'patternNode',
  toString: () => 'matchAnything',
  patternKind: 'matchAnything',
});

const anything = () => TheAnything;

const matchAnything = (_, _specimen) => true;

const TheNothing = harden({
  [PASS_STYLE]: 'patternNode',
  toString: () => 'matchNothing',
  patternKind: 'matchNothing',
});

const nothing = () => TheNothing;

const matchNothing = (_, _specimen) => false;

const passStyle = style => {
  assert.typeof(style, 'string');
  return harden({
    [PASS_STYLE]: 'patternNode',
    toString: () => 'matchPassStyle',
    patternKind: 'matchPassStyle',
    style,
  });
};

const matchPassStyle = (stylePattern, specimen) =>
  passStyleOf(specimen) === stylePattern.style;

const not = antiPattern =>
  harden({
    [PASS_STYLE]: 'patternNode',
    toString: () => 'matchNot',
    patternKind: 'matchNot',
    pattern: antiPattern,
  });

const matchNot = (notPattern, specimen) =>
  // eslint-disable-next-line no-use-before-define
  !match(notPattern.antiPattern, specimen);

const or = (...patterns) =>
  harden({
    [PASS_STYLE]: 'patternNode',
    toString: () => 'matchOr',
    patternKind: 'matchOr',
    patterns,
  });

const matchOr = (orPattern, specimen) =>
  // eslint-disable-next-line no-use-before-define
  orPattern.patterns.every(p => match(p, specimen));

const and = (...patterns) =>
  harden({
    [PASS_STYLE]: 'patternNode',
    toString: () => 'matchAnd',
    patternKind: 'matchAnd',
    patterns,
  });

const matchAnd = (andPattern, specimen) =>
  // eslint-disable-next-line no-use-before-define
  andPattern.patterns.some(p => match(p, specimen));

export const M = harden({
  anything,
  nothing,
  passStyle,
  or,
  and,
  not,
});

const Matchers = harden({
  __proto__: null,
  matchAnything,
  matchNothing,
  matchPassStyle,
  matchNot,
  matchOr,
  matchAnd,
});

/**
 * We may eventually support destructuring patterns. But for now it
 * either matches or it doesn't.
 *
 * @param {Pattern} pattern
 * @param {Passable} specimen Note that speciment need not be comparable
 * @returns {boolean}
 */
export const match = (pattern, specimen) => {
  if (isComparable(pattern)) {
    // sameKey asserts that both of its operands are comparable,
    // so we need to guard that call.
    return isComparable(specimen) && sameKey(pattern, specimen);
  }
  // Below, we only need to deal with the cases where pattern may not
  // be comparable.
  const patternStyle = passStyleOf(pattern);
  switch (patternStyle) {
    case 'patternNode': {
      const matcher = Matchers[pattern.patternKind];
      assert.typeof(matcher, 'function');
      return matcher(pattern, specimen);
    }
    case 'copyArray': {
      if (pattern.length !== specimen.length) {
        return false;
      }
      return pattern.every((v, i) => match(v, specimen[i]));
    }
    case 'copyRecord': {
      const patternNames = ownKeys(pattern);
      if (patternNames.length !== ownKeys(specimen).length) {
        return false;
      }
      return patternNames.every(name => match(pattern[name], specimen[name]));
    }
    case 'copySet':
    case 'copyMap': {
      assert.fail(X`${q(patternStyle)} is not fully implemented`);
    }
    default: {
      assert.fail(X`Unexpected passStyle ${patternStyle}`, TypeError);
    }
  }
};
harden(match);
