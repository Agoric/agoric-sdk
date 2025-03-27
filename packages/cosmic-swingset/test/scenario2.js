// @ts-check
import { text } from 'node:stream/consumers';

const { freeze, entries } = Object;

/**
 * @import { ChildProcess, SpawnOptions, StdioOptions } from 'child_process';
 */

/** @type {StdioOptions} */
const onlyStderr = ['ignore', 'ignore', 'inherit'];
/** @type {StdioOptions} */
const noOutput = ['ignore', 'ignore', 'ignore'];
// /* @type {StdioOptions} */
// const noisyDebug = ['ignore', 'inherit', 'inherit'];

/**
 *
 * @param {string} bin
 * @param {{ cwd: string, spawn: import('child_process')['spawn']}} param1
 */
export const pspawn = (bin, { spawn, cwd }) => {
  /**
   * @param {string[]} [args]
   * @param {SpawnOptions & { stdio?: StdioOptions }} [opts]
   */
  return (args = [], opts = {}) => {
    /** @type {ChildProcess} */
    let child;
    const exit = new Promise((resolve, reject) => {
      // When stderr is otherwise ignored, spy on it for inclusion in error messages.
      /** @type {Promise<string> | undefined} */
      let stderrP;
      // https://nodejs.org/docs/latest/api/child_process.html#optionsstdio
      let { stdio = 'pipe' } = opts;
      if (stdio === 'ignore' || stdio[2] === 'ignore') {
        stdio = typeof stdio === 'string' ? [stdio, stdio, stdio] : [...stdio];
        stdio[2] = 'pipe';
      } else {
        // The caller is not ignoring stderr, so we pretend it is empty here.
        stderrP = Promise.resolve('');
      }
      const resolvedOpts = { cwd, ...opts, stdio };
      // console.debug('spawn', bin, args, resolvedOpts);
      child = spawn(bin, args, resolvedOpts);
      if (!stderrP) {
        assert(child.stderr);
        stderrP = text(child.stderr);
        child.stderr = null;
      }
      child.addListener('exit', async code => {
        if (code !== 0) {
          let msg = `exit ${code} from command: ${bin} ${args.join(' ')}`;
          const errStr = await stderrP;
          if (errStr) {
            const errTail = errStr.split('\n').slice(-3);
            msg = `${msg}\n${errTail.map(line => `  ${line}`).join('\n')}`;
          }
          reject(Error(msg));
          return;
        }
        resolve(0);
      });
    });
    const kill = sig => {
      try {
        child.kill(sig);
      } catch (e) {
        if (e.code !== 'ERSCH') {
          throw e;
        }
      }
    };

    // @ts-expect-error child is set in the Promise constructor
    return { kill, child, exit };
  };
};

/**
 * Shared state for tests using scenario2 chain in ../
 *
 * @param {object} io
 * @param {ReturnType<typeof pspawn>} io.pspawnMake promise-style spawn of 'make' with cwd set
 * @param {ReturnType<typeof pspawn>} io.pspawnAgd promise-style spawn of 'agd' with cwd set
 * @param {import('child_process').StdioOptions} [io.stdio]
 * @param {typeof console.log} io.log
 */
export const makeScenario2 = ({ pspawnMake, pspawnAgd, log, stdio }) => {
  const runMake = (args, opts = { stdio: stdio || onlyStderr }) => {
    // console.debug('make', ...args);
    log('make', ...args);

    return pspawnMake(args, opts).exit;
  };

  const spawnMake = (args, opts = { stdio: stdio || onlyStderr }) => {
    log('make', ...args);
    return pspawnMake(args, opts);
  };

  // {X: 1} => ['X=1'], using JSON.stringify to mitigate injection risks.
  const bind = obj =>
    entries(obj)
      .filter(([_n, v]) => typeof v !== 'undefined')
      .map(([n, v]) => [`${n}=${JSON.stringify(v)}`])
      .flat();

  return freeze({
    runMake,
    spawnMake,
    setup: () => runMake(['scenario2-setup'], { stdio: stdio || noOutput }),
    /**
     *
     * @param {object} [opts]
     * @param {number} [opts.BLOCKS_TO_RUN]
     * @param {number} [opts.INITIAL_HEIGHT]
     */
    runToHalt: ({
      BLOCKS_TO_RUN = undefined,
      INITIAL_HEIGHT = undefined,
    } = {}) =>
      runMake([
        'scenario2-run-chain-to-halt',
        ...bind({ BLOCKS_TO_RUN, INITIAL_HEIGHT }),
      ]),
    runRosettaCI: async () => {
      return runMake(['scenario2-run-rosetta-ci'], {
        stdio: stdio || onlyStderr,
      });
    },
    export: () =>
      pspawnAgd(
        ['export', '--home=t1/n0', '--export-dir=t1/n0/genesis-export'],
        { stdio: stdio || onlyStderr },
      ).exit,
  });
};

/**
 * Wallet utilities for scenario2.
 *
 * @param {object} io
 * @param {ReturnType<typeof makeScenario2>['runMake']} io.runMake from makeScenario2 above
 * @param {ReturnType<typeof pspawn>} io.pspawnAgd as to makeScenario2 above
 * @param {(ms: number) => Promise<void>} io.delay
 * @param {typeof console.log} io.log
 */
export const makeWalletTool = ({ runMake, pspawnAgd, delay, log }) => {
  /**
   * @param {string[]} args
   * @param {object} [opts]
   * @returns {Promise<any>} JSON.parse of stdout of `ag-chain-cosmos query <...args>`
   * @throws if agd exits non-0 or gives empty output
   */
  const agd = async (args, opts = {}) => {
    const parts = [];
    /** @type {StdioOptions} */
    const pipedStdio = ['ignore', 'pipe', 'inherit'];
    if (typeof opts.stdio === 'string') {
      pipedStdio[2] = opts.stdio;
    } else if (opts.stdio) {
      pipedStdio[0] = opts.stdio?.[0] || 'ignore';
      pipedStdio[2] = opts.stdio?.[2] || 'inherit';
    }
    const cmd = pspawnAgd(args, { stdio: pipedStdio });
    const { stdout } = cmd.child;
    assert(stdout);
    stdout.on('data', chunk => parts.push(chunk));
    await cmd.exit;
    const txt = parts.join('').trim();
    if (txt === '') {
      throw Error(`empty output from: ${args.join(' ')}`);
    }
    return JSON.parse(txt);
  };

  /** @type {typeof agd}*/
  const query = (args, opts) => agd(['query', ...args], opts);

  /**
   * @param {string} addr
   */
  const queryBalance = addr =>
    query(['bank', 'balances', addr, '--output', 'json']).then(b => {
      console.log(addr, b);
      return b;
    });

  let consensusHeight;
  const waitForBlock = async (why, targetHeight, relative = false) => {
    let firstHeight = 0n;
    targetHeight = BigInt(targetHeight);
    if (relative) {
      if (typeof consensusHeight === 'undefined') {
        throw Error('cannot use relative before starting');
      }
      targetHeight += consensusHeight;
    }
    for (;;) {
      try {
        const info = await query(['block']);
        consensusHeight = BigInt(info?.block?.last_commit?.height);
        if (!consensusHeight) {
          throw Error('no consensus block yet');
        }

        if (!firstHeight) {
          firstHeight = consensusHeight + 1n;
        }

        if (consensusHeight <= firstHeight) {
          throw Error(
            `consensusHeight ${consensusHeight} <= firstHeight ${firstHeight}`,
          );
        }

        if (consensusHeight >= targetHeight) {
          log(info?.block?.header?.time, ' block ', consensusHeight);
          console.warn(why, ':', consensusHeight, '>=', targetHeight);
          // XXX: For backward compatibility, we dumb the height down to a Number.
          return Number(consensusHeight);
        }
        console.warn(why, ':', consensusHeight, '<', targetHeight, '5 sec...');
      } catch (reason) {
        console.warn(why, '2:', reason?.message, '5sec...');
      }
      await delay(5000);
    }
  };

  // one tx per block per address
  const myTurn = new Map(); // addr -> blockHeight
  const waitMyTurn = async (why, addr) => {
    const lastTurn = myTurn.get(addr) || 0;
    const nextHeight = await waitForBlock(why, lastTurn + 1);
    myTurn.set(addr, nextHeight);
  };

  // {X: 1} => ['X=1'], using JSON.stringify to mitigate injection risks.
  const bind = obj =>
    entries(obj)
      .filter(([_n, v]) => typeof v !== 'undefined')
      .map(([n, v]) => [`${n}=${JSON.stringify(v)}`])
      .flat();

  return freeze({
    agd,
    query,
    queryBalance,
    waitForBlock,
    fundAccount: async (ACCT_ADDR, FUNDS) => {
      const a4 = ACCT_ADDR.slice(-4);
      await waitMyTurn(`fund ${a4}`, 'bootstrap');
      await runMake([...bind({ ACCT_ADDR, FUNDS }), 'fund-acct']);
      await waitForBlock(`${a4}'s funds to appear`, 2, true);
      return queryBalance(ACCT_ADDR);
    },
    /** @param {string} ACCT_ADDR */
    provisionMine: ACCT_ADDR =>
      waitMyTurn('provision', ACCT_ADDR).then(() =>
        runMake([...bind({ ACCT_ADDR }), 'provision-my-acct']),
      ),
  });
};
