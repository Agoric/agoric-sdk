/* eslint-env node */
import opener from 'opener';
import { assert, X } from '@endo/errors';
import { getAccessToken } from '@agoric/access-token';

export default async function walletMain(_progname, _rawArgs, powers, opts) {
  const { anylogger } = powers;
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

  const walletAccessToken = await getAccessToken(opts.hostport).catch(e => {
    console.error(`Trying to fetch access token:`, e);
    throw e;
  });

  clearInterval(progressTimer);
  process.stderr.write('\n');

  // Write out the URL and launch the web browser.
  const walletUrl = `http://${
    opts.hostport
  }${suffix}#accessToken=${encodeURIComponent(walletAccessToken)}`;

  process.stdout.write(`${walletUrl}\n`);
  let p;
  if (opts.browser) {
    const browser = opener(walletUrl);
    p = new Promise(resolve => browser.on('exit', resolve));
  }
  await p;
}
