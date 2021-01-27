import test from 'ava';
import * as childProcess from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { xsnap } from '../src/xsnap';

const importMetaUrl = `file://${__filename}`;

const asset = async (...segments) =>
  fs.promises.readFile(
    path.join(importMetaUrl.replace('file:/', ''), '..', ...segments),
    'utf-8',
  );

const decoder = new TextDecoder();

const xsnapOptions = {
  spawn: childProcess.spawn,
  os: os.type(),
  stderr: 'inherit',
};

const readClock = () => Date.now();

test('SES can be restarted from snapshot (faster!)', async t => {
  // const t0 = readClock();
  const bootScript = await asset('..', 'dist', 'bootstrap.umd.js');
  const tAsset = readClock();
  const messages = [];
  async function handleCommand(message) {
    messages.push(decoder.decode(message));
    return new Uint8Array();
  }
  const name = 'SES lockdown worker';
  const vat = xsnap({ ...xsnapOptions, handleCommand, name });
  // const tSpawn = readClock();
  await vat.evaluate(`issueCommand(ArrayBuffer.fromString("Go!"));`);
  const tReady = readClock();
  await vat.evaluate(bootScript);
  const tLoad = readClock();
  await vat.evaluate('lockdown()');
  const tLockdown = readClock();
  console.log({
    'boot SES on XS': tLockdown - tAsset,
    // 'read bundle': tAsset - t0,
    'spawn + trivial eval': tReady - tAsset,
    'eval bundle': tLoad - tReady,
    'lockdown()': tLockdown - tLoad,
  });

  const snapshot = new URL('fixture-ses-snapshot.xss', importMetaUrl).pathname;
  await vat.snapshot(snapshot);
  const tSnapshot = readClock();
  const vatz = xsnap({
    ...xsnapOptions,
    handleCommand,
    snapshot,
    name: 'zygote',
  });
  // const tRestore = readClock();
  await vatz.evaluate('1+1');
  const tEval = readClock();
  await vatz.evaluate(`globalThis.c1 = new Compartment(); c1.evaluate('1+1')`);
  const tCompartment = readClock();
  await vatz.evaluate(`c1.evaluate('2+2')`);
  const tCompartment2 = readClock();
  await vatz.evaluate(`new Compartment().evaluate('3+3')`);
  const tCompartment3 = readClock();
  console.log({ 'write snapshot post lockdown()': tSnapshot - tLockdown });
  console.log({
    'start SES from snapshot': tEval - tSnapshot,
    'eval in new Compartment': tCompartment - tEval,
    'eval in same Compartment': tCompartment2 - tCompartment,
    'eval in another new Compartment': tCompartment3 - tCompartment2,
  });
  vat.close();
  t.pass();
});
