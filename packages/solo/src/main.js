import fs from 'fs';
import path from 'path';
import parseArgs from 'minimist';
import process from 'process';
import { spawnSync } from 'child_process';
import { assert } from '@endo/errors';

import anylogger from 'anylogger';

// Start a network service
import addChain from './add-chain.js';
import initBasedir from './init-basedir.js';
import resetState from './reset-state.js';
import setGCIIngress from './set-gci-ingress.js';
import start from './start.js';

const log = anylogger('ag-solo');

// As we add more egress types, put the default types in a comma-separated
// string below.
const DEFAULT_EGRESSES = 'cosmos';

const AG_SOLO_BASEDIR =
  process.env.AG_SOLO_BASEDIR && path.resolve(process.env.AG_SOLO_BASEDIR);

function insistIsBasedir() {
  if (AG_SOLO_BASEDIR) {
    process.chdir(AG_SOLO_BASEDIR);
  }
  const basedir = fs.realpathSync('.');
  try {
    fs.statSync(path.join(basedir, 'solo-README.md'));
  } catch (e) {
    // eslint-disable-next-line no-throw-literal
    throw `${basedir} doesn't appear to be an ag-solo base directory`;
  }
  return basedir;
}

export default async function solo(progname, rawArgv) {
  log.debug('solo', rawArgv);
  const { _: argv, ...opts } = parseArgs(rawArgv, {
    stopEarly: true,
    boolean: ['help', 'version'],
  });

  if (opts.help) {
    process.stdout.write(`\
Usage: ${progname} COMMAND [OPTIONS...]

init
set-gci-ingress
start
`);
  }

  await null;
  switch (argv[0]) {
    case 'setup': {
      const { netconfig } = parseArgs(argv.slice(1));
      if (!AG_SOLO_BASEDIR) {
        console.error(`setup: you must set $AG_SOLO_BASEDIR`);
        return 1;
      }
      if (!fs.existsSync(AG_SOLO_BASEDIR)) {
        await solo(progname, ['init', AG_SOLO_BASEDIR, ...argv.slice(1)]);
      }
      process.chdir(AG_SOLO_BASEDIR);
      await solo(progname, ['add-chain', netconfig]);
      await solo(progname, ['start']);
      break;
    }
    case 'init': {
      const { _: subArgs, ...subOpts } = parseArgs(argv.slice(1), {
        default: {
          webport: '8000',
          webhost: '127.0.0.1',
          egresses: DEFAULT_EGRESSES,
          defaultManagerType: process.env.SWINGSET_WORKER_TYPE || 'xs-worker',
        },
      });
      const webport = Number(subOpts.webport);
      const { webhost, egresses } = subOpts;
      const basedir = subArgs[0] || AG_SOLO_BASEDIR;
      const subdir = subArgs[1];
      assert(basedir !== undefined, 'you must provide a BASEDIR');
      initBasedir(
        basedir,
        webport,
        webhost,
        subdir,
        egresses.split(','),
        subOpts,
      );
      await resetState(basedir);

      // TODO: We may want to give some instructions.  This is probably not the
      // right place to determine our context.
      // log.error(
      //   `Run '(cd ${basedir} && ${progname} start)' to start the vat machine`,
      // );
      break;
    }
    case 'add-chain': {
      const basedir = insistIsBasedir();
      const { _: subArgs, ...subOpts } = parseArgs(argv.slice(1), {
        boolean: ['reset'],
      });
      const [chainConfig] = subArgs;
      await addChain(basedir, chainConfig, subOpts.reset);
      break;
    }
    case 'set-gci-ingress': {
      const basedir = insistIsBasedir();
      const { _: subArgs, ...subOpts } = parseArgs(argv.slice(1), {});
      const GCI = subArgs[0];
      const chainID = subOpts.chainID || 'agoric';
      const rpcAddresses = subArgs.slice(1);
      setGCIIngress(basedir, GCI, rpcAddresses, chainID);
      break;
    }
    case 'start': {
      const basedir = insistIsBasedir();
      await start(basedir, {
        ROLE: 'client',
      });
      break;
    }
    case 'reset-state': {
      const basedir = insistIsBasedir();
      await resetState(basedir);
      break;
    }
    case 'calc-gci':
    case 'calc-rpcport': {
      const filename = new URL(import.meta.url).pathname;
      const dirname = path.dirname(filename);
      const cp = spawnSync(`${dirname}/../../${argv[0]}.js`, argv.slice(1), {
        stdio: 'inherit',
      });
      return cp.status;
    }
    default: {
      log.error(`unrecognized command ${argv[0]}`);
      log.error(`try one of: init, set-gci-ingress, start`);
      return 1;
    }
  }
  return 0;
}
