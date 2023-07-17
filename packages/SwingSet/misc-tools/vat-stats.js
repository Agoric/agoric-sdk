// @ts-nocheck
/* eslint-disable */
import '@endo/init';
import process from 'process';
import { openSwingStore } from '@agoric/swing-store';

const log = console.log;

const out = process.stdout;
function p(str) {
  out.write(str);
  out.write('\n');
}

function usage() {
  log(`
Command line:
  db-get-key.js [FLAGS] STATEDIR KEY

FLAGS may be:
  --raw   - just output the value(s) without adornment or key info
  --range - output values for all keys starting with \`\${KEY}.\`
`);
}

function fail(message, printUsage) {
  if (message) {
    log(message);
  }
  if (printUsage) {
    usage();
  }
  process.exit(1);
}

function run() {
  const argv = process.argv.slice(2);
  const stateDBDir = argv.shift();
  const { kvStore: kv } = openSwingStore(stateDBDir).kernelStorage;
  const vatIDs = [];
  const vats = {};
  for (const name of JSON.parse(kv.get('vat.names'))) {
    console.log(`yes`, name);
    const vatID = kv.get(`vat.name.${name}`);
    vatIDs.push(vatID);
    vats[vatID] = { name, stats: JSON.parse(kv.get(`${vatID}.stats`)) };
  }
  for (const vatID of JSON.parse(kv.get('vat.dynamicIDs'))) {
    vatIDs.push(vatID);
    vats[vatID] = { stats: JSON.parse(kv.get(`${vatID}.stats`)) };
  }

  if (1) {
    for (const vatID of vatIDs) {
      console.log(vatID);
      continue;
      const k = `${vatID}.c.ko170`;
      const v = kv.get(k);
      if (v) {
        console.log(`${k} : ${v}`);
      }
    }
  }

  if (0) {
    for (const vatID of vatIDs) {
      const { import: i, export: e } = vats[vatID].stats.objects;
      function pstat(x) {
        return `${x.reachable.value}/${x.recognizable.value}`;
      }
      console.log(vatID, `import: ${pstat(i)}  export: ${pstat(e)}`);
    }
  }
}

run();
