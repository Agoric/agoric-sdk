/* global globalThis */
import defaultHttp from 'http';
import { promises as defaultFs } from 'fs';
import opener from 'opener';

const RETRY_DELAY_MS = 1000;

export async function getAccessToken(hostport, powers = {}) {
  const { fs = defaultFs, http = defaultHttp } = powers;

  if (!hostport.match(/^(localhost|127\.0\.0\.1):\d+$/)) {
    throw TypeError(`Only localhost is supported, not ${hostport}`);
  }

  const lookupToken = async () => {
    const basedir = await new Promise((resolve, reject) => {
      const req = http.get(`http://${hostport}/ag-solo-basedir`, res => {
        let buf = '';
        res.on('data', chunk => {
          buf += chunk;
        });
        res.on('close', () => resolve(buf));
      });
      req.on('error', e => {
        reject(e);
      });
    });

    return fs.readFile(`${basedir}/private-access-token.txt`, 'utf-8');
  };

  return new Promise((resolve, reject) => {
    const retryGetAccessToken = async () => {
      try {
        const accessToken = await lookupToken();
        resolve(accessToken);
      } catch (e) {
        if (e.code === 'ECONNREFUSED') {
          // Retry in a little bit.
          setTimeout(retryGetAccessToken, RETRY_DELAY_MS);
        } else {
          reject(e);
        }
      }
    };
    retryGetAccessToken();
  });
}

export default async function walletMain(progname, rawArgs, powers, opts) {
  const { anylogger, fs, http } = powers;
  const console = anylogger('agoric:wallet');

  let suffix;
  switch (opts.repl) {
    case 'yes':
      suffix = '';
      break;
    case 'no':
      suffix = '/wallet';
      break;
    case 'only':
      suffix = '?w=0';
      break;
    default:
      throw TypeError(`Unexpected --repl option ${JSON.stringify(opts.repl)}`);
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
    http,
  }).catch(e => console.error(`Trying to fetch access token:`, e));

  clearInterval(progressTimer);
  process.stderr.write('\n');

  // Write out the URL and launch the web browser.
  const walletUrl = `http://${
    opts.hostport
  }${suffix}#accessToken=${encodeURIComponent(walletAccessToken)}`;

  process.stdout.write(`${walletUrl}\n`);
  const browser = opener(walletUrl);
  browser.unref();
  process.stdout.unref();
  process.stderr.unref();
  process.stdin.unref();
}
