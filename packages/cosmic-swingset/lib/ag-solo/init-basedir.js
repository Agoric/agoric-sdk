import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

import anylogger from 'anylogger';

const log = anylogger('ag-solo:init');

const DEFAULT_WALLET = '@agoric/dapp-svelte-wallet';

export default function initBasedir(
  basedir,
  webport,
  webhost,
  subdir,
  egresses,
  opts = {},
) {
  const { wallet = DEFAULT_WALLET, ...options } = opts;
  options.wallet = wallet;

  const here = __dirname;
  try {
    fs.mkdirSync(basedir, 0o700);
  } catch (e) {
    if (!fs.existsSync(path.join(basedir, 'ag-cosmos-helper-address'))) {
      log.error(
        `unable to create basedir ${basedir}, it must not already exist`,
      );
      throw e;
    }
  }

  const connections = [{ type: 'http', port: webport, host: webhost }];
  fs.writeFileSync(
    path.join(basedir, 'connections.json'),
    `${JSON.stringify(connections)}\n`,
  );
  const srcHtmldir = path.join(here, 'html');
  const dstHtmldir = path.join(basedir, 'html');
  fs.mkdirSync(dstHtmldir);
  fs.readdirSync(srcHtmldir)
    .filter(name => name.match(/^[^.]/))
    .forEach(name => {
      fs.copyFileSync(path.join(srcHtmldir, name), path.join(dstHtmldir, name));
    });

  // Save the configuration options.
  fs.writeFileSync(path.join(basedir, 'options.json'), JSON.stringify(options));

  // Save our version codes.
  const pj = 'package.json';
  fs.copyFileSync(path.join(`${here}/../..`, pj), path.join(dstHtmldir, pj));
  const gr = 'git-revision.txt';
  try {
    fs.copyFileSync(path.join(`${here}/..`, gr), path.join(dstHtmldir, gr));
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

  const srcVatdir = subdir
    ? path.join(here, 'vats', subdir)
    : path.join(here, 'vats');
  const dstVatdir = path.join(basedir, 'vats');
  fs.mkdirSync(dstVatdir);
  fs.readdirSync(srcVatdir)
    .filter(name => name.match(/\.(js|json)$/))
    .forEach(name => {
      fs.copyFileSync(path.join(srcVatdir, name), path.join(dstVatdir, name));
    });

  // Enable our node_modules to be found.
  let dots = '';
  let nm = path.resolve(here, dots, 'node_modules');
  while (
    !nm.startsWith('/node_modules/') &&
    !fs.existsSync(path.join(nm, '@agoric'))
  ) {
    dots += '../';
    nm = path.resolve(here, dots, 'node_modules');
  }
  fs.symlinkSync(nm, path.join(basedir, 'node_modules'));

  // cosmos-sdk keypair
  if (egresses.includes('cosmos')) {
    const agchServerDir = path.join(basedir, 'ag-cosmos-helper-statedir');
    if (!fs.existsSync(agchServerDir)) {
      fs.mkdirSync(agchServerDir);
      // we assume 'ag-cosmos-helper' is on $PATH for now, see chain-cosmos-sdk.js
      const keyName = 'ag-solo';
      // we suppress stderr because it displays the mnemonic phrase, but
      // unfortunately that means errors are harder to diagnose
      execFileSync(
        'ag-cosmos-helper',
        [
          'keys',
          'add',
          '--keyring-backend=test',
          keyName,
          '--home',
          agchServerDir,
        ],
        {
          input: Buffer.from(''),
          stdio: ['pipe', 'ignore', 'ignore'],
        },
      );
      log('key generated, now extracting address');
      const kout = execFileSync(
        'ag-cosmos-helper',
        [
          'keys',
          'show',
          '--keyring-backend=test',
          keyName,
          '--address',
          '--home',
          agchServerDir,
        ],
        {
          input: Buffer.from(''),
          stdio: ['pipe', 'pipe', 'inherit'],
        },
      );
      fs.writeFileSync(
        path.join(basedir, 'ag-cosmos-helper-address'),
        kout.toString(),
      );
    }
  }

  // this marker file is how we recognize ag-solo basedirs
  fs.copyFileSync(
    path.join(here, 'solo-README-to-install.md'),
    path.join(basedir, 'solo-README.md'),
  );

  log(`ag-solo initialized in ${basedir}`);
  log(`HTTP/WebSocket will listen on ${webhost}:${webport}`);
}
