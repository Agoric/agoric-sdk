import test from 'ava';
import '@endo/init';

import { objectMap, makeMeasureSeconds } from '../src/utils.js';

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
  const mockNow = () => times.shift();
  const measureSeconds = makeMeasureSeconds(mockNow);

  const unique = Symbol('unique');
  const output = await measureSeconds(async () => unique);
  t.deepEqual(output, { result: unique, duration: 1.0005 });
  t.deepEqual(times, [NaN]);
});
