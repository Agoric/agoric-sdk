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
  const realRawGet = key => {
    queries += 1;
    return sqlGet.get(key);
  };
  const realGet = key => JSON.parse(realRawGet(key));

  // fake database for testing
  const fake = {
    'vat.names': ['bootstrap'],
    'vat.name.bootstrap': 'v1',
    'vat.dynamicIDs': ['v9'],
    runQueue: [10, 10],
    'runQueue.10': { type: 'notify', vatID: 'v9', kpid: 'kp1005304' },
    'kp1005304.data.body':
      '#{"incarnationNumber":0,"name":"vatUpgraded","upgradeMessage":"vat upgraded"}',
    'kp1005304.data.slots': [],
    'kp1005304.refCount': 1,
    'kp1005304.state': 'rejected',
  };
  const fakeRawGet = key => {
    queries += 1;
    return fake[key];
  };
  // eslint-disable-next-line no-unused-vars
  const fakeGet = key => fakeRawGet(key);

  // const [get, rawGet] = [fakeGet, fakeRawGet];
  const [get, rawGet] = [realGet, realRawGet];

  const vatNames = get('vat.names');
  const staticIDs = vatNames.map(name => rawGet(`vat.name.${name}`));
  const dynamicIDs = get('vat.dynamicIDs');
  const allVatIDs = [...staticIDs, ...dynamicIDs];
  // console.log(allVatIDs);

  const sqlRange = ssDB.prepare(
    `SELECT * FROM kvStore WHERE key >= ? AND key < ?`,
  );

  // old way took 547472 queries
  // const rejectedKPIDs = new Set();

  const [head, tail] = get('runQueue');
  const notifies = new Map(); // .get(kpid) = [vatIDs..];
  for (let p = head; p < tail; p += 1) {
    const rq = get(`runQueue.${p}`);
    if (rq.type === 'notify') {
      const { vatID, kpid } = rq;
      if (!notifies.has(kpid)) {
        notifies.set(kpid, []);
      }
      notifies.get(kpid).push(vatID);
    }
  }
  console.log(`pending notifies:`, notifies);

  const rejectedKPIDs = new Set();
  const nonRejectedKPIDs = new Set();

  const isRejected = kpid => {
    if (nonRejectedKPIDs.has(kpid)) {
      return false;
    }
    if (rejectedKPIDs.has(kpid)) {
      return true;
    }
    const state = rawGet(`${kpid}.state`);
    // missing state means the kpid is deleted somehow, shouldn't happen
    assert(state, `${kpid}.state is missing`);
    if (state === 'rejected') {
      rejectedKPIDs.add(kpid);
      return true;
    }
    nonRejectedKPIDs.add(kpid);
    return false;
  };

  // Bug 9039 causes the kernel to reject/disconnect a promise on
  // behalf of the upgraded vat, but not remove it from the vat's
  // c-list (which would normally happen when the vat emitted a
  // syscall.resolve). The rejection process erases the `.decider`
  // record, so we no longer know which vat to look at. We're looking
  // for vpids which are 1: rejected, 2: present in a vat c-list, 3:
  // do *not* have a notify scheduled.

  const buggyKPIDs = []; // tuples of [kpid, vatID]
  const involvedVats = {};

  for (const vatID of allVatIDs) {
    // TODO: skip vats in vats.terminated, belt-and-suspenders
    const prefix = `${vatID}.c.`;
    const len = prefix.length;
    const k1 = `${prefix}kp`;
    const k2 = `${prefix}kq`;
    for (const row of sqlRange.iterate(k1, k2)) {
      // the kvStore's actual API (getNextKey) requires one query per result
      queries += 1;
      const kpid = row.key.slice(len);
      if (!isRejected(kpid)) {
        continue;
      }
      const n = notifies.get(kpid);
      if (!n || !n.includes(vatID)) {
        // there is no pending notify
        buggyKPIDs.push([kpid, vatID]);
        involvedVats[vatID] = 1 + (involvedVats[vatID] || 0);
      }
    }
  }

  // console.log(buggyKPIDs);
  console.log(`scan 9039: ${buggyKPIDs.length} kpid/vatID pairs to clean up`);
  console.log(`first is:`, buggyKPIDs[0]);
  console.log(
    `${Reflect.ownKeys(involvedVats).length} vats involved:`,
    involvedVats,
  );
  console.log(`${queries} DB queries`);
};

main(process.argv);
