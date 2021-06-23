// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';

import fs from 'fs';

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import sqlite3 from 'better-sqlite3';
import { assert, details as X, q } from '@agoric/assert';

const STREAM_START = 0;

function insistStreamName(streamName) {
  assert.typeof(streamName, 'string');
  assert(streamName.match(/^[-\w]+$/), X`invalid stream name ${q(streamName)}`);
}

function insistStreamPosition(position) {
  assert.typeof(position, 'number');
  assert(position >= 0);
  assert(Number.isSafeInteger(position));
}

function sqlStreamStore(dbDir) {
  const filePath = `${dbDir}/streams.db`; // ISSUE: no path.join?
  const db = sqlite3(filePath);
  db.exec(`
    create table if not exists streamItem (
      streamName text,
      itemCount integer,
      item text,
      primary key (streamName, itemCount)
    )
  `);

  return {
    writeStreamItem: (streamName, item, position) => {
      insistStreamName(streamName);
      insistStreamPosition(position);
      assert.typeof(item, 'string'); // ISSUE: items are strings, right?
      db.prepare(
        'insert into streamItem (streamName, item, itemCount) values (?, ?, ?)',
      ).run(streamName, item, position);
      return position + 1;
    },
    commit: () => {
      db.commit();
    },
    STREAM_START,
  };
}

test('streamStore read/write', t => {
  const dbDir = 'testdb';
  fs.mkdirSync(dbDir, { recursive: true });
  // t.teardown(() => fs.rmdirSync(dbDir, { recursive: true }));
  fs.mkdirSync(dbDir, { recursive: true });
  const streamStore = sqlStreamStore(dbDir);

  const start = streamStore.STREAM_START;
  let s1pos = start;
  s1pos = streamStore.writeStreamItem('st1', 'first', s1pos);
  s1pos = streamStore.writeStreamItem('st1', 'second', s1pos);
  t.is(s1pos, 2);
});
