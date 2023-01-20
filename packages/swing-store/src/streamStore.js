// @ts-check
import { assert, Fail, q } from '@agoric/assert';

const STREAM_START = 0;
/**
 * @typedef { number } StreamPosition
 *
 * @typedef {{
 *   writeStreamItem: (streamName: string, item: string, position: StreamPosition) => StreamPosition,
 *   readStream: (streamName: string, startPosition: StreamPosition, endPosition: StreamPosition) => IterableIterator<string>,
 *   closeStream: (streamName: string) => void,
 *   STREAM_START: StreamPosition,
 * }} StreamStore
 *
 * @typedef {{
 *   dumpStreams: () => any,
 * }} StreamStoreDebug
 *
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
  streamName.match(/^[-\w]+$/) || Fail`invalid stream name ${q(streamName)}`;
}

/**
 * @param {unknown} position
 * @returns {asserts position is StreamPosition}
 */

function insistStreamPosition(position) {
  assert.typeof(position, 'number');
  assert(position >= 0);
}

/**
 * @param {*} db
 * @param {() => void} ensureTxn
 * @returns { StreamStore & StreamStoreDebug }
 */
export function makeStreamStore(db, ensureTxn) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS streamItem (
      streamName TEXT,
      position INTEGER,
      item TEXT,
      PRIMARY KEY (streamName, position)
    )
  `);

  const streamStatus = new Map();

  const sqlDumpStreamsQuery = db.prepare(`
    SELECT streamName, position, item
    FROM streamItem
    ORDER BY streamName, position
  `);

  function dumpStreams() {
    // debug function to return: dump[streamName][position] = item
    const streams = {};
    for (const row of sqlDumpStreamsQuery.iterate()) {
      const { streamName, position, item } = row;
      if (!streams[streamName]) {
        streams[streamName] = [];
      }
      streams[streamName][position] = item;
    }
    return streams;
  }

  const sqlReadStreamQuery = db.prepare(`
    SELECT item
    FROM streamItem
    WHERE streamName = ? AND position >= ? AND position < ?
    ORDER BY position
  `);

  /**
   * @param {string} streamName
   * @param {StreamPosition} startPosition
   * @param {StreamPosition} endPosition
   */
  function readStream(streamName, startPosition, endPosition) {
    insistStreamName(streamName);
    !streamStatus.get(streamName) ||
      Fail`can't read stream ${q(streamName)} because it's already in use`;
    insistStreamPosition(startPosition);
    insistStreamPosition(endPosition);
    startPosition <= endPosition ||
      Fail`${q(startPosition)} <= ${q(endPosition)}}`;

    function* reader() {
      ensureTxn();
      for (const { item } of sqlReadStreamQuery.iterate(
        streamName,
        startPosition,
        endPosition,
      )) {
        streamStatus.get(streamName) === 'reading' ||
          Fail`can't read stream ${q(streamName)}, it's been closed`;
        yield item;
      }
      streamStatus.delete(streamName);
    }
    !streamStatus.has(streamName) ||
      Fail`can't read stream ${q(streamName)} because it's already in use`;

    if (startPosition === endPosition) {
      return empty();
    }

    streamStatus.set(streamName, 'reading');

    return reader();
  }

  const sqlStreamWrite = db.prepare(`
    INSERT INTO streamItem (streamName, item, position)
    VALUES (?, ?, ?)
    ON CONFLICT(streamName, position) DO UPDATE SET item = ?
  `);

  /**
   * @param {string} streamName
   * @param {string} item
   * @param {StreamPosition} position
   */
  const writeStreamItem = (streamName, item, position) => {
    insistStreamName(streamName);
    insistStreamPosition(position);
    !streamStatus.get(streamName) ||
      Fail`can't write stream ${q(streamName)} because it's already in use`;

    ensureTxn();
    sqlStreamWrite.run(streamName, item, position, item);
    return position + 1;
  };

  /** @param {string} streamName */
  const closeStream = streamName => {
    insistStreamName(streamName);
    streamStatus.delete(streamName);
  };

  return harden({
    writeStreamItem,
    readStream,
    closeStream,
    STREAM_START,
    dumpStreams,
  });
}
