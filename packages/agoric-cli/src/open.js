// @ts-check
import { assert, details as X } from '@agoric/assert';
import { Command } from 'commander';

/**
 * @typedef {{
 *   repl: boolean | 'only',
 *   browser: boolean,
 *   hostport: string,
 * }} OpenOpts
 *
 * @typedef {{
 *   setInterval: typeof setInterval,
 *   clearInterval: typeof clearInterval,
 * }} Timer
 *
 * @typedef {ReturnType<typeof import('@agoric/access-token').makeMyAgoricDir>} MyAgoricDir
 */

/**
 * @param {{
 *   stdout: typeof process.stdout,
 *   stderr: typeof process.stderr,
 * }} stdio
 * @param {Timer} timer
 */
export const makeTUI = ({ stdout, stderr }, { setInterval, clearInterval }) => {
  return harden({
    write: s => stdout.write(s),
    writeErr: s => stderr.write(s),
    /**
     * @template T
     *
     * @param {string} msg
     * @param {Promise<T>} job
     * @param {number=} interval
     */
    progress: async (msg, job, interval = 1000) => {
      stderr.write(msg);
      const progressDot = '.';
      const progressTimer = setInterval(
        () => stderr.write(progressDot),
        interval,
      );

      const result = await job;

      clearInterval(progressTimer);
      stderr.write('\n');
      return result;
    },
  });
};

/**
 * @param {OpenOpts} opts
 * @param {object} io
 * @param {ReturnType<typeof makeTUI>} io.tui
 * @param {MyAgoricDir} io.baseDir
 * @param {typeof import('opener')} io.opener
 * @param {typeof import('crypto').randomBytes} io.randomBytes
 */
const open = async (opts, { tui, baseDir, opener, randomBytes }) => {
  let suffix;
  switch (opts.repl) {
    case true:
      suffix = '';
      break;
    case false:
    case undefined:
      suffix = '/wallet/';
      break;
    case 'only':
      suffix = '?w=0';
      break;
    default:
      assert.fail(
        X`Unexpected --repl option ${JSON.stringify(opts.repl)}`,
        TypeError,
      );
  }

  const walletAccessToken = await tui.progress(
    `Launching wallet...`,
    baseDir
      .getAccessToken(opts.hostport, { randomBytes })
      .catch(e => console.error(`Trying to fetch access token:`, e)),
  );

  // Write out the URL and launch the web browser.
  const walletUrl = `http://${
    opts.hostport
  }${suffix}#accessToken=${encodeURIComponent(walletAccessToken)}`;

  tui.write(`${walletUrl}\n`);
  if (opts.browser) {
    const browser = opener(walletUrl);
    // safe: terminal-control-flow
    // eslint-disable-next-line @jessie.js/no-nested-await
    await new Promise(resolve => browser.on('exit', resolve));
  }
};

/**
 * @param {object} io
 * @param {ReturnType<makeTUI>} io.tui
 * @param {MyAgoricDir} io.baseDir
 * @param {typeof import('opener')} io.opener
 * @param {typeof import('crypto').randomBytes} io.randomBytes
 */
export const makeOpenCommand = ({ tui, baseDir, opener, randomBytes }) =>
  new Command('open')
    .description('launch the Agoric UI')
    .option(
      '--hostport <host:port>',
      'host and port to connect to VM',
      '127.0.0.1:8000',
    )
    .option('--no-browser', `just display the URL, don't open a browser`)
    .option(
      '--repl [yes | only | no]',
      'whether to show the Read-eval-print loop [yes]',
      value => {
        /** @type { boolean | 'only' } */
        const x = { yes: true, no: false, only: 'only' }[value];
        assert(
          x !== undefined,
          X`--repl must be one of 'yes', 'no', or 'only'`,
          TypeError,
        );
        return value;
      },
    )
    .action((/** @type {OpenOpts} */ opts) =>
      open(opts, { tui, opener, baseDir, randomBytes }),
    );
