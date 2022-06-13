import test from 'ava';
import '@endo/init/debug.js';

import * as fs from 'fs';
import * as proc from 'child_process';
import * as os from 'os';
import { xsnap } from '../src/xsnap.js';
import { options } from './message-tools.js';

import unconfinedInspect from '../src/object-inspect.js';

const io = { spawn: proc.spawn, os: os.type() }; // WARNING: ambient
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

async function makeWorker() {
  const opts = options(io);
  const vat = xsnap(opts);

  const boot = fs.readFileSync(
    new URL('../dist/bundle-ses-boot.umd.js', import.meta.url).pathname,
    'utf8',
  );

  await vat.evaluate(`
    let printed = [];
    globalThis.print = (...args) => printed.push(args);
    globalThis.handleCommand = bytes => {
      const report = {};
      const src = new TextDecoder().decode(bytes);
      const it = eval(src);
      const output = printed;
      printed = [];
      output.push(it);
      report.result = new TextEncoder().encode(JSON.stringify(output)).buffer;
      return report;
    };
  `);

  await vat.evaluate(boot);

  return {
    /** @param { string } src */
    run: async src => {
      const { reply } = await vat.issueStringCommand(src);
      return JSON.parse(reply);
    },
  };
}

test('xsnap inspect', async t => {
  const w = await makeWorker();

  const isLockdownWarning = args => args[0].startsWith('Removing intrinsics.');
  const x = await w.run(`2+3`);
  t.deepEqual(
    x.filter(v => !Array.isArray(v) || !isLockdownWarning(v)),
    [5],
  );

  for (const testCase of testCases) {
    const [toEval, toRender] = Array.isArray(testCase)
      ? testCase
      : [testCase, testCase];
    // eslint-disable-next-line no-await-in-loop
    const [[renderedBox], shouldBeNull] = await w.run(
      // We need to box the value because `console.log` of plain strings won't
      // be passed through the inspector).
      `console.log([${toEval}])`,
    );
    t.is(renderedBox, `[ ${toRender} ]`, `${toEval} should be ${toRender}`);
    t.is(shouldBeNull, null, `${toEval} return value should be null`);
  }
});
