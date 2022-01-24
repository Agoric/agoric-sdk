// JavaScript correctness tests

import '@agoric/install-ses';

// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import * as proc from 'child_process';
import * as os from 'os';
import { encodeBase64, decodeBase64 } from '@endo/base64';
import { xsnap } from '../src/xsnap.js';
import { options } from './message-tools.js';

const io = { spawn: proc.spawn, os: os.type() }; // WARNING: ambient

test('reject odd regex range', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  await vat
    .evaluate(
      `const FILENAME_FILTER = /^((?:.*[( ])?)[:/\\w-_]*\\/(packages\\/.+)$/;`,
    )
    .then(_ => {
      t.fail('should throw');
    })
    .catch(_ => {
      t.pass();
    });
  await vat.terminate();
});

test('accept std regex range', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  await vat.evaluate(
    `const FILENAME_FILTER = /^((?:.*[( ])?)[:/\\w_-]*\\/(packages\\/.+)$/;`,
  );
  t.pass();
  await vat.terminate();
});

test('simple TextEncoder / TextDecoder are available', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  t.teardown(() => vat.terminate());
  await vat.evaluate(`
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const send = it => issueCommand(encoder.encode(JSON.stringify(it)).buffer);
    send("Hello! 😊")
    send(decoder.decode(new Uint8Array([65, 0, 65]).buffer));
  `);
  t.deepEqual(opts.messages, ['"Hello! 😊"', '"A\\u0000A"']);
});

test('Base64.encode', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  t.teardown(() => vat.terminate());
  await vat.evaluate(`
    const encoder = new TextEncoder();
    globalThis.handleCommand = inputBuffer => {
      const outputString = Base64.encode(inputBuffer);
      const outputUint8Array = encoder.encode(outputString);
      globalThis.issueCommand(outputUint8Array.buffer);
    };
  `);
  const inputUint8Array = new TextEncoder().encode('Hello, World! 😃🌍');
  const expectedOutputString = encodeBase64(inputUint8Array);
  await vat.issueCommand(inputUint8Array);
  t.deepEqual(opts.messages, [expectedOutputString]);
});

test('Base64.encode degenerate input case', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  t.teardown(() => vat.terminate());
  await vat.evaluate(`
    const encoder = new TextEncoder();
    globalThis.handleCommand = inputBuffer => {
      const outputString = Base64.encode(inputBuffer);
      const outputUint8Array = encoder.encode(outputString);
      globalThis.issueCommand(outputUint8Array.buffer);
    };
  `);
  const inputUint8Array = new Uint8Array();
  const expectedOutputString = '';
  await vat.issueCommand(inputUint8Array);
  t.deepEqual(opts.messages, [expectedOutputString]);
});

test('Base64.decode', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  t.teardown(() => vat.terminate());
  await vat.evaluate(`
    const decoder = new TextDecoder();
    globalThis.handleCommand = inputBuffer => {
      const inputString = decoder.decode(inputBuffer);
      const outputBuffer = Base64.decode(inputString);
      globalThis.issueCommand(outputBuffer);
    };
  `);
  const expectedOutputString = 'Hello, World! 😃🌍  ';
  const expectedOutputUint8Array = new TextEncoder().encode(
    expectedOutputString,
  );
  const inputString = encodeBase64(expectedOutputUint8Array);
  await vat.issueStringCommand(inputString);
  t.deepEqual(opts.messages, [expectedOutputString]);
});

test('bigint map key', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  t.teardown(() => vat.terminate());
  await vat.evaluate(`
    const encoder = new TextEncoder();
    const send = it => issueCommand(encoder.encode(JSON.stringify(it)).buffer);
    const store = new Map([[1n, "abc"]]);
    send(store.get(1n))
  `);
  t.deepEqual(opts.messages, ['"abc"']);
});

test('bigint toString', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  t.teardown(() => vat.terminate());
  await vat.evaluate(`
    const encoder = new TextEncoder();
    const send = it => issueCommand(encoder.encode(JSON.stringify(it)).buffer);
    const txt = \`number: 1 2 3 bigint: \${0n} \${1n} \${BigInt(2)} \${BigInt(3)} .\`;
    send(txt)
  `);
  t.deepEqual(opts.messages, ['"number: 1 2 3 bigint: 0 1 2 3 ."']);
});

test('keyword in destructuring', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  t.teardown(() => vat.terminate());
  await vat.evaluate(`
    const encoder = new TextEncoder();
    const send = it => issueCommand(encoder.encode(JSON.stringify(it)).buffer);
    const { default: d, in: i } = { default: 1, in: 2 };
    send({ d, i })
  `);
  t.deepEqual(opts.messages, ['{"d":1,"i":2}']);
});

test('round-trip byte sequences via JSON including string literals', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  t.teardown(() => vat.terminate());

  // Appease typescript.
  const send = _val => /* dummy */ {};
  function checkStrings() {
    const octets = new Array(256).fill(0).map((_, i) => i);
    // We receive some external JSON data (from Golang) in the following format:
    const bstring1 = String.fromCharCode.apply(null, octets);
    send(bstring1.length === 256);

    // Test evaled string.
    const joctets = new Array(256)
      .fill(0)
      .map((_, i) => `\\x${i.toString(16).padStart(2, '0')}`)
      .join('');
    // eslint-disable-next-line no-eval
    const bstring2 = (1, eval)(`"${joctets}"`);
    send(bstring1 === bstring2);

    // Test JSON.stringify.
    const jstring1 = JSON.stringify(bstring1);
    const jstring2 = JSON.stringify(bstring2);
    send(jstring1 === jstring2);

    // Test JSON.parse.
    const bstring3 = JSON.parse(jstring1);
    send(bstring1 === bstring3);

    // We want to extract the octets:
    const octets2 = bstring3.split('').map(c => c.charCodeAt(0));
    send(octets2.length === 256);

    // And to be able to reencode them:
    const bstring4 = String.fromCharCode.apply(null, octets2);
    send(bstring1 === bstring4);
  }
  await vat.evaluate(`\
  const encoder = new TextEncoder();
  const send = it => issueCommand(encoder.encode(JSON.stringify(it)).buffer);
  ${checkStrings}
`);
  await vat.evaluate(`checkStrings()`);
  t.deepEqual(
    opts.messages.map(s => JSON.parse(s)),
    [true, true, true, true, true, true],
  );
});
