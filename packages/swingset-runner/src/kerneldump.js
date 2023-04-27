import fs from 'fs';
import path from 'path';
import process from 'process';

import { openSwingStore } from '@agoric/swing-store';

import { dumpStore } from './dumpstore.js';
import { auditRefCounts } from './auditstore.js';
import { organizeMainStats, printMainStats } from './printStats.js';

function usage() {
  console.log(`
Command line:
  kerneldump [FLAGS...] [TARGET]

FLAGS may be:
  --raw       - dump the kernel state database as key/value pairs,
                alphabetically without annotation
  --refcounts - audit kernel promise reference counts
  --refdump   - dump reference count analysis
  --auditonly - only audit, don't dump
  --help      - print this helpful usage information
  --out PATH  - output dump to PATH ("-" indicates stdout, the default)
  --stats     - just print summary stats and exit
  --wide      - don't truncate unreadably long values

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
  const argv = process.argv.slice(2);
  let rawMode = false;
  let refCounts = false;
  let justStats = false;
  let doDump = true;
  let refDump = false;
  let wideMode = false;
  let outfile;
  while (argv[0] && argv[0].startsWith('-')) {
    const flag = argv.shift();
    switch (flag) {
      case '--raw':
        rawMode = true;
        break;
      case '--wide':
        wideMode = true;
        break;
      case '--refcounts':
      case '--refCounts':
        refCounts = true;
        break;
      case '--auditonly':
        refCounts = true;
        doDump = false;
        break;
      case '--refdump':
        refCounts = true;
        doDump = false;
        refDump = true;
        break;
      case '--stats':
        justStats = true;
        break;
      case '--help':
        usage();
        process.exit(0);
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
  const dbSuffix = '.mdb';
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
  const kernelStorage = openSwingStore(kernelStateDBDir).kernelStorage;
  if (justStats) {
    const rawStats = JSON.parse(kernelStorage.kvStore.get('kernelStats'));
    const cranks = Number(kernelStorage.kvStore.get('crankNumber'));
    printMainStats(organizeMainStats(rawStats, cranks));
  } else {
    if (doDump) {
      dumpStore(kernelStorage, outfile, rawMode, !wideMode);
    }
    if (refCounts) {
      auditRefCounts(kernelStorage.kvStore, refDump, doDump);
    }
  }
}
