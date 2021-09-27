// @ts-check

import { makeTagged } from '@agoric/marshal';
import { assertKey } from '../keys/checkKey.js';
import { assertPattern } from './patternMatchers.js';

const patt = p => {
  assertPattern(p);
  return p;
};

export const M = harden({
  any: () => patt(makeTagged('match:any', undefined)),
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
  gte: rightSide => patt(makeTagged('match:gte', rightSide)),
  gt: rightSide => patt(makeTagged('match:gt', rightSide)),

  // TODO make more precise
  arrayOf: _elementPatt => M.array(),
  recordOf: _entryPatt => M.record(),
  setOf: _elementPatt => M.set(),
  mapOf: _entryPatt => M.map(),
});
