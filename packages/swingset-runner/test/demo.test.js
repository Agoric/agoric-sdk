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

async function innerTest(t, extraFlags, dbdir) {
  await new Promise(resolve => {
    const appDir = 'demo/encouragementBot';
    if (dbdir) {
      dbdir = `${appDir}/${dbdir}`;
      extraFlags += ` --dbdir ${dbdir}`;
    }
    const proc = spawn(`node bin/runner ${extraFlags} run ${appDir}`, {
      cwd: path.resolve(dirname, '..'),
      shell: true,
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    let output = '';
    proc.stdout.addListener('data', data => {
      output += data;
    });
    proc.addListener('exit', code => {
      t.log(output);
      t.is(code, 0, 'exits successfully');
      const uMsg = 'user vat is happy';
      t.not(output.indexOf(`\n${uMsg}\n`), -1, uMsg);
      const bMsg = 'bot vat is happy';
      t.not(output.indexOf(`\n${bMsg}\n`), -1, bMsg);
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

test('run encouragmentBot demo with sqlite', async t => {
  await innerTest(t, '--sqlite', 'sqlitetest');
});

test('run encouragmentBot demo with default', async t => {
  await innerTest(t, '', 'defaulttest');
});

test('run encouragmentBot demo with indirectly loaded vats', async t => {
  await innerTest(t, '--indirect', 'indirecttest');
});
