import { test } from 'tape-promise/tape';
import fs from 'fs';
import tmp from 'tmp';

import { spawn } from 'child_process';

const SIMPLEST_TEMPLATE = 'dapp-encouragement';

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
      // console.error('running agoric-cli', ...extraArgs, ...args);
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

      t.equals(
        await myMain([
          'init',
          'dapp-foo',
          `--dapp-template=${SIMPLEST_TEMPLATE}`,
        ]),
        0,
        'init dapp-foo works',
      );
      process.chdir('dapp-foo');
      t.equals(await myMain(['install']), 0, 'install works');

      t.equals(
        await myMain(['start', '--no-restart']),
        0,
        'initial start works',
      );

      // Prevent the connections from interfering with the test.
      fs.writeFileSync('_agstate/agoric-servers/dev/connections.json', '[]\n');
      const startP = myMain(['start', '--delay=-1']);

      let stdoutStr = '';
      let successfulStart = false;
      if (startP.cp.stdout) {
        startP.cp.stdout.on('data', chunk => {
          // console.log('stdout:', chunk.toString());
          stdoutStr += chunk.toString();
          if (stdoutStr.match(/(^|:\s+)swingset running$/m)) {
            successfulStart = true;
            startP.cp.kill('SIGINT');
          }
        });
      }

      await startP;
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
