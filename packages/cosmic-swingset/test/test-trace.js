import '@agoric/install-ses/debug.js';
import test from 'ava';

import { cleanAttrs } from '../src/kernel-trace.js';

test('cleanAttrs filters properly', t => {
  t.deepEqual(cleanAttrs({}), {});
  t.deepEqual(cleanAttrs({ result: null }), {});
  t.deepEqual(cleanAttrs({ result: undefined }), {});
  t.deepEqual(cleanAttrs({ a: 1, b: 39n }), { a: 1, b: 39 });
  t.deepEqual(cleanAttrs({ a: 1, b: { nested: null } }), { a: 1, b: '{}' });
  t.deepEqual(cleanAttrs({ a: true, b: false, c: { nested: false } }), {
    a: true,
    b: false,
    c: '{"nested":false}',
  });
  t.deepEqual(cleanAttrs({ a: 1n, b: 2n, c: { nested: 3n }, d: [1n] }), {
    a: 1,
    b: 2,
    c: '{"nested":3}',
    d: '[1]',
  });
});
