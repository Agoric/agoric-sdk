/* global process setInterval clearInterval */
import opener from 'opener';

import { getAccessToken } from '@agoric/access-token';

const { details: X } = assert;

export default async function walletMain(progname, rawArgs, powers, opts) {
  const { anylogger, fs } = powers;
  const console = anylogger('agoric:wallet');

  let suffix;
  switch (opts.repl) {
    case 'yes':
    case 'true':
    case true:
      suffix = '';
      break;
    case 'no':
    case 'false':
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

  process.stderr.write(`Launching wallet...`);
  const progressDot = '.';
  const progressTimer = setInterval(
    () => process.stderr.write(progressDot),
    1000,
  );

  const walletAccessToken = await getAccessToken(opts.hostport, {
    console,
    fs,
  }).catch(e => console.error(`Trying to fetch access token:`, e));

  clearInterval(progressTimer);
  process.stderr.write('\n');

  // Write out the URL and launch the web browser.
  const walletUrl = `http://${
    opts.hostport
  }${suffix}#accessToken=${encodeURIComponent(walletAccessToken)}`;

  process.stdout.write(`${walletUrl}\n`);
  if (opts.browser) {
    const browser = opener(walletUrl);
    await new Promise(resolve => browser.on('exit', resolve));
  }
}
