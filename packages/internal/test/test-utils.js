// @ts-check
import test from 'ava';
import '@endo/init';

import { Far } from '@endo/far';
import {
  fromUniqueEntries,
  objectMap,
  makeMeasureSeconds,
  assertAllDefined,
  whileTrue,
  untilTrue,
  forever,
  deeplyFulfilledObject,
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

test('deeplyFulfilledObject', async t => {
  const someFar = Far('somefar', { getAsync: () => Promise.resolve('async') });
  const unfulfilled = harden({
    obj1: {
      obj2a: {
        stringP: Promise.resolve('foo'),
      },
      obj2b: someFar,
    },
  });
  const fulfilled = await deeplyFulfilledObject(unfulfilled);
  // JS check that it's a now string
  fulfilled.obj1.obj2a.stringP.length;
  t.deepEqual(fulfilled, {
    obj1: { obj2a: { stringP: 'foo' }, obj2b: someFar },
  });
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
  /** @type {{ s: string, m: string | undefined, u?: string}} */
  const obj = { s: 'defined', m: 'maybe' };
  assertAllDefined(obj);
  // typecheck
  obj.m.length;
  t.throws(
    () =>
      // @ts-expect-error key presence not checked
      obj.u.length,
  );

  t.throws(() => assertAllDefined({ u: undefined, v: undefined }), {
    message: 'missing ["u","v"]',
  });

  /** @type {{ prop?: number }} */
  const foo = {};
  assertAllDefined(foo);
  t.throws(
    () =>
      // @ts-expect-error key presence not checked
      foo.prop.toFixed,
  );
});

test('whileTrue', async t => {
  const elems = [1, 2, 3];
  /** @type {any} */
  let cur;
  let count = 0;
  for await (const produced of whileTrue(() => {
    cur = elems.shift();
    count += 1;
    return count % 2 === 0 ? cur : Promise.resolve(cur);
  })) {
    t.is(produced, cur, 'cur is produced');
    t.not(produced, undefined, 'produced is not undefined');
  }
  t.is(cur, undefined, 'cur is done');
  t.is(count, 4, 'count is expected');
});

test('untilTrue', async t => {
  const elems = [0, false, null, NaN, '', 'truey', 1.39];
  /** @type {any} */
  let cur;
  let count = 0;
  for await (const produced of untilTrue(() => {
    cur = elems.shift();
    count += 1;
    return count % 2 === 0 ? cur : Promise.resolve(cur);
  })) {
    t.is(produced, cur, 'cur is produced');
    t.assert(!produced, 'produced is falsy');
  }
  t.is(cur, 'truey', 'cur is done');
  t.is(count, 6, 'count is expected');
});

test('forever', async t => {
  let count = 0;
  for await (const produced of forever) {
    t.is(produced, undefined, 'produced is undefined');
    count += 1;
    if (count > 3) {
      break;
    }
  }
  t.is(count, 4, 'count is expected');
});
