import { test } from 'tape-promise/tape';
import fs from 'fs';
import tmp from 'tmp';

import { spawn } from 'child_process';

test('workflow', async t => {
  try {
    const pspawn = (...args) => {
      const cp = spawn(...args);
      const pr = new Promise((resolve, _reject) => {
        cp.on('exit', resolve);
        cp.on('error', () => resolve(-1));
      });
      pr.cp = cp;
      return pr;
    };

    // Run all main programs with the '--sdk' flag if we are in agoric-sdk.
    const extraArgs = fs.existsSync(`${__dirname}/../../cosmic-swingset`)
      ? ['--sdk']
      : [];
    const myMain = args => {
      console.error('running agoric-cli', ...extraArgs, ...args);
      return pspawn(`${__dirname}/../bin/agoric`, [...extraArgs, ...args], {
        stdio: ['ignore', 'pipe', 'inherit'],
      });
    };

    const olddir = process.cwd();
    const { name, removeCallback } = tmp.dirSync({
      unsafeCleanup: true,
      prefix: 'agoric-cli-test-',
    });
    try {
      process.chdir(name);

      t.equals(await myMain(['init', 'dapp-foo']), 0, 'init dapp-foo works');
      process.chdir('dapp-foo');
      t.equals(await myMain(['install']), 0, 'install works');

      const startP = myMain(['start', '--reset']);
      const to = setTimeout(() => startP.cp.kill('SIGHUP'), 10000);
      let stdoutStr = '';
      let successfulStart = false;
      startP.cp.stdout.on('data', chunk => {
        // console.log('stdout:', chunk.toString());
        stdoutStr += chunk.toString();
        if (stdoutStr.includes('HTTP/WebSocket will listen on')) {
          successfulStart = true;
          startP.cp.kill('SIGHUP');
          clearTimeout(to);
        }
      });

      await startP;
      clearTimeout(to);
      t.assert(successfulStart, 'start works');
    } finally {
      process.chdir(olddir);
      removeCallback();
    }
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
