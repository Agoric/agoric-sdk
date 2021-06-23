// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';

import fs from 'fs';

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import sqlite3 from 'better-sqlite3';
import { assert, details as X, q } from '@agoric/assert';

const STREAM_START = { itemCount: 0 };

/** @param { unknown } streamName */
function insistStreamName(streamName) {
  assert.typeof(streamName, 'string');
  assert(streamName.match(/^[-\w]+$/), X`invalid stream name ${q(streamName)}`);
}

/**
 * @param {unknown} position
 * @returns { asserts position is StreamPosition }
 * @typedef {{ itemCount: number }} StreamPosition
 */
function insistStreamPosition(position) {
  assert.typeof(position, 'object');
  assert.typeof(position.itemCount, 'number');
  assert(position.itemCount >= 0);
  return undefined;
}

/**
 * @param {string} dbDir
 */
function sqlStreamStore(dbDir) {
  const filePath = `${dbDir}/streams.db`; // ISSUE: no path.join?
  const db = sqlite3(
    filePath,
    // { verbose: console.log }
  );
  db.exec(`
    create table if not exists streamItem (
      streamName text,
      position integer,
      item text,
      primary key (streamName, position)
    )
  `);

  /**
   * @param {string} streamName
   * @param {StreamPosition} startPosition
   * @param {StreamPosition} endPosition
   */
  function readStream(streamName, startPosition, endPosition) {
    insistStreamName(streamName);
    // TODO: enforce exclusive access? DB transactions are isolated.
    // assert(
    //   !streamStatus.get(streamName),
    //   X`can't read stream ${q(streamName)} because it's already in use`,
    // );
    insistStreamPosition(startPosition);
    insistStreamPosition(endPosition);
    assert(
      startPosition <= endPosition,
      X`${q(startPosition.itemCount)} <= ${q(endPosition.itemCount)}}`,
    );

    function* reader() {
      const query = db.prepare(`
        select item
        from streamItem
        where streamName = ? and position >= ? and position < ?
        order by position
      `);
      for (const { item } of query.iterate(
        streamName,
        startPosition.itemCount,
        endPosition.itemCount,
      )) {
        yield item;
      }
    }

    return reader();
  }

  return {
    /**
     * @param {string} streamName
     * @param {string} item
     * @param {StreamPosition} position
     */
    writeStreamItem: (streamName, item, position) => {
      insistStreamName(streamName);
      insistStreamPosition(position);
      assert.typeof(item, 'string'); // ISSUE: items are strings, right?
      db.prepare(
        `
        insert into streamItem (streamName, item, position)
          values (?, ?, ?)
          on conflict(streamName, position) do update set item = ?
        `,
      ).run(streamName, item, position.itemCount, item);
      return { itemCount: position.itemCount + 1 };
    },
    readStream,
    /** @param { string } streamName */
    closeStream: streamName => {
      insistStreamName(streamName);
      // ISSUE: auto-commit by default
    },
    commit: () => {
      // ISSUE: auto-commit by default
    },
    STREAM_START,
  };
}

test('streamStore read/write', t => {
  const dbDir = 'testdb';
  fs.mkdirSync(dbDir, { recursive: true });
  t.teardown(() => fs.rmdirSync(dbDir, { recursive: true }));
  fs.mkdirSync(dbDir, { recursive: true });
  const streamStore = sqlStreamStore(dbDir);

  const start = streamStore.STREAM_START;
  let s1pos = start;
  s1pos = streamStore.writeStreamItem('st1', 'first', s1pos);
  s1pos = streamStore.writeStreamItem('st1', 'second', s1pos);
  const s1posAlt = { ...s1pos };
  s1pos = streamStore.writeStreamItem('st1', 'third', s1pos);
  let s2pos = streamStore.STREAM_START;
  s2pos = streamStore.writeStreamItem('st2', 'oneth', s2pos);
  s1pos = streamStore.writeStreamItem('st1', 'fourth', s1pos);
  s2pos = streamStore.writeStreamItem('st2', 'twoth', s2pos);
  const s2posAlt = { ...s2pos };
  s2pos = streamStore.writeStreamItem('st2', 'threeth', s2pos);
  s2pos = streamStore.writeStreamItem('st2', 'fourst', s2pos);
  streamStore.closeStream('st1');
  streamStore.closeStream('st2');
  const reader1 = streamStore.readStream('st1', start, s1pos);
  t.deepEqual(Array.from(reader1), ['first', 'second', 'third', 'fourth']);
  s2pos = streamStore.writeStreamItem('st2', 're3', s2posAlt);
  streamStore.closeStream('st2');
  const reader2 = streamStore.readStream('st2', start, s2pos);
  t.deepEqual(Array.from(reader2), ['oneth', 'twoth', 're3']);

  const reader1alt = streamStore.readStream('st1', s1posAlt, s1pos);
  t.deepEqual(Array.from(reader1alt), ['third', 'fourth']);

  const emptyPos = streamStore.writeStreamItem('empty', 'filler', start);
  streamStore.closeStream('empty');
  const readerEmpty = streamStore.readStream('empty', emptyPos, emptyPos);
  t.deepEqual(Array.from(readerEmpty), []);
  const readerEmpty2 = streamStore.readStream('empty', start, start);
  t.deepEqual(Array.from(readerEmpty2), []);
});
