import test from 'ava';

import inspect from '../lib/object-inspect.js';

test('inspect', t => {
  t.is(inspect(1), '1');
  t.is(inspect(1n), '1n');
  t.is(inspect(1.1), '1.1');
  t.is(inspect(true), 'true');
  t.is(inspect(false), 'false');
  t.is(inspect(null), 'null');
  t.is(inspect(undefined), 'undefined');
  t.is(inspect(''), "''");
  t.is(inspect('foo'), "'foo'");
  t.is(inspect(['foo', 'bar']), `[ 'foo', 'bar' ]`);
  t.is(inspect({ foo: 'bar' }), `{ foo: 'bar' }`);
  t.is(inspect(/foo/), '/foo/');
  // t.is(inspect(new Date(133)), '1970-01-01T00:00:00.133Z');
  t.is(inspect(new RegExp('foo')), '/foo/');
  t.is(inspect(new Map([['foo', 'bar']])), `Map (1) {'foo' => 'bar'}`);
  t.is(inspect(new Set(['foo'])), `Set (1) {'foo'}`);
  t.is(inspect(new WeakMap([[{}, 'foo']])), `WeakMap { ? }`);
  t.is(inspect(new WeakSet([{}])), `WeakSet { ? }`);
  const circ = {};
  circ.ref = circ;
  t.is(inspect(circ), '{ ref: [Circular] }');
  t.is(inspect(new Error('foo')), '[Error: foo]');
  // eslint-disable-next-line no-new-func
  t.is(inspect(new Function('bar', 1)), '[Function: anonymous]');
  t.is(
    inspect(() => 'bab'),
    '[Function (anonymous)]',
  );

  // These are deficiencies in user space introspection of Proxies.
  t.is(inspect(new Proxy({}, {})), '{}');
  t.is(inspect(new Proxy(() => {}, {})), '[Function (anonymous)]');
  t.is(
    inspect(
      new Proxy(() => {}, {
        get: () => 'foo',
      }),
    ),
    '[Function: foo]',
  );
});
