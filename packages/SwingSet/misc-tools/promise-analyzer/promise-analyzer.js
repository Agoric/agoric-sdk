import process from 'process';
import sqlite3 from 'better-sqlite3';

function getVatNames(db) {
  const rows = db
    .prepare(`SELECT key, value FROM KVStore where key like 'v%.options'`)
    .all();
  const vatNames = new Map();
  for (const row of rows) {
    const [vatId, _] = row.key.split('.');
    let vatName = JSON.parse(row.value).name;
    if (vatName.startsWith('zcf-b')) {
      vatName = vatName.slice(13);
    }
    vatNames.set(vatId, vatName);
  }

  return vatNames;
}

function keyValueToPromiseObjectArray(db) {
  const rows = db
    .prepare(`SELECT key, value FROM KVStore where key like 'kp_%.%'`)
    .all();

  const vatNames = getVatNames(db);
  const promises = new Map();
  for (const row of rows) {
    const [promiseKey, column] = row.key.split('.');
    const promise = promises.get(promiseKey) || {};
    promise[column] = row.value;
    promises.set(promiseKey, promise);
  }
  console.log('source,target,value');
  for (const [_key, value] of promises) {
    if (value.state === 'unresolved') {
      for (const subscriber of value.subscribers.split(',')) {
        console.log(
          `${vatNames.get(value.decider)},${vatNames.get(subscriber)},1`,
        );
      }
    }
  }
  return promises;
}

function main() {
  if (process.argv.length !== 3) {
    console.error('usage: node promise-analyzer.js DBPATH');
    process.exit(1);
  }
  const argv = process.argv.slice(2);
  const dbPath = argv[0];

  const db = sqlite3(dbPath);
  const promises = keyValueToPromiseObjectArray(db);
  // console.log(promises);
  console.log(promises.size);
}

main();
