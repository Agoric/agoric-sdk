// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import { PASS_STYLE, isComparable, passStyleOf } from '@agoric/marshal';

import { sameKey } from './sameKey.js';

import { compareMagnitude, opCompare } from './magnitude.js';

import { compareFullOrder } from './full-order.js';

const { details: X, quote: q } = assert;

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

const style = passStyle => {
  assert.typeof(passStyle, 'string');
  return harden({
    [PASS_STYLE]: 'patternNode',
    toString: () => 'matchPassStyle',
    patternKind: 'matchPassStyle',
    passStyle,
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

const magnitude = (relationalOp, rightOperand) =>
  harden({
    [PASS_STYLE]: 'patternNode',
    toString: () => 'matchMagnitude',
    patternKind: 'matchMagnitude',
    relationalOp,
    rightOperand,
  });

const matchMagnitude = (magPattern, specimen) =>
  opCompare(
    magPattern.relationalOp,
    compareMagnitude(specimen, magPattern.rightOperand),
  );

const order = (relationalOp, rightOperand) =>
  harden({
    [PASS_STYLE]: 'patternNode',
    toString: () => 'matchOrder',
    patternKind: 'matchOrder',
    relationalOp,
    rightOperand,
  });

const matchOrder = (orderPattern, specimen) =>
  opCompare(
    orderPattern.relationalOp,
    compareFullOrder(specimen, orderPattern.rightOperand),
  );

export const M = harden({
  anything,
  nothing,
  style,
  not,
  or,
  and,
  magnitude,
  lt: right => magnitude('lt', right),
  lte: right => magnitude('lte', right),
  eq: right => magnitude('eq', right),
  gte: right => magnitude('gte', right),
  gt: right => magnitude('gt', right),
  order,
});

const Matchers = harden({
  __proto__: null,
  matchAnything,
  matchNothing,
  matchPassStyle,
  matchNot,
  matchOr,
  matchAnd,
  matchMagnitude,
  matchOrder,
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
    case 'copySet': {
      //
      assert.fail(X`${q(patternStyle)} is not fully implemented`);
    }
    case 'copyMap': {
      assert.fail(X`${q(patternStyle)} is not fully implemented`);
    }
    default: {
      assert.fail(X`Unexpected passStyle ${q(patternStyle)}`, TypeError);
    }
  }
};
harden(match);
