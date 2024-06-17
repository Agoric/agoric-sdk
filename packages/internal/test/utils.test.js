// @ts-check
import test from 'ava';

import { Far } from '@endo/far';
import {
  makeMeasureSeconds,
  assertAllDefined,
  whileTrue,
  untilTrue,
  forever,
  deeplyFulfilledObject,
  synchronizedTee,
} from '../src/utils.js';

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
  /** @type {{ s: string; m: string | undefined; u?: string }} */
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

/**
 * @template T
 * @param {AsyncIterable<T>} stream
 * @param {T[]} output
 * @param {number} [maxItems]
 */
const consumeStreamInto = async (stream, output, maxItems) => {
  for await (const item of stream) {
    output.push(item);
    if (output.length === maxItems) break;
  }
};

/**
 * @template T
 * @param {Iterable<T> | AsyncIterable<T>} items
 */
const generateStream = async function* generateStream(items) {
  yield* items;
};
harden(generateStream);

test('synchronizedTee - consumeAll - 1 reader', async t => {
  const sourceData = [1, 2, 3];
  const source = generateStream(sourceData);
  const output = /** @type {number[]} */ ([]);
  const [reader] = synchronizedTee(source, 1);
  await consumeStreamInto(reader, output);
  t.deepEqual(output, sourceData);
});

test('synchronizedTee - consumeAll - 2 reader', async t => {
  const sourceData = [1, 2, 3];
  const source = generateStream(sourceData);
  const output1 = /** @type {number[]} */ ([]);
  const output2 = /** @type {number[]} */ ([]);
  const [reader1, reader2] = synchronizedTee(source, 2);
  await Promise.all([
    consumeStreamInto(reader1, output1),
    consumeStreamInto(reader2, output2),
  ]);

  t.deepEqual(output1, sourceData);
  t.deepEqual(output2, sourceData);
});

test('synchronizedTee - break early', async t => {
  const sourceData = [1, 2, 3];
  const source = generateStream(sourceData);
  const output1 = /** @type {number[]} */ ([]);
  const output2 = /** @type {number[]} */ ([]);
  const [reader1, reader2] = synchronizedTee(source, 2);
  await Promise.all([
    consumeStreamInto(reader1, output1, 2),
    consumeStreamInto(reader2, output2),
  ]);

  t.deepEqual(output1, sourceData.slice(0, 2));
  t.deepEqual(output2, sourceData.slice(0, 2));
});

test('synchronizedTee - throw', async t => {
  const sourceData = [1, 2, 3];
  const source = generateStream(sourceData);
  const output1 = /** @type {number[]} */ ([]);
  const [reader1, reader2] = synchronizedTee(source, 2);
  const rejection = { message: 'Interrupted' };
  const result1 = consumeStreamInto(reader1, output1);
  const result2 = reader2.throw(Error(rejection.message));

  await t.throwsAsync(result1, { message: 'Teed stream threw' });
  await t.throwsAsync(result2, rejection);
});

test('synchronizedTee - consume synchronized', async t => {
  const sourceData = [1, 2, 3];
  const output1 = /** @type {number[]} */ ([]);
  const output2 = /** @type {number[]} */ ([]);
  let i = 0;
  async function* generate() {
    while (i < sourceData.length) {
      try {
        yield sourceData[i];
      } finally {
        i += 1;
        t.deepEqual(output1, sourceData.slice(0, i));
        t.deepEqual(output2, sourceData.slice(0, i));
      }
    }
  }
  harden(generate);
  const source = generate();
  const [reader1, reader2] = synchronizedTee(source, 2);
  await Promise.all([
    consumeStreamInto(reader1, output1),
    consumeStreamInto(reader2, output2, 2),
  ]);

  t.is(i, 2);
  t.deepEqual(output1, sourceData.slice(0, i));
  t.deepEqual(output2, sourceData.slice(0, i));
});
