// @ts-check

import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { isKey, isScalarKey } from '../src/keys/checkKey.js';
import { compareKeys, keyEQ } from '../src/keys/compareKeys.js';
import { makeEncodeKey, makeDecodeKey } from '../src/patterns/encodeKey.js';
import { compareRank, makeComparatorKit } from '../src/patterns/rankOrder.js';
import { sample as originalSample } from './test-rankOrder.js';

const sample = originalSample.filter(val => !Object.is(val, -0));

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

const goldenPairs = harden([
  [37n, 'p0000000002:37'],
  [-1n, 'n9999999999:9'],
  [1, 'fbff0000000000000'],
  [-1, 'f400fffffffffffff'],
  [NaN, 'ffff8000000000000'],
  [0, 'f8000000000000000'],
]);

test('golden round trips', t => {
  for (const [k, e] of goldenPairs) {
    t.is(encodeKey(k), e, 'does k encode as expected');
    t.is(decodeKey(e), k, 'does the key round trip through the encoding');
  }
  // Not round trips
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
    if (isScalarKey(x) && isScalarKey(y)) {
      // TODO We're working towards making all keys encodable, but
      // currently only scalars are.
      const ex = encodeKey(x);
      const ey = encodeKey(y);
      const encComp = compareRank(ex, ey);
      t.is(encComp, fullComp);
      const dx = decodeKey(ex);
      const dy = decodeKey(ey);
      t.assert(keyEQ(x, dx));
      t.assert(keyEQ(y, dy));
    }
  }
};

test('order invariants', t => {
  for (let i = 0; i < sample.length; i += 1) {
    for (let j = i; j < sample.length; j += 1) {
      orderInvariants(t, sample[i], sample[j]);
    }
  }
});
