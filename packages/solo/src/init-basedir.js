// @ts-check
/* eslint-env node */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

import { assert, X } from '@endo/errors';
import anylogger from 'anylogger';
import { HELPER } from './chain-cosmos-sdk.js';

const console = anylogger('ag-solo:init');

const DEFAULT_WALLET = '@agoric/wallet';

const dirname = path.dirname(new URL(import.meta.url).pathname);

/**
 * @param {string} basedir
 * @param {string} webport
 * @param {string} webhost
 * @param {string} _subdir
 * @param {string[]} egresses
 * @param {Record<string, any>} opts
 */
export default function initBasedir(
  basedir,
  webport,
  webhost,
  _subdir,
  egresses,
  opts = {},
) {
  const { env = process.env } = opts;
  const {
    wallet = DEFAULT_WALLET,
    defaultManagerType = env.SWINGSET_WORKER_TYPE || 'xs-worker',
    ...options
  } = opts;
  options.wallet = wallet;
  options.defaultManagerType = defaultManagerType;

  // We either need a basedir with an initialised key, or no basedir.
  assert(
    fs.existsSync(path.join(basedir, 'ag-cosmos-helper-address')) ||
      !fs.existsSync(basedir),
    X`${basedir} must not already exist`,
  );

  fs.mkdirSync(basedir, { mode: 0o700, recursive: true });

  const connections = [{ type: 'http', port: webport, host: webhost }];
  fs.writeFileSync(
    path.join(basedir, 'connections.json'),
    `${JSON.stringify(connections)}\n`,
  );
  const dstHtmldir = path.join(basedir, 'html');
  fs.mkdirSync(dstHtmldir, { recursive: true });

  // Save the configuration options.
  fs.writeFileSync(path.join(basedir, 'options.json'), JSON.stringify(options));

  // Save our version codes.
  const pj = 'package.json';
  fs.copyFileSync(path.join(dirname, '..', pj), path.join(dstHtmldir, pj));
  const gr = 'git-revision.txt';
  try {
    fs.copyFileSync(
      path.join(dirname, '../public', gr),
      path.join(dstHtmldir, gr),
    );
  } catch (e) {
    let revision;
    try {
      // Don't allow git to fail.
      revision = execFileSync('git', ['describe', '--always', '--dirty']);
    } catch (_e) {
      revision = 'unknown\n';
    }
    fs.writeFileSync(path.join(dstHtmldir, gr), revision);
  }

  // cosmos-sdk mnemonic and keypair
  if (egresses.includes('cosmos')) {
    const agchServerDir = path.join(basedir, 'ag-cosmos-helper-statedir');
    if (!fs.existsSync(agchServerDir)) {
      const keyName = 'ag-solo';
      const mnemonicFile = path.join(basedir, 'ag-solo-mnemonic');

      let mnemonic = process.env.SOLO_MNEMONIC;
      if (!mnemonic) {
        console.log('generating mnemonic');
        mnemonic = execFileSync(HELPER, ['keys', 'mnemonic'], {
          stdio: ['ignore', 'pipe', 'inherit'],
        }).toString();
      }
      mnemonic = `${mnemonic.trimEnd()}\n`;
      console.log('saving mnemonic in', mnemonicFile);
      fs.writeFileSync(mnemonicFile, mnemonic.toString(), {
        mode: 0o600,
      });

      console.log('mnemonic generated, now deriving key');
      const keyMeta = execFileSync(
        HELPER,
        [
          'keys',
          'add',
          '--keyring-backend=test',
          keyName,
          '--recover',
          '--output=json',
          '--home',
          agchServerDir,
        ],
        {
          input: mnemonic,
          stdio: ['pipe', 'pipe', 'inherit'],
        },
      );
      const { address } = JSON.parse(keyMeta.toString());
      fs.writeFileSync(
        path.join(basedir, 'ag-cosmos-helper-address'),
        `${address}\n`,
      );
    }
  }

  // this marker file is how we recognize ag-solo basedirs
  fs.copyFileSync(
    path.join(dirname, '..', 'solo-README-to-install.md'),
    path.join(basedir, 'solo-README.md'),
  );

  console.log(`ag-solo initialized in ${basedir}`);
  console.log(`HTTP/WebSocket will listen on ${webhost}:${webport}`);
}
