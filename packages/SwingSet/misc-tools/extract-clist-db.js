#!/usr/bin/env node
// @ts-nocheck
/* eslint no-labels: "off", no-extra-label: "off", no-underscore-dangle: "off" */
import process from 'process';
import fs from 'fs';
import sqlite3 from 'better-sqlite3';
import yargsParser from 'yargs-parser';
import '@endo/init/debug.js';

const main = rawArgv => {
  const { _: args, ...options } = yargsParser(rawArgv.slice(2));
  console.log(args, options);
  if (Reflect.ownKeys(options).length > 0 || args.length !== 2) {
    const q = str => `'${str.replaceAll("'", String.raw`'\''`)}'`;
    console.error(
      [
        `Usage: ${rawArgv[1]} /path/to/swingstore.sqlite clist.sqlite`,
        'Extracts c-list entries to a new DB.',
        'note: clist.sqlite must not already exist',
      ].join('\n'),
    );
    process.exitCode = 1;
    return;
  }

  const [ssDBPath, clDBPath] = args;
  if (fs.existsSync(clDBPath)) {
    throw Error(`c-list DB path (${clDBPath}) must not already exist`);
  }
  const ssDB = sqlite3(/** @type {string} */ (ssDBPath));
  const clDB = sqlite3(/** @type {string} */ (clDBPath));

  clDB.exec(`CREATE TABLE clist (
vatID STRING,
kref STRING,
vref STRING,
exported BOOL,
durability BOOL, -- NULL for imports, (1: ephemeral, 2: virtual, 3: durable)
reachable BOOL,
recognizable BOOL
)`);
  clDB.exec(`CREATE INDEX clist_kref ON clist (kref)`);
  clDB.exec(`CREATE INDEX clist_vref ON clist (vref)`);

  const addClist = clDB.prepare(`INSERT INTO clist
(vatID, kref, vref, exported, durability, reachable, recognizable)
VALUES (?, ?, ?, ?, ?, ?, ?)
`);
  clDB.prepare('BEGIN IMMEDIATE TRANSACTION').run();

  const getKVs = ssDB.prepare(`SELECT key,value from kvStore`);
  for (const row of getKVs.iterate()) {
    const { key, value } = row;
    // see ../docs/c-lists.md
    const matches = /^(v\d+)\.c\.(ko.*)$/.exec(key);
    if (matches) {
      const [_, vatID, kref] = matches;
      // v9.c.ko123 -> R o+456
      // v9.c.ko123 -> _ o+456
      const rc = value[0];
      const vref = value.slice(2);
      const recognizable = 1;
      let reachable = 0;
      if (rc === 'R') {
        reachable = 1;
      } else if (rc !== '_') {
        throw Error(`key '${key}', value '${value}', bad refcount '${rc}'`);
      }
      let exported = vref[1] === '+' ? 1 : 0;
      let durability = exported ? 1 : null;
      if (exported) {
        if (vref[2] === 'd') {
          durability = 3;
        } else if (vref[2] === 'v') {
          durability = 2;
        }
      }
      addClist.run(
        vatID,
        kref,
        vref,
        exported,
        durability,
        reachable,
        recognizable,
      );
      // console.log(vatID, kref, vref, exported, durability, reachable, recognizable);
    }
  }
  clDB.prepare('COMMIT').run();
};

// run-18 took 1m42s (68GB, 17M kvStore entries) to produce 1.2M rows (37MB)

main(process.argv);
