import { promises as defaultFs } from 'fs';
import opener from 'opener';
import crypto from 'crypto';
import path from 'path';

import { openSwingStore } from '@agoric/swing-store-simple';

// From https://stackoverflow.com/a/43866992/14073862
export function generateAccessToken({
  stringBase = 'base64',
  byteLength = 48,
} = {}) {
  return new Promise((resolve, reject) =>
    crypto.randomBytes(byteLength, (err, buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(buffer.toString(stringBase));
      }
    }),
  );
}

export async function getAccessToken(port, powers = {}) {
  const { fs = defaultFs } = powers;

  const match = port.match(/^(.*:)?(\d+)$/);
  if (match) {
    port = match[2];
  }

  // Ensure we're protected with a unique accessToken for this basedir.
  const sharedStateDir = path.join(process.env.HOME || '', '.agoric');
  await fs.mkdir(sharedStateDir, { mode: 0o700, recursive: true });

  // Ensure an access token exists.
  const { storage, commit, close } = openSwingStore(sharedStateDir, 'state');
  const accessTokenKey = `accessToken/${port}`;
  if (!storage.has(accessTokenKey)) {
    storage.set(accessTokenKey, await generateAccessToken());
    commit();
  }
  const accessToken = storage.get(accessTokenKey);
  close();
  return accessToken;
}

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
