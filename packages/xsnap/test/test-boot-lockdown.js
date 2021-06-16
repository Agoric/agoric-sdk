// @ts-check
/* global __filename */
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import * as proc from 'child_process';
import * as os from 'os';
import * as fs from 'fs';

import { xsnap } from '../src/xsnap.js';

import { options, loader } from './message-tools.js';

const importMeta = { url: `file://${__filename}` };

const io = { spawn: proc.spawn, os: os.type() }; // WARNING: ambient
const ld = loader(importMeta.url, fs.promises.readFile);

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

  t.deepEqual(opts.messages, ['err was TypeError: Not available']);
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
