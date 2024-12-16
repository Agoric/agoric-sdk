import test from 'ava';
import { pdon } from '../src/pdon.js';

test('pdon stringify basic types', t => {
  t.is(pdon.stringify(null), '#null');
  t.is(pdon.stringify(true), '#true');
  t.is(pdon.stringify(false), '#false');
  t.is(pdon.stringify(123), '#123');
  t.is(pdon.stringify('hello'), '#"hello"');
  t.is(pdon.stringify([1, 2, 3]), '#[1,2,3]');
  t.is(pdon.stringify({ a: 1, b: 2 }), '#{"a":1,"b":2}');
});

test('pdon parse basic types', t => {
  t.is(pdon.parse('#null'), null);
  t.is(pdon.parse('#true'), true);
  t.is(pdon.parse('#false'), false);
  t.is(pdon.parse('#123'), 123);
  t.is(pdon.parse('#"hello"'), 'hello');
  t.deepEqual(pdon.parse('#[1,2,3]'), [1, 2, 3]);
  t.deepEqual(pdon.parse('#{"a":1,"b":2}'), { a: 1, b: 2 });
});

test('pdon nested structures', t => {
  const nested = {
    array: [1, 'two', { three: 3 }],
    obj: {
      nested: {
        deeper: [true, null],
      },
    },
  };
  const stringified = pdon.stringify(nested);
  const parsed = pdon.parse(stringified);
  t.deepEqual(parsed, nested);
});

test('pdon rejects non-pure data', t => {
  // Functions are not pure data
  t.throws(() => pdon.stringify(() => {}), { instanceOf: Error });

  // Objects with methods are not pure data
  t.throws(
    () =>
      pdon.stringify({
        method() {},
      }),
    { instanceOf: Error },
  );

  // Objects with symbol properties are not pure data
  const sym = Symbol('test');
  t.throws(
    () =>
      pdon.stringify({
        [sym]: 'value',
      }),
    { instanceOf: Error },
  );
});

test('pdon parse invalid input', t => {
  // Lax about missing '#'
  t.deepEqual(pdon.parse('{"not":"valid"}'), { not: 'valid' });

  // Invalid JSON after #
  t.throws(() => pdon.parse('#not json'), { instanceOf: Error });

  // Empty string
  t.throws(() => pdon.parse(''), { instanceOf: Error });

  // Just #
  t.throws(() => pdon.parse('#'), { instanceOf: Error });
});
