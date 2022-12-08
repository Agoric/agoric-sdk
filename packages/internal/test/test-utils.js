// @ts-check
import test from 'ava';
import '@endo/init';

import {
  fromUniqueEntries,
  objectMap,
  makeMeasureSeconds,
  assertAllDefined,
} from '../src/utils.js';

test('fromUniqueEntries', t => {
  /** @type {[string | symbol, number][]} */
  const goodEntries = [
    ['a', 7],
    ['b', 8],
    [Symbol.hasInstance, 9],
  ];
  const goodObj1 = Object.fromEntries(goodEntries);
  t.deepEqual(goodObj1, {
    a: 7,
    b: 8,
    [Symbol.hasInstance]: 9,
  });
  const goodObj2 = fromUniqueEntries(goodEntries);
  t.deepEqual(goodObj2, goodObj1);

  /** @type {[string | symbol, number][]} */
  const badEntries = [
    ['a', 7],
    ['a', 8],
    [Symbol.hasInstance, 9],
  ];
  const badObj = Object.fromEntries(badEntries);
  t.deepEqual(badObj, {
    a: 8,
    [Symbol.hasInstance]: 9,
  });
  t.throws(() => fromUniqueEntries(badEntries), {
    message: /^collision on property name "a": .*$/,
  });
});

test('objectMap', t => {
  // @ts-expect-error
  t.throws(() => objectMap({ a: 1 }), { message: 'mapFn is not a function' });
  t.deepEqual(
    objectMap({ a: 1 }, val => val * 2),
    { a: 2 },
  );
  t.deepEqual(
    objectMap({ a: 1 }, (val, key) => `${key}:${val}`),
    { a: 'a:1' },
  );
});

test('makeMeasureSeconds', async t => {
  const times = [1000.25, 2000.75, NaN];
  /** @type {() => number} */
  // @ts-expect-error undefined on fourth call
  const mockNow = () => times.shift();
  const measureSeconds = makeMeasureSeconds(mockNow);

  const unique = Symbol('unique');
  const output = await measureSeconds(async () => unique);
  t.deepEqual(output, { result: unique, duration: 1.0005 });
  t.deepEqual(times, [NaN]);
});

test('assertAllDefined', t => {
  /** @type {{s: string, m?: string | undefined}} */
  const obj = { s: 'defined', m: 'maybe' };
  assertAllDefined(obj);
  // typecheck
  obj.m.length;

  t.throws(() => assertAllDefined({ u: undefined, v: undefined }), {
    message: 'missing ["u","v"]',
  });
});
