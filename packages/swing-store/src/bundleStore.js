// @ts-check
import { createHash } from 'crypto';
import { Readable } from 'stream';
import { Buffer } from 'buffer';
import { Fail, q } from '@endo/errors';
import { encodeBase64, decodeBase64 } from '@endo/base64';
import { checkBundle } from '@endo/check-bundle/lite.js';
import { Nat } from '@endo/nat';
import { createSHA256 } from './hasher.js';

/**
 * @typedef { { moduleFormat: 'getExport', source: string, sourceMap?: string } } GetExportBundle
 * @typedef { { moduleFormat: 'nestedEvaluate', source: string, sourceMap?: string } } NestedEvaluateBundle
 * @typedef { { moduleFormat: 'endoZipBase64', endoZipBase64: string, endoZipBase64Sha512: string } } EndoZipBase64Bundle
 * @typedef { EndoZipBase64Bundle | GetExportBundle | NestedEvaluateBundle } Bundle
 */
/**
 * @typedef { import('./exporter.js').SwingStoreExporter } SwingStoreExporter
 * @typedef { import('./internal.js').ArtifactMode } ArtifactMode
 *
 * @typedef {{
 *   addBundle: (bundleID: string, bundle: Bundle) => void;
 *   hasBundle: (bundleID: string) => boolean
 *   getBundle: (bundleID: string) => Bundle;
 *   deleteBundle: (bundleID: string) => void;
 * }} BundleStore
 *
 * @typedef {{
 *   exportBundle: (name: string) => AsyncIterableIterator<Uint8Array>,
 *   repairBundleRecord: (key: string, value: string) => void,
 *   importBundleRecord: (key: string, value: string) => void,
 *   importBundle: (name: string, dataProvider: () => Promise<Buffer>) => Promise<void>,
 *   assertComplete: (checkMode: Omit<ArtifactMode, 'debug'>) => void,
 *   getExportRecords: () => IterableIterator<readonly [key: string, value: string]>,
 *   getArtifactNames: () => AsyncIterableIterator<string>,
 *   getBundleIDs: () => IterableIterator<string>,
 * }} BundleStoreInternal
 *
 * @typedef {{
 *   dumpBundles: () => {},
 * }} BundleStoreDebug
 *
 */

function bundleIDFromName(name) {
  typeof name === 'string' || Fail`artifact name must be a string`;
  const [tag, ...pieces] = name.split('.');
  if (tag !== 'bundle' || pieces.length !== 1) {
    Fail`expected artifact name of the form 'bundle.{bundleID}', saw ${q(
      name,
    )}`;
  }
  const bundleID = pieces[0];
  return bundleID;
}

/**
 * @param {*} db
 * @param {() => void} ensureTxn
 * @param {(key: string, value: string | undefined) => void} noteExport
 * @returns {BundleStore & BundleStoreInternal & BundleStoreDebug}
 */
export function makeBundleStore(db, ensureTxn, noteExport = () => {}) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bundles (
      bundleID TEXT,
      bundle BLOB,
      PRIMARY KEY (bundleID)
    )
  `);

  // A populated record contains both bundleID and bundle, while a
  // pruned record has a bundle of NULL.

  function bundleArtifactName(bundleID) {
    return `bundle.${bundleID}`;
  }

  function bundleIdFromHash(version, hash) {
    return `b${Nat(version)}-${hash}`;
  }

  // the PRIMARY KEY constraint requires the bundleID not already
  // exist
  const sqlAddBundleRecord = db.prepare(`
    INSERT INTO bundles (bundleID, bundle) VALUES (?, NULL)
  `);

  // this sees both populated and pruned (not-yet-populated) records
  const sqlHasBundleRecord = db.prepare(`
    SELECT count(*)
    FROM bundles
    WHERE bundleID = ?
  `);
  sqlHasBundleRecord.pluck();

  const sqlPopulateBundleRecord = db.prepare(`
    UPDATE bundles SET bundle = $serialized WHERE bundleID = $bundleID
  `);

  function addBundleRecord(bundleID) {
    ensureTxn();
    sqlAddBundleRecord.run(bundleID);
  }

  function populateBundle(bundleID, serialized) {
    ensureTxn();
    sqlHasBundleRecord.get(bundleID) || Fail`missing ${bundleID}`;
    sqlPopulateBundleRecord.run({ bundleID, serialized });
  }

  function serializeBundle(bundleID, bundle) {
    const { moduleFormat } = bundle;
    let serialized;
    if (bundleID.startsWith('b0-')) {
      if (moduleFormat !== 'nestedEvaluate') {
        throw Fail`unsupported b0- module format ${q(moduleFormat)}`;
      }
      serialized = JSON.stringify(bundle);
      if (bundleID !== bundleIdFromHash(0, createSHA256(serialized).finish())) {
        throw Fail`bundleID ${q(bundleID)} does not match bundle`;
      }
    } else if (bundleID.startsWith('b1-')) {
      if (moduleFormat !== 'endoZipBase64') {
        throw Fail`unsupported b1- module format ${q(moduleFormat)}`;
      }
      const { endoZipBase64, endoZipBase64Sha512 } = bundle;
      if (bundleID !== bundleIdFromHash(1, endoZipBase64Sha512)) {
        throw Fail`bundleID ${q(bundleID)} does not match bundle`;
      }
      serialized = decodeBase64(endoZipBase64);
    } else {
      throw Fail`unsupported BundleID ${bundleID}`;
    }
    return serialized;
  }

  /**
   * Store a complete bundle in a single operation, used by runtime
   * (i.e. not an import). We rely upon the caller to provide a
   * correct bundle (e.g. no unexpected properties), but we still
   * check the ID against the contents.
   *
   * @param {string} bundleID
   * @param {Bundle} bundle
   */
  function addBundle(bundleID, bundle) {
    const serialized = serializeBundle(bundleID, bundle);
    addBundleRecord(bundleID);
    populateBundle(bundleID, serialized);
    noteExport(bundleArtifactName(bundleID), bundleID);
  }

  const sqlGetPrunedBundles = db.prepare(`
    SELECT bundleID
    FROM bundles
    WHERE bundle IS NULL
    ORDER BY bundleID
  `);
  sqlGetPrunedBundles.pluck();

  function getPrunedBundles() {
    return sqlGetPrunedBundles.all();
  }

  function assertComplete(checkMode) {
    assert(checkMode !== 'debug', checkMode);
    const pruned = getPrunedBundles();
    if (pruned.length) {
      throw Fail`missing bundles for: ${pruned.join(',')}`;
    }
  }

  const sqlHasPopulatedBundle = db.prepare(`
    SELECT count(*)
    FROM bundles
    WHERE bundleID = ?
    AND bundle IS NOT NULL
  `);
  sqlHasPopulatedBundle.pluck(true);

  function hasBundle(bundleID) {
    const count = sqlHasPopulatedBundle.get(bundleID);
    return count !== 0;
  }

  const sqlGetBundle = db.prepare(`
    SELECT bundle
    FROM bundles
    WHERE bundleID = ?
  `);

  /**
   * @param {string} bundleID
   * @returns {Bundle}
   */
  function getBundle(bundleID) {
    const row =
      sqlGetBundle.get(bundleID) || Fail`bundle ${q(bundleID)} not found`;
    const rawBundle = row.bundle || Fail`bundle ${q(bundleID)} pruned`;
    if (bundleID.startsWith('b0-')) {
      return harden(JSON.parse(rawBundle));
    } else if (bundleID.startsWith('b1-')) {
      return harden({
        moduleFormat: 'endoZipBase64',
        endoZipBase64Sha512: bundleID.substring(3),
        endoZipBase64: encodeBase64(rawBundle),
      });
    }
    throw Fail`somehow found unsupported BundleID ${q(bundleID)}`;
  }

  const sqlDeleteBundle = db.prepare(`
    DELETE FROM bundles
    WHERE bundleID = ?
  `);

  function deleteBundle(bundleID) {
    if (hasBundle(bundleID)) {
      ensureTxn();
      sqlDeleteBundle.run(bundleID);
      noteExport(bundleArtifactName(bundleID), undefined);
    }
  }

  // take an export-data record (id/hash but not bundle contents) and
  // insert something in the DB
  function importBundleRecord(key, value) {
    const bundleID = bundleIDFromName(key);
    assert.equal(bundleID, value);
    addBundleRecord(bundleID);
  }

  function repairBundleRecord(key, value) {
    // Bundle records have no metadata, and all bundles must be
    // present (there's no notion of "historical bundle"). So there's
    // no "repair", and if the repair process supplies a bundle record
    // that isn't already present, we throw an error. The repair
    // process doesn't get artifacts, so adding a new record here
    // would fail the subsequent completeness check anyways.

    const bundleID = bundleIDFromName(key);
    assert.equal(bundleID, value);
    if (sqlHasBundleRecord.get(bundleID)) {
      // record is present, there's no metadata to mismatch, so ignore quietly
      return;
    }
    throw Fail`unexpected new bundle record for ${bundleID} during repair`;
  }

  /**
   * Read a bundle and return it as a stream of data suitable for export to
   * another store.
   *
   * Bundle artifact names should be strings of the form:
   *   `bundle.${bundleID}`
   *
   * @param {string} name
   *
   * @yields {Uint8Array}
   * @returns {AsyncIterableIterator<Uint8Array>}
   */
  async function* exportBundle(name) {
    const bundleID = bundleIDFromName(name);
    const row =
      sqlGetBundle.get(bundleID) || Fail`bundle ${q(bundleID)} not found`;
    const rawBundle = row.bundle || Fail`bundle ${q(bundleID)} pruned`;
    yield* Readable.from(Buffer.from(rawBundle));
  }
  harden(exportBundle);

  const sqlGetBundleIDs = db.prepare(`
    SELECT bundleID
    FROM bundles
    ORDER BY bundleID
  `);
  sqlGetBundleIDs.pluck(true);

  /**
   * Obtain artifact metadata records for bundles contained in this store.
   *
   * @yields {[key: string, value: string]}
   * @returns {IterableIterator<readonly [key: string, value: string]>}
   */
  function* getExportRecords() {
    for (const bundleID of sqlGetBundleIDs.iterate()) {
      yield [bundleArtifactName(bundleID), bundleID];
    }
  }
  harden(getExportRecords);

  async function* getArtifactNames() {
    for (const bundleID of sqlGetBundleIDs.iterate()) {
      yield bundleArtifactName(bundleID);
    }
  }
  harden(getArtifactNames);

  function computeSha512(bytes) {
    const hash = createHash('sha512');
    hash.update(bytes);
    return hash.digest().toString('hex');
  }

  /**
   * Call addBundleRecord() first, then this importBundle() will
   * populate the record.
   *
   * @param {string} name  Artifact name, `bundle.${bundleID}`
   * @param {() => Promise<Buffer>} dataProvider  Function to get bundle bytes
   * @returns {Promise<void>}
   */
  async function importBundle(name, dataProvider) {
    await 0; // no synchronous prefix
    const bundleID = bundleIDFromName(name);
    const data = await dataProvider();
    if (bundleID.startsWith('b0-')) {
      // we dissect and reassemble the bundle, to exclude unexpected properties
      const { moduleFormat, source, sourceMap } = JSON.parse(data.toString());
      /** @type {NestedEvaluateBundle} */
      const bundle = harden({ moduleFormat, source, sourceMap });
      const serialized = JSON.stringify(bundle);
      bundleID === bundleIdFromHash(0, createSHA256(serialized).finish()) ||
        Fail`bundleID ${q(bundleID)} does not match bundle artifact`;
      populateBundle(bundleID, serialized);
    } else if (bundleID.startsWith('b1-')) {
      /** @type {EndoZipBase64Bundle} */
      const bundle = harden({
        moduleFormat: 'endoZipBase64',
        endoZipBase64Sha512: bundleID.substring(3),
        endoZipBase64: encodeBase64(data),
      });
      // Assert that the bundle contents match the ID and hash
      await checkBundle(bundle, computeSha512, bundleID);
      populateBundle(bundleID, serializeBundle(bundleID, bundle));
    } else {
      Fail`unsupported BundleID ${q(bundleID)}`;
    }
  }

  const sqlDumpBundles = db.prepare(`
    SELECT bundleID, bundle
    FROM bundles
    ORDER BY bundleID
  `);

  /**
   * debug function to dump active bundles
   */
  function dumpBundles() {
    const sql = sqlDumpBundles;
    const dump = {};
    for (const row of sql.iterate()) {
      const { bundleID, bundle } = row;
      dump[bundleID] = encodeBase64(Buffer.from(bundle, 'utf-8'));
    }
    return dump;
  }

  const sqlListBundleIDs = db.prepare(`
  SELECT bundleID
  FROM bundles
  ORDER BY bundleID
`);
  sqlListBundleIDs.pluck(true);

  function* getBundleIDs() {
    yield* sqlListBundleIDs.iterate();
  }
  harden(getBundleIDs);

  return harden({
    importBundleRecord,
    importBundle,
    assertComplete,

    addBundle,
    hasBundle,
    getBundle,
    deleteBundle,

    getExportRecords,
    getArtifactNames,
    exportBundle,
    getBundleIDs,
    repairBundleRecord,

    dumpBundles,
  });
}
