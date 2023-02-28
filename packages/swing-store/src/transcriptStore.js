// @ts-check
import ReadlineTransform from 'readline-transform';
import { Readable } from 'stream';
import { Buffer } from 'buffer';
import { assert, Fail, q } from '@agoric/assert';
import { createSHA256 } from './hasher.js';

/**
 * @typedef { import('./swingStore').SwingStoreExporter } SwingStoreExporter
 *
 * @typedef {{
 *   initTranscript: (vatID: string) => void,
 *   rolloverSpan: (vatID: string) => void,
 *   getCurrentSpanBounds: (vatID: string) => { startPos: number, endPos: number, hash: string },
 *   addItem: (vatID: string, item: string) => void,
 *   readSpan: (vatID: string, startPos?: number) => Iterable<string>,
 * }} TranscriptStore
 *
 * @typedef {{
 *   exportSpan: (vatID: string, startPos: number) => AsyncIterable<Uint8Array>
 *   importSpan: (artifactName: string, exporter: SwingStoreExporter, artifactMetadata: Map) => Promise<void>,
 *   getExportRecords: (includeHistorical: boolean) => Iterable<[key: string, value: string]>,
 *   getArtifactNames: (includeHistorical: boolean) => AsyncIterable<string>,
 * }} TranscriptStoreInternal
 *
 * @typedef {{
 *   dumpTranscripts: (includeHistorical?: boolean) => any,
 * }} TranscriptStoreDebug
 *
 */

function* empty() {
  // Yield nothing
}

/**
 * @param {unknown} position
 * @returns {asserts position is number}
 */

function insistTranscriptPosition(position) {
  assert.typeof(position, 'number');
  assert(position >= 0);
}

/**
 * @param {*} db
 * @param {() => void} ensureTxn
 * @param {(key: string, value: string) => void} noteExport
 * @returns { TranscriptStore & TranscriptStoreInternal & TranscriptStoreDebug }
 */
export function makeTranscriptStore(db, ensureTxn, noteExport) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transcriptItems (
      vatID TEXT,
      position INTEGER,
      item TEXT,
      PRIMARY KEY (vatID, position)
    )
  `);

  // Transcripts are broken up into "spans", delimited by heap snapshots.  If we
  // take heap snapshots after deliveries 100 and 200, and have not yet
  // performed delivery 201, we'll have two non-current (i.e., isCurrent=0)
  // spans (one with startPos=0, endPos=100, the second with startPos=100,
  // endPos=200), and a single empty isCurrent==1 span with startPos=200 and
  // endPos=200.  After we perform delivery 201, the single isCurrent=1 span
  // will will still have startPos=200 but will now have endPos=201.  For every
  // vatID, there will be exactly one isCurrent=1 span, and zero or more
  // non-current (historical) spans.
  //
  // The transcriptItems associated with historical spans may or may not exist,
  // depending on pruning.  However, the items associated with the current span
  // must always be present

  db.exec(`
    CREATE TABLE IF NOT EXISTS transcriptSpans (
      vatID TEXT,
      startPos INTEGER, -- inclusive
      endPos INTEGER, -- exclusive
      hash TEXT, -- cumulative hash of this item and previous cumulative hash
      isCurrent INTEGER,
      PRIMARY KEY (vatID, startPos)
    )
  `);

  const sqlDumpItemsQuery = db.prepare(`
    SELECT vatID, position, item
    FROM transcriptItems
    WHERE vatID = ? AND ? <= position AND position < ?
    ORDER BY vatID, position
  `);

  const sqlDumpSpansQuery = db.prepare(`
    SELECT vatID, startPos, endPos, isCurrent
    FROM transcriptSpans
    ORDER BY vatID, startPos
  `);

  function dumpTranscripts(includeHistorical = true) {
    // debug function to return: dump[vatID][position] = item
    const transcripts = {};
    for (const spanRow of sqlDumpSpansQuery.iterate()) {
      if (includeHistorical || spanRow.isCurrent) {
        for (const row of sqlDumpItemsQuery.iterate(
          spanRow.vatID,
          spanRow.startPos,
          spanRow.endPos,
        )) {
          const { vatID, position, item } = row;
          if (!transcripts[vatID]) {
            transcripts[vatID] = {};
          }
          transcripts[vatID][position] = item;
        }
      }
    }
    return transcripts;
  }

  /**
   * Compute a cumulative hash that includes a new transcript item.  This is
   * computed by hashing together the hash from the previous item in its span
   * together with the new item's own text.
   *
   * @param {string} priorHash  The previous item's hash
   * @param {string} item  The item itself
   *
   * @returns {string}  The hash of the combined parameters.
   */
  function computeItemHash(priorHash, item) {
    const itemHash = createSHA256(item).finish();
    return createSHA256(priorHash).add(itemHash).finish();
  }

  /**
   * @type {string} Seed hash to use as the prior hash when computing the hash
   * of the very first item in a span, since it has no prior item to draw upon.
   */
  const initialHash = createSHA256('start of transcript span').finish();

  const sqlWriteSpan = db.prepare(`
    INSERT INTO transcriptSpans
      (vatID, startPos, endPos, hash, isCurrent)
    VALUES (?, ?, ?, ?, ?)
  `);

  /**
   * Start a new transcript for a given vat
   *
   * @param {string} vatID  The vat whose transcript this shall be
   */
  function initTranscript(vatID) {
    ensureTxn();
    sqlWriteSpan.run(vatID, 0, 0, initialHash, 1);
  }

  const sqlGetCurrentSpanBounds = db.prepare(`
    SELECT startPos, endPos, hash
    FROM transcriptSpans
    WHERE vatID = ? AND isCurrent = 1
  `);

  /**
   * Obtain the bounds and other metadata for a vat's current transcript span.
   *
   * @param {string} vatID  The vat in question
   *
   * @returns {{startPos: number, endPos: number, hash: string}}
   */
  function getCurrentSpanBounds(vatID) {
    const bounds = sqlGetCurrentSpanBounds.get(vatID);
    assert(bounds, `no current transcript for ${vatID}`);
    return bounds;
  }

  function spanArtifactName(rec) {
    return `transcript.${rec.vatID}.${rec.startPos}.${rec.endPos}`;
  }

  function historicSpanMetadataKey(rec) {
    if (rec.isCurrent) {
      return `transcript.${rec.vatID}.current`;
    } else {
      return `transcript.${rec.vatID}.${rec.startPos}`;
    }
  }

  function currentSpanMetadataKey(rec) {
    return `transcript.${rec.vatID}.current`;
  }

  function spanRec(vatID, startPos, endPos, hash) {
    return { vatID, startPos, endPos, hash };
  }

  const sqlEndCurrentSpan = db.prepare(`
    UPDATE transcriptSpans
    SET isCurrent = 0
    WHERE isCurrent = 1 AND vatID = ?
  `);

  /**
   * End the current transcript span for a vat and start a new one.
   *
   * @param {string} vatID  The vat whose transcript is to rollover to a new
   *    span.
   */
  function rolloverSpan(vatID) {
    ensureTxn();
    const { hash, startPos, endPos } = getCurrentSpanBounds(vatID);
    const rec = spanRec(vatID, startPos, endPos, hash);
    noteExport(historicSpanMetadataKey(rec), JSON.stringify(rec));
    sqlEndCurrentSpan.run(vatID);
    sqlWriteSpan.run(vatID, endPos, endPos, initialHash, 1);
  }

  const sqlGetAllSpanMetadata = db.prepare(`
    SELECT vatID, startPos, endPos, hash, isCurrent
    FROM transcriptSpans
    ORDER BY vatID, startPos
  `);

  const sqlGetCurrentSpanMetadata = db.prepare(`
    SELECT vatID, startPos, endPos, hash, isCurrent
    FROM transcriptSpans
    WHERE isCurrent = 1
    ORDER BY vatID, startPos
  `);

  /**
   * Obtain artifact metadata records for spans contained in this store.
   *
   * @param {boolean} includeHistorical If true, include all spans that are
   * present in the store regardless of their currency; if false, only include
   * the current span for each vat.
   *
   * @yields {[key: string, value: string]}
   * @returns {Iterable<[key: string, value: string]>}  An iterator over pairs of
   *    [historicSpanMetadataKey, rec], where `rec` is a JSON-encoded metadata record for the
   *    span named by `historicSpanMetadataKey`.
   */
  function* getExportRecords(includeHistorical) {
    const sql = includeHistorical
      ? sqlGetAllSpanMetadata
      : sqlGetCurrentSpanMetadata;
    for (const rec of sql.iterate()) {
      yield [historicSpanMetadataKey(rec), JSON.stringify(rec)];
    }
  }

  /**
   * Obtain artifact names for spans contained in this store.
   *
   * @param {boolean} includeHistorical If true, include all spans that are
   * present in the store regardless of their currency; if false, only include
   * the current span for each vat.
   *
   * @yields {string}
   * @returns {AsyncIterable<string>}  An iterator over the names of all the artifacts requested
   */
  async function* getArtifactNames(includeHistorical) {
    const sql = includeHistorical
      ? sqlGetAllSpanMetadata
      : sqlGetCurrentSpanMetadata;
    for (const rec of sql.iterate()) {
      yield spanArtifactName(rec);
    }
  }

  const sqlGetSpanEndPos = db.prepare(`
    SELECT endPos
    FROM transcriptSpans
    WHERE vatID = ? AND startPos = ?
  `);
  sqlGetSpanEndPos.pluck(true);

  const sqlReadSpanItems = db.prepare(`
    SELECT item
    FROM transcriptItems
    WHERE vatID = ? AND ? <= position AND position < ?
    ORDER BY position
  `);

  /**
   * Read the items in a transcript span
   *
   * @param {string} vatID  The vat whose transcript is being read
   * @param {number} [startPos] A start position identifying the span to be
   *    read; defaults to the current span, whatever it is
   *
   * @returns {Iterable<string>}  An iterator over the items in the indicated span
   */
  function readSpan(vatID, startPos) {
    let endPos;
    if (startPos === undefined) {
      ({ startPos, endPos } = getCurrentSpanBounds(vatID));
    } else {
      assert.typeof(startPos, 'number');
      endPos = sqlGetSpanEndPos.get(vatID, startPos);
      assert.typeof(
        endPos,
        'number',
        `no transcript span for ${vatID} at ${startPos}`,
      );
    }
    insistTranscriptPosition(startPos);
    startPos <= endPos || Fail`${q(startPos)} <= ${q(endPos)}}`;

    function* reader() {
      for (const { item } of sqlReadSpanItems.iterate(
        vatID,
        startPos,
        endPos,
      )) {
        yield item;
      }
    }

    if (startPos === endPos) {
      return empty();
    }

    return reader();
  }

  /**
   * Read a transcript span and return it as a stream of data suitable for
   * export to another store.  Items are terminated by newlines.
   *
   * @param {string} vatID  The vat whose transcript is being read
   * @param {number} [startPos] A start position identifying the span to be read
   *
   * @returns {AsyncIterable<Uint8Array>}
   * @yields {Uint8Array}
   */
  async function* exportSpan(vatID, startPos) {
    for (const entry of readSpan(vatID, startPos)) {
      yield Buffer.from(`${entry}\n`);
    }
  }

  const sqlAddItem = db.prepare(`
    INSERT INTO transcriptItems (vatID, item, position)
    VALUES (?, ?, ?)
  `);

  const sqlUpdateSpan = db.prepare(`
    UPDATE transcriptSpans
    SET endPos = ?, hash = ?
    WHERE vatID = ? AND isCurrent = 1
  `);

  /**
   * Append an item to the current transcript span for a given vat
   *
   * @param {string} vatID  The whose transcript is being added to
   * @param {string} item  The item to add
   */
  const addItem = (vatID, item) => {
    ensureTxn();
    const { startPos, endPos, hash } = getCurrentSpanBounds(vatID);
    sqlAddItem.run(vatID, item, endPos);
    const newEndPos = endPos + 1;
    const newHash = computeItemHash(hash, item);
    sqlUpdateSpan.run(newEndPos, newHash, vatID);
    const rec = spanRec(vatID, startPos, newEndPos, newHash);
    noteExport(currentSpanMetadataKey(rec), JSON.stringify(rec));
  };

  /**
   * Import a transcript span from another store.
   *
   * @param {string} name  Artifact Name of the transcript span
   * @param {SwingStoreExporter} exporter  Exporter from which to get the span data
   * @param {object} info  Metadata describing the span
   *
   * @returns {Promise<void>}
   */
  async function importSpan(name, exporter, info) {
    const parts = name.split('.');
    const [type, vatID, rawStartPos, rawEndPos] = parts;
    assert(
      parts.length === 4 && type === 'transcript',
      `expected artifact name of the form 'transcript.{vatID}.{startPos}.{endPos}', saw '${name}'`,
    );
    assert(
      info.vatID === vatID,
      `artifact name says vatID ${vatID}, metadata says ${info.vatID}`,
    );
    const startPos = Number(rawStartPos);
    assert(
      info.startPos === startPos,
      `artifact name says startPos ${startPos}, metadata says ${info.startPos}`,
    );
    const endPos = Number(rawEndPos);
    assert(
      info.endPos === endPos,
      `artifact name says endPos ${endPos}, metadata says ${info.endPos}`,
    );
    const artifactChunks = exporter.getArtifact(name);
    const inStream = Readable.from(artifactChunks);
    const lineTransform = new ReadlineTransform();
    const lineStream = inStream.pipe(lineTransform);
    let hash = initialHash;
    let pos = startPos;
    for await (const item of lineStream) {
      sqlAddItem.run(vatID, item, pos);
      hash = computeItemHash(hash, item);
      pos += 1;
    }
    assert(
      info.hash === hash,
      `artifact ${name} hash is ${hash}, metadata says ${info.hash}`,
    );
    sqlWriteSpan.run(
      info.vatID,
      info.startPos,
      info.endPos,
      info.hash,
      info.isCurrent,
    );
  }

  return harden({
    initTranscript,
    rolloverSpan,
    getCurrentSpanBounds,
    addItem,
    readSpan,

    exportSpan,
    importSpan,
    getExportRecords,
    getArtifactNames,

    dumpTranscripts,
  });
}
