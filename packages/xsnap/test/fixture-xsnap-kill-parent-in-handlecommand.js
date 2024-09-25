import console from 'console';
import * as proc from 'child_process';
import * as os from 'os';
import fs from 'fs';
import process from 'node:process';
import { tmpName } from 'tmp';
import '@endo/init';
import { xsnap } from '../src/xsnap.js';
import { options } from './message-tools.js';

const io = { spawn: proc.spawn, os: os.type(), fs, tmpName };

async function handleCommand(_message) {
  process.kill(process.pid, 'SIGKILL');
  return new Uint8Array();
}

const vat = await xsnap({ ...options(io), handleCommand });
await vat.evaluate(
  'function handleCommand(message) { issueCommand(new Uint8Array().buffer); };',
);
await vat.issueStringCommand('0');
console.error('Error: parent was not killed!');
await vat.close();
