import path from 'path';
import process from 'process';

import { openSwingStore as openLMDBSwingStore } from '@agoric/swing-store-lmdb';
import { openSwingStore as openSimpleSwingStore } from '@agoric/swing-store-simple';

import { dumpStore } from './dumpstore';

function usage() {
  console.log(`
Command line:
  kerneldump [FLAGS...] [BASEDIR]

FLAGS may be:
  --raw       - just dump the kernel state database as key/value pairs alphabetically without annotation
  --lmdb      - read an LMDB state database (default)
  --filedb    - read a simple file-based (aka .jsonlines) data store
  --help      - print this helpful usage information
  --out PATH  - output dump to PATH ("-" indicates stdout, the default)

BASEDIR is the base directory where a swingset's vats live
  If BASEDIR is omitted it defaults to the current working directory.
`);
}

function fail(message, printUsage) {
  console.log(message);
  if (printUsage) {
    usage();
  }
  process.exit(1);
}

export function main() {
  const argv = process.argv.splice(2);
  let rawMode = false;
  let dbMode = '--lmdb';
  let outfile;
  while (argv[0] && argv[0].startsWith('-')) {
    const flag = argv.shift();
    switch (flag) {
      case '--raw':
        rawMode = true;
        break;
      case '--help':
        usage();
        process.exit(0);
        break;
      case '--filedb':
      case '--lmdb':
        dbMode = flag;
        break;
      case '-o':
      case '--out':
        outfile = argv.shift();
        if (outfile === '-') {
          outfile = undefined;
        }
        break;
      default:
        fail(`invalid flag ${flag}`, true);
        break;
    }
  }

  const basedir = argv.shift();
  const kernelStateDBDir = path.join(basedir, 'swingset-kernel-state');
  let store;
  switch (dbMode) {
    case '--filedb':
      store = openSimpleSwingStore(kernelStateDBDir);
      break;
    case '--lmdb':
      store = openLMDBSwingStore(kernelStateDBDir);
      break;
    default:
      fail(`invalid database mode ${dbMode}`, true);
  }
  dumpStore(store.storage, outfile, rawMode);
}
