import test from 'ava';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import url from 'url';

const dirname = url.fileURLToPath(new URL('.', import.meta.url));

function rimraf(dirPath) {
  try {
    // Node.js 16.8.0 warns:
    // In future versions of Node.js, fs.rmdir(path, { recursive: true }) will
    // be removed. Use fs.rm(path, { recursive: true }) instead
    if (fs.rmSync) {
      fs.rmSync(dirPath, { recursive: true });
    } else {
      fs.rmdirSync(dirPath, { recursive: true });
    }
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }
}

const encouragementBotGolden = [
  '=> loading bootstrap.js',
  '=> buildRootObject called',
  '=> bootstrap() called',
  '=> user.talkToBot is called with encouragementBot',
  '=> encouragementBot.encourageMe got the name: user',
  "=> the promise given by the call to user.talkToBot resolved to 'Thanks for the setup. I sure hope I get some encouragement...'",
  '=> user receives the encouragement: user, you are awesome, keep it up!',
];

async function innerTest(t, extraFlags, dbdir) {
  await new Promise(resolve => {
    const appDir = 'demo/encouragementBot';
    if (dbdir) {
      dbdir = `${appDir}/${dbdir}`;
      extraFlags += ` --dbdir ${dbdir}`;
    }
    const proc = spawn(`node bin/runner --init ${extraFlags} run ${appDir}`, {
      cwd: path.resolve(dirname, '..'),
      shell: true,
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    let output = '';
    proc.stdout.addListener('data', data => {
      output += data;
    });
    proc.addListener('exit', code => {
      t.is(code, 0, 'exits successfully');
      const outputLines = output.trim().split('\n');
      t.deepEqual(
        outputLines.slice(0, encouragementBotGolden.length),
        encouragementBotGolden,
      );
      t.is(
        outputLines.length - encouragementBotGolden.length,
        2,
        'runner outputs two final lines',
      );
      t.regex(
        outputLines[outputLines.length - 2],
        /^bootstrap result fulfilled:/,
      );
      t.regex(
        outputLines[outputLines.length - 1],
        /^runner finished [0-9]+ cranks/,
      );
      resolve();
      if (dbdir) {
        rimraf(dbdir);
      }
    });
  });
}

test('run encouragmentBot demo with memdb', async t => {
  await innerTest(t, '--memdb');
});

test('run encouragmentBot demo with lmdb', async t => {
  await innerTest(t, '--lmdb', 'lmdbtest');
});

test('run encouragmentBot demo with default', async t => {
  await innerTest(t, '', 'defaulttest');
});

test('run encouragmentBot demo with indirectly loaded vats', async t => {
  await innerTest(t, '--indirect', 'indirecttest');
});
