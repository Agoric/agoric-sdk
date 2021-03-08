/* global process setInterval clearInterval */
import { promises as defaultFs } from 'fs';
import opener from 'opener';
import crypto from 'crypto';
import path from 'path';
import os from 'os';

import { openSwingStore } from '@agoric/swing-store-simple';

import { assert, details as X } from '@agoric/assert';

// Adapted from https://stackoverflow.com/a/43866992/14073862
export function generateAccessToken({
  stringBase = 'base64url',
  byteLength = 48,
} = {}) {
  return new Promise((resolve, reject) =>
    crypto.randomBytes(byteLength, (err, buffer) => {
      if (err) {
        reject(err);
      } else if (stringBase === 'base64url') {
        // Convert to url-safe base64.
        const base64 = buffer.toString('base64');
        const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_');
        resolve(base64url);
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
  const sharedStateDir = path.join(os.homedir(), '.agoric');
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
