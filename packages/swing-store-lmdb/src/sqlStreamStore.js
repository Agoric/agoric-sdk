// @ts-check
import sqlite3ambient from 'better-sqlite3';
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
  assert(position);
  assert.typeof(position.itemCount, 'number');
  assert(position.itemCount >= 0);
  return undefined;
}

/**
 * @param {string} dbDir
 * @param {{ sqlite3?: typeof import('better-sqlite3') }} [io]
 */
export function sqlStreamStore(dbDir, io) {
  const { sqlite3 = sqlite3ambient } = io || {};
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
