import process from 'process';
import sqlite3 from 'better-sqlite3';
import '@endo/init/debug.js';
import { checkBaggage } from '../tools/baggage-check.js';

function main() {
  if (process.argv.length !== 4) {
    console.error('usage: node baggage-check-tool.js VATID DBPATH');
    process.exit(1);
  }
  const argv = process.argv.slice(2);
  const vatID = argv[0];
  const dbPath = argv[1];

  const db = sqlite3(dbPath);
  checkBaggage(db, vatID, true);
}

main();
