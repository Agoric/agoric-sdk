import test from 'ava';
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
  ['Error("foo")', '[Error: foo]'],
  ['TypeError("foo2")', '[TypeError: foo2]'],
  ['new Function("bar", 1)', '[Function: anonymous]'],
  ['() => "bab"', '[Function (anonymous)]'],
  ['new Proxy({}, {})', '{}'],
  ['new Proxy(() => {}, {})', '[Function (anonymous)]'],
  ["new Proxy(() => {}, { get: () => 'foo' })", '[Function: foo]'],

  // null prototype still works
  ['({__proto__: null})', '[Object: null prototype] {}'],
  [
    `({ __proto__: null, foo: 'bar' })`,
    "[Object: null prototype] { foo: 'bar' }",
  ],

  // throws during inspection do not propagate
  [
    `({
       get foo() {
         throw URIError("gotcha");
       },
     })`,
    '[cannot inspect (object) due to [URIError: gotcha]]',
  ],
  [
    `({
       get foo() {
         throw "gotcha";
       },
     })`,
    "[cannot inspect (object) due to 'gotcha']",
  ],
  [
    `({
       get foo() {
         throw {
           get bar() {
             throw "nested";
           },
         };
       },
     })`,
    '[cannot inspect (object) due to throw]',
  ],
];

test('unconfined inspect', t => {
  for (const testCase of testCases) {
    const [toEval, toRender] = Array.isArray(testCase)
      ? testCase
      : [testCase, testCase];
    // @ts-expect-error Left side of comma operator is unused and has no side effects.
    // eslint-disable-next-line no-eval
    const evaled = (1, eval)(`(${toEval})`);
    // t.log(evaled);
    // eslint-disable-next-line ava/assertion-arguments
    t.is(unconfinedInspect(evaled), toRender, toEval);
  }
});
