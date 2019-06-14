import fs from 'fs';
import path from 'path';
import parseArgs from 'minimist';
import process from 'process';
import { insist } from './insist';

// Start a network service
import initBasedir from './init-basedir';
import setGCIIngress from './set-gci-ingress';
import start from './start';

process.on('SIGINT', () => process.exit(99));

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
    console.log(
      `Directory ${basedir} doesn't appear to be a ag-solo base directory`,
    );
  }
  return basedir;
}

export default async function solo(progname, rawArgv) {
  console.log('solo', rawArgv);
  const { _: argv, ...opts } = parseArgs(rawArgv, {
    stopEarly: true,
    boolean: ['help', 'version'],
  });

  if (opts.help) {
    process.stdout.write(`\
Usage: ${rawArgv[0]} COMMAND [OPTIONS...]

init
set-gci-ingress
start
`);
  }

  if (argv[0] === 'init') {
    const { _: subArgs, ...subOpts } = parseArgs(argv.slice(1), {
      default: {
        webport: '8000',
        webhost: '127.0.0.1',
      },
    });
    const webport = Number(subOpts.webport);
    const { webhost } = subOpts;
    const basedir = subArgs[0] || AG_SOLO_BASEDIR;
    const subdir = subArgs[1];
    insist(basedir !== undefined, 'you must provide a BASEDIR');
    initBasedir(basedir, webport, webhost, subdir);
    console.log(`Run '${progname} start' to start the vat machine`);
  } else if (argv[0] === 'set-gci-ingress') {
    const basedir = insistIsBasedir();
    const { _: subArgs, ...subOpts } = parseArgs(argv.slice(1), {});
    const GCI = subArgs[0];
    const chainID = subOpts.chainID || 'agoric';
    const rpcAddresses = subArgs.slice(1);
    setGCIIngress(basedir, GCI, rpcAddresses, chainID);
  } else if (argv[0] === 'start') {
    const basedir = insistIsBasedir();
    const withSES = true;
    start(basedir, withSES, argv.slice(1));
  } else {
    console.log(`unrecognized command ${argv[0]}`);
    console.log(`try one of: init, set-gci-ingress, start`);
  }
}
