// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import * as proc from 'child_process';
import * as os from 'os';
import * as fs from 'fs';

import { xsnap } from '../src/xsnap.js';

import { options, loader } from './message-tools.js';

const io = { spawn: proc.spawn, os: os.type() }; // WARNING: ambient
const ld = loader(import.meta.url, fs.promises.readFile);

test('bootstrap to SES lockdown', async t => {
  const bootScript = await ld.asset('../dist/bundle-ses-boot.umd.js');
  const opts = options(io);
  const name = 'SES lockdown worker';
  const vat = xsnap({ ...opts, name });
  await vat.evaluate(bootScript);
  t.deepEqual([], opts.messages);

  await vat.evaluate(`
    const encoder = new TextEncoder();
    globalThis.send = msg => issueCommand(encoder.encode(JSON.stringify(msg)).buffer);
  `);
  await vat.evaluate(`
    send([ typeof harden, typeof Compartment, typeof HandledPromise ]);
  `);
  await vat.close();
  t.deepEqual(['["function","function","function"]'], opts.messages);
});

test('child compartment cannot access start powers', async t => {
  const bootScript = await ld.asset('../dist/bundle-ses-boot.umd.js');
  const opts = options(io);
  const vat = xsnap(opts);
  await vat.evaluate(bootScript);

  const script = await ld.asset('escapeCompartment.js');
  await vat.evaluate(script);
  await vat.close();

  // Temporarily tolerate Endo behavior before and after
  // https://github.com/endojs/endo/pull/822
  // TODO Simplify once depending on SES post #822
  // t.deepEqual(opts.messages, [
  //   'err was TypeError: Function.prototype.constructor is not a valid constructor.',
  // ]);
  t.assert(
    opts.messages[0] === 'err was TypeError: Not available' ||
      opts.messages[0] ===
        'err was TypeError: Function.prototype.constructor is not a valid constructor.',
  );
});

test('SES deep stacks work on xsnap', async t => {
  const bootScript = await ld.asset('../dist/bundle-ses-boot.umd.js');
  const opts = options(io);
  const vat = xsnap(opts);
  await vat.evaluate(bootScript);
  await vat.evaluate(`
    const encoder = new TextEncoder();
    const send = msg => issueCommand(encoder.encode(JSON.stringify(msg)).buffer);

    const err = Error('msg');
    send('stack' in err);
    const msg = getStackString(err);
    send(msg);
  `);
  const [stackInErr, msg] = opts.messages.map(s => JSON.parse(s));
  t.assert(!stackInErr);
  t.is(typeof msg, 'string');
  t.assert(msg.length >= 1);
});

test('TextDecoder under xsnap handles TypedArray and subarrays', async t => {
  const bootScript = await ld.asset('../dist/bundle-ses-boot.umd.js');
  const opts = options(io);
  const vat = xsnap(opts);
  await vat.evaluate(bootScript);
  await vat.evaluate(`
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const send = msg => issueCommand(encoder.encode(JSON.stringify(msg)).buffer);

    const string = '0123456789';
    const bytes = encoder.encode(string).subarray(1, 4);
    send(bytes instanceof Uint8Array);
    send(ArrayBuffer.isView(bytes));
    const restring = decoder.decode(bytes);
    send(restring === string.slice(1, 4));
  `);
  for (const pass of opts.messages.map(s => JSON.parse(s))) {
    t.assert(pass);
  }
});

test('console - symbols', async t => {
  // our console-shim.js handles Symbol specially
  const bootScript = await ld.asset('../dist/bundle-ses-boot.umd.js');
  const opts = options(io);
  const vat = xsnap(opts);
  await vat.evaluate(bootScript);
  t.deepEqual([], opts.messages);
  await vat.evaluate(`
    const encoder = new TextEncoder();
    globalThis.send = msg => issueCommand(encoder.encode(JSON.stringify(msg)).buffer);
    console.log('console:', 123);
    console.log('console:', Symbol('anonymous'));
    console.log('console:', Symbol.for('registered'));
    send('ok');
  `);
  await vat.close();
  t.deepEqual(['"ok"'], opts.messages);
});
