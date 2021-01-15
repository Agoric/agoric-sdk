import test from 'ava';
import * as childProcess from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { xsnap } from '@agoric/xsnap';

const importModuleUrl = `file://${__filename}`;

const asset = async (...segments) =>
  fs.promises.readFile(
    path.join(importModuleUrl.replace('file:/', ''), '..', ...segments),
    'utf-8',
  );

const decoder = new TextDecoder();

const xsnapOptions = {
  spawn: childProcess.spawn,
  os: os.type(),
};

test('bootstrap to SES lockdown', async t => {
  const bootScript = await asset('..', 'dist', 'bootstrap.umd.js');
  const messages = [];
  async function handleCommand(message) {
    messages.push(decoder.decode(message));
    return new Uint8Array();
  }
  const name = 'SES lockdown worker';
  const vat = xsnap({ ...xsnapOptions, handleCommand, name });
  await vat.evaluate(bootScript);
  t.deepEqual([], messages);

  await vat.evaluate(`
    const encoder = new TextEncoder();
    globalThis.send = msg => issueCommand(encoder.encode(JSON.stringify(msg)).buffer);
  `);
  await vat.evaluate(`
    send([ typeof harden, typeof Compartment ]);
  `);
  await vat.close();
  t.deepEqual(['["function","function"]'], messages);
});

test('child compartment cannot access start powers', async t => {
  const bootScript = await asset('..', 'dist', 'bootstrap.umd.js');
  const messages = [];
  async function handleCommand(message) {
    messages.push(decoder.decode(message));
    return new Uint8Array();
  }
  const vat = xsnap({ ...xsnapOptions, handleCommand });
  await vat.evaluate(bootScript);

  const script = await asset('escapeCompartment.js');
  await vat.evaluate(script);
  await vat.close();

  t.deepEqual(messages, ['err was TypeError: Not available']);
});
