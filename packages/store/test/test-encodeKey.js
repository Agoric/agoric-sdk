// @ts-check
/* eslint-disable no-bitwise */

import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { isKey } from '../src/keys/checkKey.js';
import { compareKeys, keyEQ } from '../src/keys/compareKeys.js';
import { makeEncodeKey, makeDecodeKey } from '../src/patterns/encodeKey.js';
import { compareRank, makeComparatorKit } from '../src/patterns/rankOrder.js';
import { sample } from './test-rankOrder.js';

const { details: X } = assert;

const r2e = new Map();
const e2r = [];

const encodeRemotable = r => {
  if (r2e.has(r)) {
    return r2e.get(r);
  }
  const result = `r${e2r.length}`;
  r2e.set(r, result);
  e2r.push(r);
  return result;
};

const decodeRemotable = e => {
  assert(e.startsWith('r'), X`unexpected encoding ${e}`);
  const i = Number(BigInt(e.substring(1)));
  assert(i >= 0 && i < e2r.length);
  return e2r[i];
};

const compareRemotables = (x, y) =>
  compareRank(encodeRemotable(x), encodeRemotable(y));

const encodeKey = makeEncodeKey(encodeRemotable);

const decodeKey = makeDecodeKey(decodeRemotable);

const { comparator: compareFull } = makeComparatorKit(compareRemotables);

const asNumber = new Float64Array(1);
const asBits = new BigUint64Array(asNumber.buffer);
const getNaN = (hexEncoding = '0008000000000000') => {
  let bits = BigInt(`0x${hexEncoding}`);
  bits |= 0x7ff0000000000000n;
  if (!(bits & 0x0001111111111111n)) {
    bits |= 0x0008000000000000n;
  }
  asBits[0] = bits;
  return asNumber[0];
};

const NegativeNaN = getNaN('ffffffffffffffff');

const goldenPairs = harden([
  [37n, 'p1:2:37'],
  [934857932847598725662n, 'p2:21:934857932847598725662'],
  [-1n, 'n9999999999:9'],
  [1, 'fbff0000000000000'],
  [-1, 'f400fffffffffffff'],
  [NaN, 'ffff8000000000000'],
  [NegativeNaN, 'ffff8000000000000'],
  [0, 'f8000000000000000'],
  [Infinity, 'ffff0000000000000'],
  [-Infinity, 'f000fffffffffffff'],
]);

test('golden round trips', t => {
  for (const [k, e] of goldenPairs) {
    t.is(encodeKey(k), e, 'does k encode as expected');
    t.is(decodeKey(e), k, 'does the key round trip through the encoding');
  }
  // Not round trips
  t.is(encodeKey(-0), 'f8000000000000000');
  t.is(decodeKey('f0000000000000000'), NaN);
});

const orderInvariants = (t, x, y) => {
  const rankComp = compareRank(x, y);
  const fullComp = compareFull(x, y);
  if (rankComp !== 0) {
    t.is(rankComp, fullComp);
  }
  if (fullComp === 0) {
    t.is(rankComp, 0);
  } else {
    t.assert(rankComp === 0 || rankComp === fullComp);
  }
  if (isKey(x) && isKey(y)) {
    const keyComp = compareKeys(x, y);
    if (keyComp === 0) {
      t.is(fullComp, 0);
    } else if (Number.isNaN(keyComp)) {
      t.not(fullComp, 0);
    } else {
      t.is(keyComp, fullComp);
      t.is(keyComp, rankComp);
    }
    const ex = encodeKey(x);
    const ey = encodeKey(y);
    const encComp = compareRank(ex, ey);
    const dx = decodeKey(ex);
    const dy = decodeKey(ey);
    t.assert(keyEQ(x, dx));
    t.assert(keyEQ(y, dy));
    t.is(encComp, fullComp);
  }
};

test('order invariants', t => {
  for (let i = 0; i < sample.length; i += 1) {
    for (let j = i; j < sample.length; j += 1) {
      orderInvariants(t, sample[i], sample[j]);
    }
  }
});
