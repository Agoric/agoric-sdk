import test from 'ava';
import '@endo/init';

import { objectMap } from '../src/utils.js';

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
