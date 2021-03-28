/* global __dirname process setTimeout clearTimeout setInterval clearInterval */
/* eslint-disable import/no-extraneous-dependencies */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import fs from 'fs';
import tmp from 'tmp';
import { makePromiseKit } from '@agoric/promise-kit';
import { request } from 'http';

import { spawn } from 'child_process';

import { makePspawn } from '../lib/helpers';

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
  // FIXME: Do a search for an unused port or allow specification.
  const PORT = '7999';
  process.env.PORT = PORT;

  const pspawn = makePspawn({ spawn });

  // Kill an entire process group.
  const pkill = (cp, signal = 'SIGINT') => process.kill(-cp.pid, signal);

  function pspawnStdout(...args) {
    let output = '';
    const ps = pspawn(...args);
    ps.childProcess.stdout.on('data', chunk => {
      output += chunk.toString('utf-8');
    });
    ps.then(ret => {
      if (ret !== 0) {
        process.stdout.write(output);
      }
    });
    return ps;
  }

  // Run all main programs with the '--sdk' flag if we are in agoric-sdk.
  const extraArgs = fs.existsSync(`${__dirname}/../../cosmic-swingset`)
    ? ['--sdk']
    : [];
  function myMain(args) {
    // console.error('running agoric-cli', ...extraArgs, ...args);
    return pspawnStdout(`agoric`, [...extraArgs, ...args], {
      stdio: ['ignore', 'pipe', 'inherit'],
      env: { ...process.env, DEBUG: 'agoric' },
      detached: true,
    });
  }

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
    t.is(await myMain(['init', 'dapp-foo']), 0, 'init dapp-foo works');
    process.chdir('dapp-foo');

    // ==============
    // agoric install
    t.is(await myMain(['install']), 0, 'install works');

    // ==============
    // agoric start --reset
    const startResult = makePromiseKit();

    // TODO: Allow this to work even if the port is already used.
    const startP = myMain(['start', '--reset']);
    finalizers.push(() => pkill(startP.childProcess, 'SIGINT'));

    let stdoutStr = '';
    if (startP.childProcess.stdout) {
      startP.childProcess.stdout.on('data', chunk => {
        // console.log('stdout:', chunk.toString());
        stdoutStr += chunk.toString();
        if (stdoutStr.match(/(^|:\s+)swingset running$/m)) {
          startResult.resolve(true);
        }
      });
    }

    let timeout = setTimeout(startResult.resolve, 60000, 'timeout');
    t.is(await startResult.promise, true, `swingset running before timeout`);
    clearTimeout(timeout);

    // ==============
    // agoric deploy ./contract/deploy.js ./api/deploy.js
    const deployResult = makePromiseKit();
    const deployP = myMain([
      'deploy',
      `--hostport=127.0.0.1:${PORT}`,
      './contract/deploy.js',
      './api/deploy.js',
    ]);
    finalizers.push(() => pkill(deployP.childProcess, 'SIGINT'));

    timeout = setTimeout(deployResult.resolve, 60000, 'timeout');
    const done = await Promise.race([deployResult.promise, deployP]);
    t.is(done, 0, `deploy successful before timeout`);
    clearTimeout(timeout);

    for (const [suffix, code] of [
      ['/notthere', 404],
      ['', 200],
      ['/wallet', 301],
      ['/wallet/', 200],
    ]) {
      let urlResolve;
      const url = `http://127.0.0.1:${PORT}${suffix}`;
      const urlP = new Promise(resolve => (urlResolve = resolve));
      const urlReq = request(url, res => urlResolve(res.statusCode));
      urlReq.setTimeout(2000);
      urlReq.on('error', err => urlResolve(`Cannot connect to ${url}: ${err}`));
      urlReq.end();
      const urlTimeout = setTimeout(urlResolve, 3000, 'timeout');
      // eslint-disable-next-line no-await-in-loop
      const urlDone = await urlP;
      clearTimeout(urlTimeout);
      t.is(urlDone, code, `${url} gave status ${code}`);
    }

    // ==============
    // cd ui && yarn start
    const uiStartP = pspawn(`yarn`, ['start'], {
      stdio: ['ignore', 'inherit', 'inherit'],
      cwd: 'ui',
      env: { ...process.env, PORT: '3000' },
      detached: true,
    });
    finalizers.push(() => pkill(uiStartP.childProcess, 'SIGINT'));
    const uiListening = makePromiseKit();
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
    t.is(
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
});
