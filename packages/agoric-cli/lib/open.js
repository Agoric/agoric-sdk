import http from 'http';
import fs from 'fs';
import opener from 'opener';

const RETRY_DELAY_MS = 1000;

export async function getWebkey(hostport) {
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

  const privateWebkey = fs.readFileSync(
    `${basedir}/private-webkey.txt`,
    'utf-8',
  );

  return privateWebkey;
}

export default async function walletMain(progname, rawArgs, powers, opts) {
  const { anylogger } = powers;
  const console = anylogger('agoric:wallet');

  let suffix;
  switch (opts.repl) {
    case 'both':
      suffix = '';
      break;
    case 'none':
      suffix = '/wallet';
      break;
    case 'only':
      suffix = '?w=0';
      break;
    default:
      throw Error(`--repl must be one of 'both', 'none', or 'only'`);
  }

  process.stderr.write(`Launching wallet...`);
  const progressDot = '.';
  const progressTimer = setInterval(
    () => process.stderr.write(progressDot),
    1000,
  );
  const walletWebkey = await new Promise((resolve, reject) => {
    const retryGetWebkey = async () => {
      try {
        const webkey = await getWebkey(opts.hostport);
        resolve(webkey);
      } catch (e) {
        if (e.code === 'ECONNREFUSED') {
          // Retry in a little bit.
          setTimeout(retryGetWebkey, RETRY_DELAY_MS);
        } else {
          console.error(`Trying to fetch webkey:`, e);
          reject(e);
        }
      }
    };
    retryGetWebkey();
  });

  clearInterval(progressTimer);
  process.stderr.write('\n');

  // Write out the URL and launch the web browser.
  const walletUrl = `http://${
    opts.hostport
  }${suffix}#webkey=${encodeURIComponent(walletWebkey)}`;

  process.stdout.write(`${walletUrl}\n`);
  const browser = opener(walletUrl);
  browser.unref();
  process.stdout.unref();
  process.stderr.unref();
  process.stdin.unref();
}
