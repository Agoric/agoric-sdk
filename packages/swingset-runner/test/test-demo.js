import test from 'ava';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

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
      const uMsg = 'user vat is happy';
      t.not(output.indexOf(`\n${uMsg}\n`), -1, uMsg);
      const bMsg = 'bot vat is happy';
      t.not(output.indexOf(`\n${bMsg}\n`), -1, bMsg);
      resolve();
      if (dbdir) {
        fs.rmdirSync(dbdir, { recursive: true });
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
