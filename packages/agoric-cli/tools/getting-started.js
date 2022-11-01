/* global process setTimeout clearTimeout setInterval clearInterval */

import fs from 'fs';
import path from 'path';
// eslint-disable-next-line import/no-extraneous-dependencies
import tmp from 'tmp';
import { makePromiseKit } from '@endo/promise-kit';
import { request } from 'http';

import { spawn } from 'child_process';

import { makePspawn } from '../src/helpers.js';

const TIMEOUT_SECONDS = 20 * 60;

const dirname = new URL('./', import.meta.url).pathname;

// To keep in sync with https://agoric.com/documentation/getting-started/

// Note that we currently only test:
// agoric init dapp-foo
// agoric install
// agoric start --reset
// agoric deploy ./contract/deploy.js ./api/deploy.js
// (For simple-exchange and autoswap, the above also makes and accepts offers)
// cd ui && yarn install
// cd ui && yarn start

export const gettingStartedWorkflowTest = async (t, options = {}) => {
  const {
    init: initOptions = [],
    install: installOptions = [],
    start: startOptions = [],
    testUnsafePlugins = false,
  } = options;
  // FIXME: Do a search for an unused port or allow specification.
  const PORT = '7999';
  process.env.PORT = PORT;

  const pspawn = makePspawn({ spawn });

  // Kill an entire process group.
  const pkill = (cp, signal = 'SIGINT') => process.kill(-cp.pid, signal);

  function pspawnStdout(...args) {
    const ps = pspawn(...args);
    ps.childProcess.stdout.on('data', chunk => {
      process.stdout.write(chunk);
    });
    // ps.childProcess.unref();
    return ps;
  }

  const defaultAgoricCmd = () => {
    // Run all main programs with the '--sdk' flag if we are in agoric-sdk.
    const extraArgs = fs.existsSync(`${dirname}/../../cosmic-swingset`)
      ? ['--sdk']
      : [];
    const localCli = path.join(dirname, '..', 'bin', 'agoric');
    return [localCli, ...extraArgs];
  };
  const { AGORIC_CMD = JSON.stringify(defaultAgoricCmd()) } = process.env;
  const agoricCmd = JSON.parse(AGORIC_CMD);
  function myMain(args, opts = {}) {
    // console.error('running agoric-cli', ...extraArgs, ...args);
    return pspawnStdout(agoricCmd[0], [...agoricCmd.slice(1), ...args], {
      stdio: ['ignore', 'pipe', 'inherit'],
      env: { ...process.env, DEBUG: 'agoric' },
      detached: true,
      ...opts,
    });
  }

  const olddir = process.cwd();
  const { name } = tmp.dirSync({
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
    process.on('exit', runFinalizers);
    process.chdir(name);

    // ==============
    // agoric init dapp-foo
    if (process.env.AGORIC_INIT_OPTIONS) {
      const opts = JSON.parse(process.env.AGORIC_INIT_OPTIONS);
      initOptions.push(...opts);
    }
    t.is(
      await myMain(['init', ...initOptions, 'dapp-foo']),
      0,
      'init dapp-foo works',
    );
    process.chdir('dapp-foo');

    // ==============
    // agoric install
    if (process.env.AGORIC_INSTALL_OPTIONS) {
      const opts = JSON.parse(process.env.AGORIC_INSTALL_OPTIONS);
      installOptions.push(...opts);
    }
    t.is(await myMain(['install', ...installOptions]), 0, 'install works');

    // ==============
    // agoric start --reset
    const startResult = makePromiseKit();

    if (process.env.AGORIC_START_OPTIONS) {
      const opts = JSON.parse(process.env.AGORIC_START_OPTIONS);
      startOptions.push(...opts);
    }

    // TODO: Allow this to work even if the port is already used.
    const startP = myMain(['start', '--reset', ...startOptions]);
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
    startP.childProcess.on('close', code =>
      startResult.reject(Error(`early termination: ${code}`)),
    );

    const timeout = setTimeout(
      startResult.reject,
      TIMEOUT_SECONDS * 1000,
      'timeout',
    );
    t.is(await startResult.promise, true, `swingset running before timeout`);
    clearTimeout(timeout);

    const testDeploy = async (deployCmd, opts = {}) => {
      const deployResult = makePromiseKit();
      const deployP = myMain(
        ['deploy', `--hostport=127.0.0.1:${PORT}`, ...deployCmd],
        {
          stdio: [opts.stdin ? 'pipe' : 'ignore', 'pipe', 'inherit'],
        },
      );

      if (opts.stdin) {
        // Write the input to stdin.
        deployP.childProcess.stdin.write(opts.stdin);
        deployP.childProcess.stdin.end();
      }

      finalizers.push(() => pkill(deployP.childProcess, 'SIGINT'));
      const to = setTimeout(
        deployResult.resolve,
        TIMEOUT_SECONDS * 1000,
        'timeout',
      );
      const done = await Promise.race([deployResult.promise, deployP]);
      t.is(done, 0, `deploy ${deployCmd.join(' ')} successful before timeout`);
      clearTimeout(to);
    };

    // ==============
    // agoric deploy ./contract/deploy.js ./api/deploy.js
    await testDeploy(['./contract/deploy.js', './api/deploy.js']);

    for (const [suffix, code] of [
      ['/notthere', 404],
      ['', 200],
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

    // Test that the Node.js `-r esm`-dependent plugin works.
    await (testUnsafePlugins &&
      testDeploy(
        ['--allow-unsafe-plugins', `${dirname}/resm-plugin/deploy.js`],
        { stdin: 'yes\n' },
      ));

    // TODO: When it exists, Test that the Node.js native ESM plugin works.
  } finally {
    runFinalizers();
    process.off('SIGINT', runFinalizers);
    process.chdir(olddir);
  }
};
