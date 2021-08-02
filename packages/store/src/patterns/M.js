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
  copyRecord: () => M.kind('copyRecord'),
  copyArray: () => M.kind('copyArray'),
  copySet: () => M.kind('copySet'),
  copyMap: () => M.kind('copyMap'),
  remotable: () => M.kind('remotable'),
  error: () => M.kind('error'),
  promise: () => M.kind('promise'),

  lt: rightSide => patt(makeTagged('match:lt', rightSide)),
  lte: rightSide => patt(makeTagged('match:lte', rightSide)),
  eq: key => {
    // Not needed because you can use `key` directly. But people may expect
    // M.eq by symmetry and it doesn't hurt.
    assertKey(key);
    return key;
  },
  gte: rightSide => patt(makeTagged('match:gte', rightSide)),
  gt: rightSide => patt(makeTagged('match:gt', rightSide)),
});
