#!/usr/bin/env node
// @ts-nocheck

// Given a swingstore database, produce a list of vpid/vatID pairs for
// all promises that are resolved but still in the c-list of their
// formerly-deciding vat. This happens when a vat is upgraded and the
// kernel disconnects (rejects) the previous incarnation's outstanding
// promises (https://github.com/Agoric/agoric-sdk/issues/9039).

import process from 'process';
import fs from 'fs';
import sqlite3 from 'better-sqlite3';
import yargsParser from 'yargs-parser';
import '@endo/init/debug.js';

const main = rawArgv => {
  const { _: args, ...options } = yargsParser(rawArgv.slice(2));
  // console.log(args, options);
  if (Reflect.ownKeys(options).length > 0 || args.length !== 1) {
    const q = str => `'${str.replaceAll("'", String.raw`'\''`)}'`;
    console.error(
      [
        `Usage: ${rawArgv[1]} /path/to/swingstore.sqlite`,
        'Find leftover promises for bug #9039.',
      ].join('\n'),
    );
    process.exitCode = 1;
    return;
  }

  const [ssDBPath] = args;
  if (!fs.existsSync(ssDBPath)) {
    throw Error(`swingstore DB path (${ssDBPath}) must exist`);
  }
  const ssDB = sqlite3(/** @type {string} */ (ssDBPath));
  let queries = 0;

  const sqlGet = ssDB.prepare('SELECT value FROM kvStore WHERE key=?').pluck();
  const realRawGet = key => { queries += 1; return sqlGet.get(key) };
  const realGet = key => JSON.parse(realRawGet(key));

  // fake database for testing
  const fake = {
    runQueue: [10, 11],
    'runQueue.10': { type: 'notify', vatID: 'v1', kpid: 'kp95588' },
  };
  const fakeRawGet = key => { queries += 1; return fake[key] };
  const fakeGet = key => fakeRawGet(key);

  const [get, rawGet] = [realGet, realRawGet];

  const vatNames = get('vat.names');
  const staticIDs = vatNames.map(name => rawGet(`vat.name.${name}`));
  const dynamicIDs = get('vat.dynamicIDs');
  const allVatIDs = [...staticIDs, ...dynamicIDs];
  // console.log(allVatIDs);

  queries += 1; // larger than most
  const sqlListKPIDs = ssDB.prepare(`SELECT * FROM kvStore WHERE key >= 'kp' AND key < 'kq'`);
  const rejectedKPIDs = new Set();
  for (const row of sqlListKPIDs.iterate()) {
    if (row.key.endsWith('.state') && row.value == 'rejected') {
      const kpid = row.key.split('.')[0];
      rejectedKPIDs.add(kpid);
    }
  }
  console.log(`${rejectedKPIDs.size} rejected kpids`);
  // console.log(rejectedKPIDs);

  const [head, tail] = get('runQueue');
  const notifies = new Map(); // .get(kpid) = [vatIDs..];
  for (let p = head; p < tail; p += 1) {
    const rq = get(`runQueue.${p}`);
    if (rq.type === 'notify') {
      const { vatID, kpid } = rq;
      if (!rejectedKPIDs.has(kpid)) {
        continue;
      }
      if (!notifies.has(kpid)) {
        notifies.set(kpid, []);
      }
      notifies.get(kpid).push(vatID);
    }
  }
  console.log(`pending notifies:`, notifies);

  // Bug 9039 causes the kernel to reject/disconnect a promise on
  // behalf of the upgraded vat, but not remove it from the vat's
  // c-list (which would normally happen when the vat emitted a
  // syscall.resolve). The rejection process erases the `.decider`
  // record, so we no longer know which vat to look at. We're looking
  // for vpids which are 1: rejected, 2: present in a vat c-list, 3:
  // do *not* have a notify scheduled.

  const buggyKPIDs = []; // tuples of [kpid, vatID]
  const involvedVats = {};

  // for (const kpid of [...rejectedKPIDs].slice(0, 2000)) {
  for (const kpid of rejectedKPIDs) {
    for (const vatID of allVatIDs) {
      const ck = `${vatID}.c.${kpid}`;
      if (rawGet(ck)) {
        // in c-list
        const n = notifies.get(kpid);
        if (!n || !n.includes(vatID)) {
          // and there is no pending notify
          buggyKPIDs.push([kpid, vatID]);
          involvedVats[vatID] = 1 + (involvedVats[vatID] || 0);
        }
      }
    }
  }
  // console.log(buggyKPIDs);
  console.log(`scan 9039: ${buggyKPIDs.length} kpid/vatID pairs to clean up`);
  console.log(`${Reflect.ownKeys(involvedVats).length} vats involved:`, involvedVats);
  console.log(`${queries} DB queries`);
  
};

main(process.argv);
