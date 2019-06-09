import { insist } from './insist';

// Start a network service
import fs from 'fs';
import path from 'path';
import initBasedir from './init-basedir';
import setGCIIngress from './set-gci-ingress';
import start from './start';
import parseArgs from 'minimist';
import process from 'process';

process.on('SIGINT', () => process.exit(99));

const AG_SOLO_BASEDIR = process.env.AG_SOLO_BASEDIR && path.resolve(process.env.AG_SOLO_BASEDIR);

function insistIsBasedir() {
  if (AG_SOLO_BASEDIR) {
    process.chdir(AG_SOLO_BASEDIR);
  }
  const basedir = fs.realpathSync('.');
  try {
    fs.statSync(path.join(basedir, 'solo-README.md'));
  } catch(e) {
    console.log(`Directory ${basedir} doesn't appear to be a ag-solo base directory`);
  }
  return basedir;
}

export default async function solo(progname, rawArgv) {
  console.log('solo', rawArgv);
  const {_: argv, ...opts} = parseArgs(rawArgv, {boolean: ['help', 'version'], default: {
    webport: '8000',
  }});

  if (opts.help) {
    process.stdout.write(`\
Usage: ${rawArgv[0]} COMMAND [OPTIONS...]

init
set-gci-ingress
start
`)
  }

  if (argv[0] === 'init') {
    let webport = Number(opts.webport);
    const basedir = argv[1] || AG_SOLO_BASEDIR;
    insist(basedir !== undefined, 'you must provide a BASEDIR');
    initBasedir(basedir, webport);
    console.log(`Run '${progname} start' to start the vat machine`);
  }

  else if (argv[0] === 'set-gci-ingress') {
    const basedir = insistIsBasedir();
    const GCI = argv[1];
    const chainID = opts.chainID || 'agoric';
    const rpcAddresses = argv.slice(2);
    setGCIIngress(basedir, GCI, rpcAddresses, chainID);
  }

  else if (argv[0] === 'start') {
    const basedir = insistIsBasedir();
    const withSES = true;
    start(basedir, withSES);
  }

  else {
    console.log(`unrecognized command ${argv[0]}`);
    console.log(`try one of: init, set-gci-ingress, start`);
  }

}
