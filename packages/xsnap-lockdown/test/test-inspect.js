import test from 'ava';
import '@endo/init/debug.js';
import unconfinedInspect from '../lib/object-inspect.js';

const testCases = [
  '1',
  '1n',
  '12n',
  '123n',
  '1_234n',
  '12_345n',
  '123_456n',
  '1_234_567n',
  '12_345_678n',
  '123_456_789n',
  '-123_456_789n',
  '1.1',
  'true',
  'false',
  'null',
  'undefined',
  "''",
  "'foo'",
  "[ 'foo', 'bar' ]",
  "{ foo: 'bar' }",
  '/foo/',
  ['new Date(133)', '1970-01-01T00:00:00.133Z'],
  ['new RegExp("foo")', '/foo/'],
  ['new Map([["foo", "bar"]])', `Map (1) {'foo' => 'bar'}`],
  ['new Set(["foo"])', `Set (1) {'foo'}`],
  ['new WeakMap([[{}, "foo"]])', `WeakMap { ? }`],
  ['new WeakSet([{}])', `WeakSet { ? }`],
  ['Promise.resolve()', `Promise [Promise] {}`],
  [
    '(() => { const circ = {}; circ.ref = circ; return circ; })()',
    '{ ref: [Circular] }',
  ],
  [
    '(() => { const circ = {}; circ.ref = circ; return [circ, circ, { again: circ }]; })()',
    '[ { ref: [Circular] }, { ref: [Circular] }, { again: { ref: [Circular] } } ]',
  ],
  ['new Error("foo")', '[Error: foo]'],
  ['new TypeError("foo2")', '[TypeError: foo2]'],
  ['new Function("bar", 1)', '[Function: anonymous]'],
  ['() => "bab"', '[Function (anonymous)]'],
  ['new Proxy({}, {})', '{}'],
  ['new Proxy(() => {}, {})', '[Function (anonymous)]'],
  ["new Proxy(() => {}, { get: () => 'foo' })", '[Function: foo]'],
];

test('unconfined inspect', async t => {
  for (const testCase of testCases) {
    const [toEval, toRender] = Array.isArray(testCase)
      ? testCase
      : [testCase, testCase];
    // eslint-disable-next-line no-eval
    const evaled = (1, eval)(`(${toEval})`);
    // t.log(evaled);
    t.is(unconfinedInspect(evaled), toRender, toEval);
  }
});
