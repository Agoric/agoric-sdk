// The third column, when present, shows how the original util.inspect
// prints, so we can keep track of the differences.
// See test-util-inspect.js
export const testCases = [
  '1',
  '1n',
  '12n',
  '123n',
  ['1_234n', undefined, '1234n'],
  ['12_345n', undefined, '12345n'],
  ['123_456n', undefined, '123456n'],
  ['1_234_567n', undefined, '1234567n'],
  ['12_345_678n', undefined, '12345678n'],
  ['123_456_789n', undefined, '123456789n'],
  ['-123_456_789n', undefined, `-123456789n`],
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
  [
    'new Date(133)',
    '1970-01-01T00:00:00.133Z',
    'Wed Dec 31 1969 16:00:00 GMT-0800 (Pacific Standard Time)',
  ],
  ['new RegExp("foo")', '/foo/'],
  ['new Map([["foo", "bar"]])', `Map (1) {'foo' => 'bar'}`],
  ['new Set(["foo"])', `Set (1) {'foo'}`],
  ['new WeakMap([[{}, "foo"]])', `WeakMap { ? }`],
  ['new WeakSet([{}])', `WeakSet { ? }`],
  ['Promise.resolve()', `Promise [Promise] {}`],
  [
    `Promise.resolve('x')`,
    `Promise [Promise] {}`,
    // Based on interactive testing in node repl, expected
    // `Promise { 'foo' }`
  ],
  [
    `(p => {
        p.catch(() => {});
        return p;
      })(Promise.reject(Error('foo')))`,
    `Promise [Promise] {}`,
    // Based on interactive testing in node repl, expected
    // `Promise { <rejected> Error: foo }`
  ],
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
    {
      message: 'gotcha',
    },
  ],
  [
    `({
       get foo() {
         throw "gotcha";
       },
     })`,
    "[cannot inspect (object) due to 'gotcha']",
    {
      // Ava cannot test that a function throws a non-error
      // https://github.com/avajs/ava/blob/main/docs/03-assertions.md#throwsfn-expectation-message
      skip: true,
    },
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
    {
      skip: true,
    },
  ],
];
