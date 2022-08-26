// @ts-check
import path from 'path';
import sqlite3ambient from 'better-sqlite3';
import { assert, details as X, q } from '@agoric/assert';

const STREAM_START = { itemCount: 0 };
/**
 * @typedef { import('./swingStore').StreamPosition } StreamPosition
 */

function* empty() {
  // Yield nothing
}

/**
 * @param {unknown} streamName
 * @returns {asserts streamName is string}
 */

function insistStreamName(streamName) {
  assert.typeof(streamName, 'string');
  assert(streamName.match(/^[-\w]+$/), X`invalid stream name ${q(streamName)}`);
}

/**
 * @param {unknown} position
 * @returns {asserts position is StreamPosition}
 */

function insistStreamPosition(position) {
  assert.typeof(position, 'object');
  assert(position);
  assert.typeof(position.itemCount, 'number');
  assert(position.itemCount >= 0);
}

/**
 * @param {string} dbDir
 * @param {{ sqlite3?: typeof import('better-sqlite3') }} [io]
 */
export function sqlStreamStore(dbDir, io) {
  const { sqlite3 = sqlite3ambient } = io || {};
  const filePath = path.join(dbDir, 'streams.sqlite');
  const db = sqlite3(
    filePath,
    // { verbose: console.log },
  );
  db.exec(`
    CREATE TABLE IF NOT EXISTS streamItem (
      streamName TEXT,
      position INTEGER,
      item TEXT,
      PRIMARY KEY (streamName, position)
    )
  `);

  // We use explicit transactions to 1: not commit writes until the
  // host application calls commit() and 2: avoid expensive fsyncs
  // until the appropriate commit point. All API methods should call
  // this first, otherwise sqlite will automatically start a
  // transaction for us, but it will commit/fsync at the end of the DB
  // run(). We use IMMEDIATE because the kernel is supposed to be the
  // sole writer of the DB, and if some other process is holding a
  // write lock, I'd like to find out earlier rather than later. We do
  // not use EXCLUSIVE because we should allow external *readers*, and
  // we might decide to use WAL mode some day. Read all of
  // https://sqlite.org/lang_transaction.html , especially section 2.2

  function ensureTransaction() {
    // @ts-expect-error Database really does have .inTransaction:boolean
    if (!db.inTransaction) {
      db.prepare('BEGIN IMMEDIATE TRANSACTION').run();
      // @ts-expect-error Database really does have .inTransaction:boolean
      assert(db.inTransaction);
    }
  }

  const streamStatus = new Map();

  /**
   * @param {string} streamName
   * @param {StreamPosition} startPosition
   * @param {StreamPosition} endPosition
   */
  function readStream(streamName, startPosition, endPosition) {
    insistStreamName(streamName);
    assert(
      !streamStatus.get(streamName),
      X`can't read stream ${q(streamName)} because it's already in use`,
    );
    insistStreamPosition(startPosition);
    insistStreamPosition(endPosition);
    assert(
      startPosition.itemCount <= endPosition.itemCount,
      X`${q(startPosition.itemCount)} <= ${q(endPosition.itemCount)}}`,
    );

    function* reader() {
      ensureTransaction();
      const query = db.prepare(`
        SELECT item
        FROM streamItem
        WHERE streamName = ? AND position >= ? AND position < ?
        ORDER BY position
      `);
      for (const { item } of query.iterate(
        streamName,
        startPosition.itemCount,
        endPosition.itemCount,
      )) {
        assert(
          streamStatus.get(streamName) === 'reading',
          X`can't read stream ${q(streamName)}, it's been closed`,
        );
        yield item;
      }
      streamStatus.delete(streamName);
    }

    assert(
      !streamStatus.has(streamName),
      X`can't read stream ${q(streamName)} because it's already in use`,
    );

    if (startPosition.itemCount === endPosition.itemCount) {
      return empty();
    }

    streamStatus.set(streamName, 'reading');

    return reader();
  }

  /**
   * @param {string} streamName
   * @param {string} item
   * @param {StreamPosition} position
   */
  const writeStreamItem = (streamName, item, position) => {
    insistStreamName(streamName);
    insistStreamPosition(position);

    assert(
      !streamStatus.get(streamName),
      X`can't write stream ${q(streamName)} because it's already in use`,
    );

    ensureTransaction();
    db.prepare(
      `
      INSERT INTO streamItem (streamName, item, position)
        VALUES (?, ?, ?)
        ON CONFLICT(streamName, position) DO UPDATE SET item = ?
      `,
    ).run(streamName, item, position.itemCount, item);
    return { itemCount: position.itemCount + 1 };
  };

  /** @param {string} streamName */
  const closeStream = streamName => {
    insistStreamName(streamName);
    streamStatus.delete(streamName);
  };

  const commit = () => {
    // @ts-expect-error Database really does have .inTransaction:boolean
    if (db.inTransaction) {
      db.prepare('COMMIT').run();
    }
  };

  const close = () => {
    // close without commit is abort
    db.close();
  };

  return harden({
    writeStreamItem,
    readStream,
    closeStream,
    commit,
    close,
    STREAM_START,
  });
}
