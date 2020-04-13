// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import fs from 'fs';
// eslint-disable-next-line import/no-extraneous-dependencies
import tmp from 'tmp';
import { producePromise } from '@agoric/produce-promise';
import { request } from 'http';

import { spawn } from 'child_process';

// To keep in sync with https://agoric.com/documentation/getting-started/

// Note that we currently only test:
// agoric init dapp-foo
// agoric install
// agoric start --reset
// agoric deploy ./contract/deploy.js ./api/deploy.js
// (For simple-exchange and autoswap, the above also makes and accepts offers)
// cd ui && yarn install
// cd ui && yarn start
test('workflow', async t => {
  try {
    // FIXME: Do a search for an unused port or allow specification.
    const PORT = '7999';
    process.env.PORT = PORT;

    const pspawn = (...args) => {
      const cp = spawn(...args);
      const pr = new Promise((resolve, _reject) => {
        cp.on('exit', resolve);
        cp.on('error', () => resolve(-1));
      });
      pr.cp = cp;
      return pr;
    };

    // Kill an entire process group.
    const pkill = (cp, signal = 'SIGINT') => process.kill(-cp.pid, signal);

    // Run all main programs with the '--sdk' flag if we are in agoric-sdk.
    const extraArgs = fs.existsSync(`${__dirname}/../../cosmic-swingset`)
      ? ['--sdk']
      : [];
    const myMain = args => {
      // console.error('running agoric-cli', ...extraArgs, ...args);
      return pspawn(`agoric`, [...extraArgs, ...args], {
        stdio: ['ignore', 'pipe', 'inherit'],
        detached: true,
      });
    };

    const olddir = process.cwd();
    const { name, removeCallback } = tmp.dirSync({
      unsafeCleanup: true,
      prefix: 'agoric-cli-test-',
    });

    const finalizers = [];
    const runFinalizers = sig => {
      while (finalizers.length) {
        const f = finalizers.shift();
        try {
          f();
        } catch (e) {
          // console.log(e);
        }
      }
      if (sig) {
        // We're dying due to signal.
        process.exit(1);
      }
    };

    try {
      process.on('SIGINT', runFinalizers);
      process.chdir(name);

      // ==============
      // agoric init dapp-foo
      t.equals(await myMain(['init', 'dapp-foo']), 0, 'init dapp-foo works');
      process.chdir('dapp-foo');

      // ==============
      // agoric install
      t.equals(await myMain(['install']), 0, 'install works');

      // ==============
      // agoric start --reset
      const startResult = producePromise();

      // TODO: Allow this to work even if the port is already used.
      const startP = myMain(['start', '--reset']);
      finalizers.push(() => pkill(startP.cp, 'SIGINT'));

      let stdoutStr = '';
      if (startP.cp.stdout) {
        startP.cp.stdout.on('data', chunk => {
          // console.log('stdout:', chunk.toString());
          stdoutStr += chunk.toString();
          if (stdoutStr.match(/(^|:\s+)swingset running$/m)) {
            startResult.resolve(true);
          }
        });
      }

      let timeout = setTimeout(startResult.resolve, 30000, 'timeout');
      t.equals(
        await startResult.promise,
        true,
        `swingset running before timeout`,
      );
      clearTimeout(timeout);

      // ==============
      // agoric deploy ./contract/deploy.js ./api/deploy.js
      const deployResult = producePromise();
      const deployP = myMain([
        'deploy',
        `--hostport=127.0.0.1:${PORT}`,
        './contract/deploy.js',
        './api/deploy.js',
      ]);
      finalizers.push(() => pkill(deployP.cp, 'SIGINT'));

      timeout = setTimeout(deployResult.resolve, 30000, 'timeout');
      const done = await Promise.race([deployResult.promise, deployP]);
      t.equals(done, 0, `deploy successful before timeout`);
      clearTimeout(timeout);

      // ==============
      // cd ui && yarn install
      const instRet = await pspawn(`yarn`, ['install'], {
        stdio: ['ignore', 'pipe', 'inherit'],
        cwd: 'ui',
        detached: true,
      });
      t.equals(instRet, 0, `cd ui && yarn install succeeded`);

      // ==============
      // cd ui && yarn start
      const uiStartP = pspawn(`yarn`, ['start'], {
        stdio: ['ignore', 'inherit', 'inherit'],
        cwd: 'ui',
        env: { ...process.env, PORT: '3000' },
        detached: true,
      });
      finalizers.push(() => pkill(uiStartP.cp, 'SIGINT'));
      const uiListening = producePromise();
      let retries = 0;
      const ival = setInterval(() => {
        try {
          const resolve = status => {
            clearInterval(ival);
            uiListening.resolve(status);
          };

          retries += 1;
          if (retries > 8) {
            resolve('too many retries');
            return;
          }

          const req = request('http://localhost:3000/', _res => {
            resolve('listening');
          });
          req.setTimeout(2000);
          req.on('error', err => {
            if (err.code !== 'ECONNREFUSED') {
              resolve(`Cannot connect to UI server: ${err}`);
            }
          });
          req.end();
        } catch (e) {
          console.error('cannot make request', e);
        }
      }, 3000);
      t.equals(
        await Promise.race([uiStartP, uiListening.promise]),
        'listening',
        `cd ui && yarn start succeeded`,
      );
      clearInterval(ival);
    } finally {
      process.off('SIGINT', runFinalizers);
      runFinalizers();
      process.chdir(olddir);
      removeCallback();
    }
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
