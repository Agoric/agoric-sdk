import { test } from 'tape-promise/tape';
import fs from 'fs';
import tmp from 'tmp';

import { spawn } from 'child_process';
import main from '../lib/main';

test('workflow', async t => {
  try {
    const myConsole = {
      error(...args) {
        t.deepEquals(args, [], 'no error output');
      },
      log(..._args) {},
    };

    const pspawn = (...args) =>
      new Promise((resolve, _reject) => {
        const cp = spawn(...args);
        cp.on('exit', resolve);
        cp.on('error', () => resolve(-1));
      });

    // Run all main programs with the '--sdk' flag if we are in agoric-sdk.
    const extraArgs = fs.existsSync(`${__dirname}/../../cosmic-swingset`)
      ? ['--sdk']
      : [];
    const myMain = args => {
      console.error('running agoric-cli', ...extraArgs, ...args);
      return pspawn(`${__dirname}/../bin/agoric`, [...extraArgs, ...args], {
        // TODO: make stdio more sane.
        // stdio: ['ignore', 'pipe', 'pipe'],
        stdio: 'inherit',
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
      //
      t.equals(await myMain(['install']), 0, 'install works');
      // It would be nice to test the 'dev' environment with a
      // "terminate for upgrade" flag instead of just --no-restart.
      t.equals(await myMain(['start', '--no-restart']), 0, 'start works');
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
