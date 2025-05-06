// @ts-check
import { Readable } from 'stream';
import { Buffer } from 'buffer';
import { Fail, q } from '@endo/errors';
import BufferLineTransform from '@agoric/internal/src/node/buffer-line-transform.js';
import { createSHA256 } from './hasher.js';

/**
 * @template T
 *  @typedef  { IterableIterator<T> | AsyncIterableIterator<T> } AnyIterableIterator<T>
 */

/**
 * @typedef { import('./internal.js').ArtifactMode } ArtifactMode
 *
 * @typedef {{
 *   initTranscript: (vatID: string) => void,
 *   rolloverSpan: (vatID: string) => Promise<number>,
 *   rolloverIncarnation: (vatID: string) => Promise<number>,
 *   getCurrentSpanBounds: (vatID: string) => { startPos: number, endPos: number, hash: string, incarnation: number },
 *   stopUsingTranscript: (vatID: string) => Promise<void>,
 *   deleteVatTranscripts: (vatID: string, budget?: number) => { done: boolean, cleanups: number },
 *   addItem: (vatID: string, item: string) => void,
 *   readSpan: (vatID: string, startPos?: number) => IterableIterator<string>,
 * }} TranscriptStore
 *
 * @typedef {{
 *   exportSpan: (name: string) => AsyncIterableIterator<Uint8Array>
 *   getExportRecords: (includeHistorical: boolean) => IterableIterator<readonly [key: string, value: string]>,
 *   getArtifactNames: (artifactMode: ArtifactMode) => AsyncIterableIterator<string>,
 *   importTranscriptSpanRecord: (key: string, value: string) => void,
 *   populateTranscriptSpan: (name: string, makeChunkIterator: () => AnyIterableIterator<Uint8Array>, options: { artifactMode: ArtifactMode }) => Promise<void>,
 *   assertComplete: (checkMode: Omit<ArtifactMode, 'debug'>) => void,
 *   repairTranscriptSpanRecord: (key: string, value: string) => void,
 *   readFullVatTranscript: (vatID: string) => Iterable<{position: number, item: string}>
 * }} TranscriptStoreInternal
 *
 * @typedef {{
 *   dumpTranscripts: (includeHistorical?: boolean) => {[vatID: string]: {[position: number]: string}}
 * }} TranscriptStoreDebug
 *
 */

function* empty() {
  // Yield nothing
}
harden(empty);

/**
 * @param {number} position
 * @returns {asserts position is number}
 */

function insistTranscriptPosition(position) {
  typeof position === 'number' || Fail`position must be a number`;
  position >= 0 || Fail`position must not be negative`;
}

/**
 * @param {*} db
 * @param {() => void} ensureTxn
 * @param {(key: string, value: string | undefined ) => void} noteExport
 * @param {object} [options]
 * @param {boolean} [options.keepTranscripts]
 * @param {(spanName: string, entries: ReturnType<exportSpan>) => Promise<void>} [options.archiveTranscript]
 * @returns { TranscriptStore & TranscriptStoreInternal & TranscriptStoreDebug }
 */
export function makeTranscriptStore(
  db,
  ensureTxn,
  noteExport = () => {},
  { keepTranscripts = true, archiveTranscript } = {},
) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transcriptItems (
      vatID TEXT,
      position INTEGER,
      item TEXT,
      incarnation INTEGER,
      PRIMARY KEY (vatID, position)
    )
  `);

  // Transcripts are broken up into "spans", delimited by heap snapshots.
  // The items of each transcript consist of deliveries and pseudo-deliveries
  // such as initialize-worker and load-snapshot.
  // For every vatID, there will be exactly one current span (with isCurrent=1),
  // and zero or more non-current (historical) spans (with isCurrent=null).
  // If we take a heap snapshot after the first hundred items and again after
  // the second hundred (i.e., after zero-indexed items 99 and 199),
  // and have not yet extended the transcript after the second snapshot, we'll
  // have two historical spans (one with startPos=0 and endPos=100, the second
  // with startPos=100 and endPos=200) and a single empty current span with
  // startPos=200 and endPos=200.  But this situation is transient, and will
  // generally be followed by a load-snapshot pseudo-delivery before the next
  // commit (at which point the single current span will still have startPos=200
  // but will have endPos=201).  After we perform the next delivery, the single
  // current span will still have startPos=200 but will now have endPos=202.
  //
  // The transcriptItems associated with historical spans may or may not exist,
  // depending on pruning.  However, the items associated with the current span
  // must always be present.

  db.exec(`
    CREATE TABLE IF NOT EXISTS transcriptSpans (
      vatID TEXT,
      startPos INTEGER, -- inclusive
      endPos INTEGER, -- exclusive
      hash TEXT, -- cumulative hash of this item and previous cumulative hash
      isCurrent INTEGER CHECK (isCurrent = 1),
      incarnation INTEGER,
      PRIMARY KEY (vatID, startPos),
      UNIQUE (vatID, isCurrent)
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS currentTranscriptIndex
    ON transcriptSpans (vatID, isCurrent)
  `);

  const sqlDumpItemsQuery = db.prepare(`
    SELECT vatID, position, item
    FROM transcriptItems
    WHERE vatID = ? AND ? <= position AND position < ?
    ORDER BY vatID, position
  `);

  const sqlDumpSpansQuery = db.prepare(`
    SELECT vatID, startPos, endPos, isCurrent, incarnation
    FROM transcriptSpans
    ORDER BY vatID, startPos
  `);

  const sqlDumpVatSpansQuery = db.prepare(`
    SELECT startPos, endPos
    FROM transcriptSpans
    WHERE vatID = ?
    ORDER BY startPos
  `);

  function dumpTranscripts(includeHistorical = true) {
    // debug function to return: dump[vatID][position] = item
    /** @type {Record<string, Record<number, string>>} */
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

  function* readFullVatTranscript(vatID) {
    for (const { startPos, endPos } of sqlDumpVatSpansQuery.iterate(vatID)) {
      for (const row of sqlDumpItemsQuery.iterate(vatID, startPos, endPos)) {
        yield row;
      }
    }
  }
  harden(readFullVatTranscript);

  function spanArtifactName(rec) {
    return `transcript.${rec.vatID}.${rec.startPos}.${rec.endPos}`;
  }

  function spanMetadataKey(rec) {
    if (rec.isCurrent) {
      return `transcript.${rec.vatID}.current`;
    } else {
      return `transcript.${rec.vatID}.${rec.startPos}`;
    }
  }

  function spanRec(vatID, startPos, endPos, hash, isCurrent, incarnation) {
    isCurrent = isCurrent ? 1 : 0;
    return { vatID, startPos, endPos, hash, isCurrent, incarnation };
  }

  /**
   * Compute a new cumulative hash for a span that includes a new transcript
   * item.  This is computed by hashing together the hash from the previous item
   * in its span together with the new item's own text.
   *
   * @param {string} priorHash  The previous item's hash
   * @param {string} item  The item itself
   *
   * @returns {string}  The hash of the combined parameters.
   */
  function updateSpanHash(priorHash, item) {
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
      (vatID, startPos, endPos, hash, isCurrent, incarnation)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  /**
   * Start a new transcript for a given vat
   *
   * @param {string} vatID  The vat whose transcript this shall be
   */
  function initTranscript(vatID) {
    ensureTxn();
    const pos = 0;
    const isCurrent = 1;
    const incarnation = 0;
    sqlWriteSpan.run(vatID, pos, pos, initialHash, isCurrent, incarnation);
    const rec = spanRec(vatID, pos, pos, initialHash, isCurrent, incarnation);
    noteExport(spanMetadataKey(rec), JSON.stringify(rec));
  }

  const sqlGetCurrentSpanBounds = db.prepare(`
    SELECT startPos, endPos, hash, incarnation
    FROM transcriptSpans
    WHERE vatID = ? AND isCurrent = 1
  `);

  /**
   * Obtain the bounds and other metadata for a vat's current transcript span.
   *
   * @param {string} vatID  The vat in question
   *
   * @returns {{startPos: number, endPos: number, hash: string, incarnation: number}}
   */
  function getCurrentSpanBounds(vatID) {
    const bounds = sqlGetCurrentSpanBounds.get(vatID);
    bounds || Fail`no current transcript for ${q(vatID)}`;
    return bounds;
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
   * @returns {IterableIterator<string>}  An iterator over the items in the indicated span
   */
  function readSpan(vatID, startPos) {
    /** @type {number | undefined} */
    let endPos;
    if (startPos === undefined) {
      ({ startPos, endPos } = getCurrentSpanBounds(vatID));
    } else {
      insistTranscriptPosition(startPos);
      endPos = sqlGetSpanEndPos.get(vatID, startPos);
      if (typeof endPos !== 'number') {
        throw Fail`no transcript span for ${q(vatID)} at ${q(startPos)}`;
      }
    }
    startPos <= endPos || Fail`${q(startPos)} <= ${q(endPos)}}`;
    const expectedCount = endPos - startPos;

    function* reader() {
      let count = 0;
      for (const { item } of sqlReadSpanItems.iterate(
        vatID,
        startPos,
        endPos,
      )) {
        yield item;
        count += 1;
      }
      count === expectedCount ||
        Fail`read ${q(count)} transcript entries (expected ${q(
          expectedCount,
        )})`;
    }
    harden(reader);

    if (startPos === endPos) {
      return empty();
    }

    return reader();
  }

  const sqlGetSpanIsCurrent = db.prepare(`
    SELECT isCurrent
    FROM transcriptSpans
    WHERE vatID = ? AND startPos = ?
  `);
  sqlGetSpanIsCurrent.pluck(true);

  /**
   * Read a transcript span and return it as a stream of data suitable for
   * export to another store.  Transcript items are terminated by newlines.
   *
   * Transcript span artifact names should be strings of the form:
   *   `transcript.${vatID}.${startPos}.${endPos}`
   *
   * @param {string} name  The name of the transcript artifact to be read
   * @returns {AsyncIterableIterator<Uint8Array>}
   * @yields {Uint8Array}
   */
  async function* exportSpan(name) {
    typeof name === 'string' || Fail`artifact name must be a string`;
    const parts = name.split('.');
    const [type, vatID, pos] = parts;
    // prettier-ignore
    (parts.length === 4 && type === 'transcript') ||
      Fail`expected artifact name of the form 'transcript.{vatID}.{startPos}.{endPos}', saw ${q(name)}`;
    const isCurrent = sqlGetSpanIsCurrent.get(vatID, pos);
    isCurrent !== undefined || Fail`transcript span ${q(name)} not available`;
    const startPos = Number(pos);
    for (const entry of readSpan(vatID, startPos)) {
      yield Buffer.from(`${entry}\n`);
    }
  }
  harden(exportSpan);

  const sqlEndCurrentSpan = db.prepare(`
    UPDATE transcriptSpans
    SET isCurrent = null
    WHERE isCurrent = 1 AND vatID = ?
  `);

  const sqlDeleteOldItems = db.prepare(`
    DELETE FROM transcriptItems
    WHERE vatID = ? AND position >= ? AND position < ?
  `);

  /**
   * Finalize a span, setting isCurrent to null, marking the resulting record
   * for export, and effecting disk archival and database cleanup as
   * configured.
   * Note that creation of a new DB row and removal/replacement of the
   * transcript.${vatID}.current export record are responsibility of the caller.
   *
   * @param {string} vatID
   * @param {ReturnType<getCurrentSpanBounds>} bounds
   */
  async function closeSpan(vatID, bounds) {
    ensureTxn();
    const { startPos, endPos, hash, incarnation } = bounds;
    const rec = spanRec(vatID, startPos, endPos, hash, false, incarnation);

    // add a new export record for the now-old span
    noteExport(spanMetadataKey(rec), JSON.stringify(rec));

    // and change its DB row to isCurrent=null
    sqlEndCurrentSpan.run(vatID);

    await null;
    if (archiveTranscript) {
      const spanName = spanArtifactName(rec);
      const entries = exportSpan(spanName);
      await archiveTranscript(spanName, entries);
    }
    if (!keepTranscripts) {
      // Delete items of the previously-current span.
      // There may still be items associated with even older spans, but we leave
      // those, to avoid excessive DB churn (for details, see #9387 and #9174).
      // Recovery of space claimed by such ancient items is expected to use an
      // external mechanism such as restoration from an operational snapshot
      // that doesn't include them.
      sqlDeleteOldItems.run(vatID, startPos, endPos);
    }
  }

  async function doSpanRollover(vatID, isNewIncarnation) {
    ensureTxn();
    const bounds = getCurrentSpanBounds(vatID);
    const { endPos, incarnation } = bounds;

    // deal with the now-old span
    await closeSpan(vatID, bounds);

    // create a new (empty) DB row, with isCurrent=1
    const newSpanIncarnation = isNewIncarnation ? incarnation + 1 : incarnation;
    sqlWriteSpan.run(vatID, endPos, endPos, initialHash, 1, newSpanIncarnation);

    // overwrite the transcript.${vatID}.current record with new span
    const rec = spanRec(
      vatID,
      endPos,
      endPos,
      initialHash,
      true,
      newSpanIncarnation,
    );
    noteExport(spanMetadataKey(rec), JSON.stringify(rec));

    return newSpanIncarnation;
  }

  /**
   * End the current transcript span for a vat and start a new span in a new
   * incarnation (e.g., after a vat upgrade).
   *
   * @param {string} vatID  The vat whose transcript is to rollover to a new
   *    span.
   *
   * @returns {Promise<number>} the new incarnation number
   */
  async function rolloverIncarnation(vatID) {
    return doSpanRollover(vatID, true);
  }

  /**
   * End the current transcript span for a vat and start a new span in the
   * current incarnation (e.g., after a heap snapshot event).
   *
   * @param {string} vatID  The vat whose transcript is to rollover to a new
   *    span.
   *
   * @returns {Promise<number>} the incarnation number
   */
  async function rolloverSpan(vatID) {
    return doSpanRollover(vatID, false);
  }

  const sqlDeleteVatSpans = db.prepare(`
    DELETE FROM transcriptSpans
    WHERE vatID = ?
  `);

  const sqlDeleteVatItems = db.prepare(`
    DELETE FROM transcriptItems
    WHERE vatID = ?
  `);

  const sqlGetVatSpans = db.prepare(`
    SELECT vatID, startPos, isCurrent
    FROM transcriptSpans
    WHERE vatID = ?
    ORDER BY startPos
  `);

  // This query is ORDER BY startPos DESC, so deleteVatTranscripts
  // will delete the newest spans first. If the kernel failed to call
  // stopUsingTranscript, that will delete the isCurrent=1 span first,
  // which lets us stop including span artifacts in exports sooner.

  const sqlGetSomeVatSpans = db.prepare(`
    SELECT vatID, startPos, endPos, isCurrent
    FROM transcriptSpans
    WHERE vatID = ?
    ORDER BY startPos DESC
    LIMIT ?
  `);

  const sqlDeleteVatSpan = db.prepare(`
    DELETE FROM transcriptSpans
    WHERE vatID = ? AND startPos = ?
  `);

  const sqlDeleteSomeItems = db.prepare(`
    DELETE FROM transcriptItems
    WHERE vatID = ? AND position >= ? AND position < ?
  `);

  /**
   * Prepare for vat deletion by marking the isCurrent=1 span as not current.
   * Idempotent.
   *
   * @param {string} vatID  The vat being terminated/deleted.
   */
  async function stopUsingTranscript(vatID) {
    ensureTxn();
    const bounds = sqlGetCurrentSpanBounds.get(vatID);
    if (!bounds) return;

    // deal with the now-old span
    await closeSpan(vatID, bounds);

    // remove the transcript.${vatID}.current record
    noteExport(spanMetadataKey({ vatID, isCurrent: true }), undefined);
  }

  /**
   * @param {string} vatID
   * @returns {boolean}
   */
  function hasSpans(vatID) {
    // the LIMIT 1 means we aren't really getting all spans
    return sqlGetSomeVatSpans.all(vatID, 1).length > 0;
  }

  /**
   * Delete some or all transcript data for a given vat (for use when,
   * e.g., a vat is terminated)
   *
   * @param {string} vatID
   * @param {number} [budget]
   * @returns {{ done: boolean, cleanups: number }}
   */
  function deleteVatTranscripts(vatID, budget = Infinity) {
    ensureTxn();
    const deleteAll = budget === Infinity;
    assert(deleteAll || budget >= 1, 'budget must be undefined or positive');
    // We can't use .iterate because noteExport can write to the DB,
    // and overlapping queries are not supported.
    const deletions = deleteAll
      ? sqlGetVatSpans.all(vatID)
      : sqlGetSomeVatSpans.all(vatID, budget);
    for (const rec of deletions) {
      // If rec.isCurrent is true, this will remove the
      // transcript.$vatID.current export-data record. If false, it
      // will remove the transcript.$vatID.$startPos record.
      noteExport(spanMetadataKey(rec), undefined);

      // Budgeted deletion must delete rows one by one,
      // but full deletion is handled all at once after this loop.
      if (!deleteAll) {
        sqlDeleteVatSpan.run(vatID, rec.startPos);
        sqlDeleteSomeItems.run(vatID, rec.startPos, rec.endPos);
      }
    }
    if (deleteAll) {
      sqlDeleteVatItems.run(vatID);
      sqlDeleteVatSpans.run(vatID);
    }
    return {
      done: deleteAll || deletions.length === 0 || !hasSpans(vatID),
      cleanups: deletions.length,
    };
  }

  const sqlGetAllSpanMetadata = db.prepare(`
    SELECT vatID, startPos, endPos, hash, isCurrent, incarnation
    FROM transcriptSpans
    ORDER BY vatID, startPos
  `);

  const sqlGetIncarnationSpanMetadata = db.prepare(`
    SELECT vatID, startPos, endPos, hash, isCurrent, incarnation
    FROM transcriptSpans
    WHERE vatID=? AND incarnation=?
    ORDER BY vatID, startPos
  `);

  const sqlGetCurrentSpanMetadata = db.prepare(`
    SELECT vatID, startPos, endPos, hash, isCurrent, incarnation
    FROM transcriptSpans
    WHERE isCurrent = 1
    ORDER BY vatID, startPos
  `);

  function dbRecToExportRec(dbRec) {
    const { vatID, startPos, endPos, hash, isCurrent, incarnation } = dbRec;
    return spanRec(vatID, startPos, endPos, hash, isCurrent, incarnation);
  }

  /**
   * Obtain artifact metadata records for spans contained in this store.
   *
   * @param {boolean} includeHistorical  If true, include all metadata that is
   *   present in the store regardless of its currency; if false, only include
   *   the metadata that is part of the swingset's active operational state.
   *
   * Note: in the currently anticipated operational mode, this flag should
   * always be set to `true`, because *all* transcript span metadata is, for
   * now, considered part of the consensus set.  This metadata is being retained
   * as a hedge against possible future need, wherein we find it necessary to
   * replay a vat's entire history from t0 and therefor need to be able to
   * validate historical transcript artifacts that were recovered from external
   * archives rather than retained directly.  While such a need seems highly
   * unlikely, it hypothetically could be forced by some necessary vat upgrade
   * that implicates path-dependent ephemeral state despite our best efforts to
   * avoid having any such state.  However, the flag itself is present in case
   * future operational policy allows for pruning historical transcript span
   * metadata, for example because we've determined that such full-history
   * replay will never be required or because such replay would be prohibitively
   * expensive regardless of need and therefor other repair strategies employed.
   *
   * The only code path which could use 'false' would be `swingstore.dump()`,
   * which takes the same flag.
   *
   * Note that when a vat is terminated and has been partially
   * deleted, we will retain (and return) a subset of the metadata
   * records, because they must be deleted in-consensus and with
   * updates to the noteExport hook. But we don't create any artifacts
   * for the terminated vats, even for the spans that remain,
   *
   * @yields {readonly [key: string, value: string]}
   * @returns {IterableIterator<readonly [key: string, value: string]>}
   *    An iterator over pairs of [spanMetadataKey, rec], where `rec` is a
   *    JSON-encoded metadata record for the span named by `spanMetadataKey`.
   */
  function* getExportRecords(includeHistorical = true) {
    if (includeHistorical) {
      for (const rec of sqlGetAllSpanMetadata.iterate()) {
        yield [spanMetadataKey(rec), JSON.stringify(dbRecToExportRec(rec))];
      }
    } else {
      for (const rec of sqlGetCurrentSpanMetadata.iterate()) {
        yield [spanMetadataKey(rec), JSON.stringify(dbRecToExportRec(rec))];
      }
    }
  }
  harden(getExportRecords);

  const sqlCountSpanItems = db.prepare(`
    SELECT COUNT(*) FROM transcriptItems
      WHERE vatID = ? AND position >= ? AND position < ?
  `);
  sqlCountSpanItems.pluck();

  /**
   * Obtain artifact names for spans contained in this store.
   *
   * @param {ArtifactMode} artifactMode Control which artifacts should be exported.
   *   At 'operational', only include current spans. At 'replay',
   *   include all spans of the current incarnation for each vat. At
   *   'archival' and 'debug', include all spans.
   * @yields {string}
   * @returns {AsyncIterableIterator<string>}  An iterator over the names of all the artifacts requested
   */
  async function* getArtifactNames(artifactMode) {
    // for all non-'debug' modes, the exporter asserts that all
    // requested items are present (i.e. the artifacts will be
    // complete), so we don't need to check that ourselves
    if (artifactMode === 'operational') {
      for (const rec of sqlGetCurrentSpanMetadata.iterate()) {
        yield spanArtifactName(rec);
      }
    } else if (artifactMode === 'replay') {
      for (const curRec of sqlGetCurrentSpanMetadata.iterate()) {
        const { vatID, incarnation } = curRec;
        for (const rec of sqlGetIncarnationSpanMetadata.iterate(
          vatID,
          incarnation,
        )) {
          yield spanArtifactName(rec);
        }
      }
    } else if (artifactMode === 'archival') {
      // every span for all vatIDs that have an isCurrent=1 span (to
      // ignore terminated/partially-deleted vats)
      const vatIDs = new Set();
      for (const { vatID } of sqlGetCurrentSpanMetadata.iterate()) {
        vatIDs.add(vatID);
      }
      for (const rec of sqlGetAllSpanMetadata.iterate()) {
        if (vatIDs.has(rec.vatID)) {
          yield spanArtifactName(rec);
        }
      }
    } else if (artifactMode === 'debug') {
      // everything that is a complete span
      for (const rec of sqlGetAllSpanMetadata.iterate()) {
        const { vatID, startPos, endPos } = rec;
        const count = sqlCountSpanItems.get(vatID, startPos, endPos);
        if (count !== endPos - startPos) {
          // skip incomplete spans, because the exporter did not
          // already do a completeness check in 'debug' mode
          continue;
        }
        yield spanArtifactName(rec);
      }
    }
  }
  harden(getArtifactNames);

  const sqlAddItem = db.prepare(`
    INSERT INTO transcriptItems (vatID, item, position, incarnation)
    VALUES (?, ?, ?, ?)
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
    const { startPos, endPos, hash, incarnation } = getCurrentSpanBounds(vatID);
    sqlAddItem.run(vatID, item, endPos, incarnation);
    const newEndPos = endPos + 1;
    const newHash = updateSpanHash(hash, item);
    sqlUpdateSpan.run(newEndPos, newHash, vatID);
    const rec = spanRec(vatID, startPos, newEndPos, newHash, true, incarnation);
    noteExport(spanMetadataKey(rec), JSON.stringify(rec));
  };

  function importTranscriptSpanRecord(key, value) {
    ensureTxn();
    const [tag, keyVatID, keyStartPos] = key.split('.');
    assert.equal(tag, 'transcript');
    const metadata = JSON.parse(value);
    if (key.endsWith('.current') !== Boolean(metadata.isCurrent)) {
      throw Fail`transcript key ${key} mismatches metadata ${metadata}`;
    }
    const { vatID, startPos, endPos, hash, isCurrent, incarnation } = metadata;
    vatID || Fail`transcript metadata missing vatID: ${metadata}`;
    startPos !== undefined ||
      Fail`transcript metadata missing startPos: ${metadata}`;
    endPos !== undefined ||
      Fail`transcript metadata missing endPos: ${metadata}`;
    hash || Fail`transcript metadata missing hash: ${metadata}`;
    isCurrent !== undefined ||
      Fail`transcript metadata missing isCurrent: ${metadata}`;
    incarnation !== undefined ||
      Fail`transcript metadata missing incarnation: ${metadata}`;
    if (keyStartPos !== 'current') {
      if (Number(keyStartPos) !== startPos) {
        Fail`transcript key ${key} mismatches metadata ${metadata}`;
      }
    }
    keyVatID === vatID ||
      Fail`transcript key ${key} mismatches metadata ${metadata}`;

    // sqlWriteSpan is an INSERT, so the PRIMARY KEY (vatID, position)
    // constraint will catch broken export-data errors like trying to
    // add two different versions of the same span (e.g. one holding
    // items 4..8, a second holding 4..9)

    sqlWriteSpan.run(
      vatID,
      startPos,
      endPos,
      hash,
      isCurrent ? 1 : null,
      incarnation,
    );
  }

  const sqlGetSpanMetadataFor = db.prepare(`
    SELECT hash, isCurrent, incarnation, endPos
      FROM transcriptSpans
      WHERE vatID = ? AND startPos = ?
  `);

  const sqlGetStartOfIncarnation = db.prepare(`
    SELECT startPos
      FROM transcriptSpans
      WHERE vatID=? AND incarnation=?
      ORDER BY startPos ASC LIMIT 1
  `);
  sqlGetStartOfIncarnation.pluck();

  /**
   * Import a transcript span from another store.
   *
   * @param {string} name  Artifact Name of the transcript span
   * @param {() => AnyIterableIterator<Uint8Array>} makeChunkIterator  get an iterator of transcript byte chunks
   * @param {object} options
   * @param {ArtifactMode} options.artifactMode
   *
   * @returns {Promise<void>}
   */
  async function populateTranscriptSpan(name, makeChunkIterator, options) {
    ensureTxn();
    const { artifactMode } = options;
    const parts = name.split('.');
    const [type, vatID, rawStartPos, rawEndPos] = parts;
    // prettier-ignore
    parts.length === 4 && type === 'transcript' ||
      Fail`expected artifact name of the form 'transcript.{vatID}.{startPos}.{endPos}', saw '${q(name)}'`;
    const startPos = Number(rawStartPos);
    const endPos = Number(rawEndPos);

    const metadata =
      sqlGetSpanMetadataFor.get(vatID, startPos) ||
      Fail`no metadata for transcript span ${name}`;
    assert.equal(metadata.endPos, endPos);

    if (artifactMode === 'operational') {
      if (!metadata.isCurrent) {
        return; // ignore old spans
      }
    }
    if (artifactMode === 'replay') {
      // ignore spans that aren't for the current incarnation
      const { incarnation } = sqlGetCurrentSpanBounds.get(vatID);
      const incStart = sqlGetStartOfIncarnation.get(vatID, incarnation);
      if (startPos < incStart) {
        return;
      }
    }
    // 'archival' and 'debug' modes accept all spans

    const artifactChunks = await makeChunkIterator();
    const inStream = Readable.from(artifactChunks);
    const lineTransform = new BufferLineTransform();
    const lineStream = inStream.pipe(lineTransform).setEncoding('utf8');
    let hash = initialHash;
    let pos = startPos;
    for await (const line of lineStream) {
      const item = line.trimEnd();
      sqlAddItem.run(vatID, item, pos, metadata.incarnation);
      hash = updateSpanHash(hash, item);
      pos += 1;
    }
    pos === endPos || Fail`artifact ${name} is not complete`;

    // validate against the previously-established metadata

    // prettier-ignore
    metadata.hash === hash ||
      Fail`artifact ${name} hash is ${q(hash)}, metadata says ${q(metadata.hash)}`;

    // If that passes, the not-yet-committed data is good. If it
    // fails, the thrown error will flunk the import and inhibit a
    // commit. So we're done.
  }

  function repairTranscriptSpanRecord(key, value) {
    ensureTxn();
    const [tag, keyVatID, keyStartPos] = key.split('.');
    assert.equal(tag, 'transcript');
    const metadata = JSON.parse(value);
    const { vatID, startPos, endPos, hash, isCurrent, incarnation } = metadata;
    assert.equal(keyVatID, vatID);
    if (keyStartPos !== 'current') {
      if (Number(keyStartPos) !== startPos) {
        Fail`transcript key ${key} mismatches metadata ${metadata}`;
      }
    }

    const existing = sqlGetSpanMetadataFor.get(vatID, startPos);
    if (existing) {
      if (
        Boolean(existing.isCurrent) !== Boolean(isCurrent) ||
        existing.hash !== hash ||
        existing.incarnation !== incarnation ||
        existing.endPos !== endPos
      ) {
        throw Fail`repairTranscriptSpanRecord metadata mismatch: ${existing} vs ${metadata}`;
      }
    } else {
      sqlWriteSpan.run(
        vatID,
        startPos,
        endPos,
        hash,
        isCurrent ? 1 : null,
        incarnation,
      );
    }
  }

  function assertComplete(checkMode) {
    assert(checkMode !== 'debug', checkMode);
    for (const rec of sqlGetCurrentSpanMetadata.iterate()) {
      const { vatID, startPos, endPos, incarnation } = rec;

      if (checkMode === 'operational') {
        // at 'operational', every 'isCurrent' transcript span must
        // have all items
        const count = sqlCountSpanItems.get(vatID, startPos, endPos);
        if (count !== endPos - startPos) {
          throw Fail`incomplete current transcript span: ${count} items, ${rec}`;
        }
      } else if (checkMode === 'replay') {
        // at 'replay', every vat's current incarnation must be fully
        // populated (which implies 'operational')
        const incStart = sqlGetStartOfIncarnation.get(vatID, incarnation);
        const incCount = sqlCountSpanItems.get(vatID, incStart, endPos);
        if (incCount !== endPos - incStart) {
          throw Fail`incomplete current incarnation transcript: ${incCount} items`;
        }
      } else if (checkMode === 'archival') {
        // at 'archival', every incarnation must be fully populated,
        // which means position=0 up through endPos-1 (which implies
        // 'replay')
        const arcCount = sqlCountSpanItems.get(vatID, 0, endPos);
        if (arcCount !== endPos) {
          throw Fail`incomplete archival transcript: ${arcCount} vs ${endPos}`;
        }
      } else {
        throw Fail`unknown checkMode ${checkMode}`;
      }
    }
  }

  return harden({
    initTranscript,
    rolloverSpan,
    rolloverIncarnation,
    getCurrentSpanBounds,
    addItem,
    readSpan,
    stopUsingTranscript,
    deleteVatTranscripts,

    exportSpan,
    getExportRecords,
    getArtifactNames,

    importTranscriptSpanRecord,
    populateTranscriptSpan,
    assertComplete,
    repairTranscriptSpanRecord,

    dumpTranscripts,
    readFullVatTranscript,
  });
}
