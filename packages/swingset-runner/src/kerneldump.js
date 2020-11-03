import fs from 'fs';
import path from 'path';
import process from 'process';

import { openSwingStore as openLMDBSwingStore } from '@agoric/swing-store-lmdb';
import { openSwingStore as openSimpleSwingStore } from '@agoric/swing-store-simple';

import { dumpStore } from './dumpstore';
import { auditRefCounts } from './auditstore';
import { organizeMainStats, printMainStats } from './printStats';

function usage() {
  console.log(`
Command line:
  kerneldump [FLAGS...] [TARGET]

FLAGS may be:
  --raw       - dump the kernel state database as key/value pairs,
                alphabetically without annotation
  --lmdb      - read an LMDB state database (default)
  --refcounts - audit kernel promise reference counts
  --auditonly - only audit, don't dump
  --filedb    - read a simple file-based (aka .jsonlines) data store
  --help      - print this helpful usage information
  --out PATH  - output dump to PATH ("-" indicates stdout, the default)
  --stats     - just print summary stats and exit

TARGET is one of: the base directory where a swingset's vats live, a swingset
data store directory, or the path to a swingset database file.  If omitted, it
defaults to the current working directory.
`);
}

function fail(message, printUsage) {
  console.log(message);
  if (printUsage) {
    usage();
  }
  process.exit(1);
}

function dirContains(dirpath, suffix) {
  try {
    const files = fs.readdirSync(dirpath);
    for (const file of files) {
      if (file.endsWith(suffix)) {
        return true;
      }
    }
    return false;
  } catch (e) {
    return false;
  }
}

export function main() {
  const argv = process.argv.splice(2);
  let rawMode = false;
  let refCounts = false;
  let justStats = false;
  let doDump = true;
  let dbMode = '--lmdb';
  let dbSuffix = '.mdb';
  let outfile;
  while (argv[0] && argv[0].startsWith('-')) {
    const flag = argv.shift();
    switch (flag) {
      case '--raw':
        rawMode = true;
        break;
      case '--refcounts':
      case '--refCounts':
        refCounts = true;
        break;
      case '--auditonly':
        doDump = false;
        break;
      case '--stats':
        justStats = true;
        break;
      case '--help':
        usage();
        process.exit(0);
        break;
      case '--filedb':
        dbMode = '--filedb';
        dbSuffix = '.jsonlines';
        break;
      case '--lmdb':
        dbMode = '--lmdb';
        dbSuffix = '.mdb';
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

  const target = argv.shift();
  let kernelStateDBDir;
  if (target.endsWith(dbSuffix)) {
    kernelStateDBDir = path.dirname(target);
  } else if (dirContains(target, dbSuffix)) {
    kernelStateDBDir = target;
  } else {
    kernelStateDBDir = path.join(target, 'swingset-kernel-state');
    if (!dirContains(kernelStateDBDir, dbSuffix)) {
      kernelStateDBDir = null;
    }
  }
  if (!kernelStateDBDir) {
    fail(`can't find a database at ${target}`, false);
  }
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
  if (justStats) {
    const rawStats = JSON.parse(store.storage.get('kernelStats'));
    const cranks = Number(store.storage.get('crankNumber'));
    printMainStats(organizeMainStats(rawStats, cranks));
  } else {
    if (doDump) {
      dumpStore(store.storage, outfile, rawMode);
    }
    if (refCounts) {
      auditRefCounts(store.storage);
    }
  }
}
