// @ts-check
import { createHash } from 'crypto';
import { Readable } from 'stream';
import { Buffer } from 'buffer';
import { encodeBase64, decodeBase64 } from '@endo/base64';
import { checkBundle } from '@endo/check-bundle/lite.js';
import { Fail, q } from '@agoric/assert';
import { buffer } from './util.js';

/**
 * @typedef { { moduleFormat: 'getExport', source: string, sourceMap?: string } } GetExportBundle
 * @typedef { { moduleFormat: 'nestedEvaluate', source: string, sourceMap?: string } } NestedEvaluateBundle
 * @typedef { { moduleFormat: 'endoZipBase64', endoZipBase64: string, endoZipBase64Sha512: string } } EndoZipBase64Bundle
 * @typedef { EndoZipBase64Bundle | GetExportBundle | NestedEvaluateBundle } Bundle
 */
/**
 * @typedef { import('./swingStore').SwingStoreExporter } SwingStoreExporter
 *
 * @typedef {{
 *   addBundle: (bundleID: string, bundle: Bundle) => void;
 *   hasBundle: (bundleID: string) => boolean
 *   getBundle: (bundleID: string) => Bundle;
 *   deleteBundle: (bundleID: string) => void;
 * }} BundleStore
 *
 * @typedef {{
 *   exportBundle: (name: string) => AsyncIterable<Uint8Array>,
 *   importBundle: (artifactName: string, exporter: SwingStoreExporter, bundleID: string) => void,
 *   getExportRecords: () => Iterable<[key: string, value: string]>,
 *   getArtifactNames: () => AsyncIterable<string>,
 * }} BundleStoreInternal
 *
 * @typedef {{
 *   dumpBundles: () => {},
 * }} BundleStoreDebug
 *
 */

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

  function bundleArtifactName(bundleID) {
    return `bundle.${bundleID}`;
  }

  function bundleIdFromHash(hash) {
    return `b1-${hash}`;
  }

  const sqlAddBundle = db.prepare(`
    INSERT OR REPLACE INTO bundles
      (bundleID, bundle)
    VALUES (?, ?)
  `);

  /**
   * Store a bundle.  Here the bundle itself is presumed valid.
   *
   * @param {string} bundleID
   * @param {Bundle} bundle
   */
  function addBundle(bundleID, bundle) {
    const { moduleFormat } = bundle;
    if (moduleFormat !== 'endoZipBase64')
      throw Fail`unsupported module format ${q(moduleFormat)}`;
    const { endoZipBase64, endoZipBase64Sha512 } = bundle;
    bundleID === bundleIdFromHash(endoZipBase64Sha512) ||
      Fail`bundleID ${q(bundleID)} does not match bundle`;
    ensureTxn();
    sqlAddBundle.run(bundleID, decodeBase64(endoZipBase64));
    noteExport(bundleArtifactName(bundleID), bundleID);
  }

  const sqlHasBundle = db.prepare(`
    SELECT count(*)
    FROM bundles
    WHERE bundleID = ?
  `);
  sqlHasBundle.pluck(true);

  function hasBundle(bundleID) {
    const count = sqlHasBundle.get(bundleID);
    return count !== 0;
  }

  const sqlGetBundle = db.prepare(`
    SELECT bundle
    FROM bundles
    WHERE bundleID = ?
  `);
  sqlGetBundle.pluck(true);

  /**
   * @param {string} bundleID
   * @returns {EndoZipBase64Bundle}
   */
  function getBundle(bundleID) {
    bundleID.startsWith('b1-') || Fail`invalid bundleID ${q(bundleID)}`;
    const rawBundle = sqlGetBundle.get(bundleID);
    rawBundle || Fail`bundle ${q(bundleID)} not found`;
    return harden({
      moduleFormat: 'endoZipBase64',
      endoZipBase64Sha512: bundleID.substring(3),
      endoZipBase64: encodeBase64(rawBundle),
    });
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
   * @returns {AsyncIterable<Uint8Array>}
   */
  async function* exportBundle(name) {
    typeof name === 'string' || Fail`artifact name must be a string`;
    const parts = name.split('.');
    const [type, bundleID] = parts;
    // prettier-ignore
    (parts.length === 2 && type === 'bundle') ||
      Fail`expected artifact name of the form 'bundle.{bundleID}', saw ${q(name)}`;
    const bundle = getBundle(bundleID);
    bundle || Fail`bundle ${q(name)} not available`;
    yield* Readable.from(Buffer.from(bundle.endoZipBase64));
  }

  const sqlGetBundleIDs = db.prepare(`
    SELECT bundleID
    FROM bundles
  `);
  sqlGetBundleIDs.pluck(true);

  /**
   * Obtain artifact metadata records for bundles contained in this store.
   *
   * @yields {[key: string, value: string]}
   * @returns {Iterable<[key: string, value: string]>}
   */
  function* getExportRecords() {
    for (const bundleID of sqlGetBundleIDs.iterate()) {
      yield [bundleArtifactName(bundleID), bundleID];
    }
  }

  async function* getArtifactNames() {
    for (const bundleID of sqlGetBundleIDs.iterate()) {
      yield bundleArtifactName(bundleID);
    }
  }

  function computeSha512(bytes) {
    const hash = createHash('sha512');
    hash.update(bytes);
    return hash.digest().toString('hex');
  }

  /**
   * @param {string} name  Artifact name of the bundle
   * @param {SwingStoreExporter} exporter  Whence to get the bits
   * @param {string} bundleID  Bundle ID of the bundle
   * @returns {Promise<void>}
   */
  async function importBundle(name, exporter, bundleID) {
    const parts = name.split('.');
    const [type, bundleIDkey] = parts;
    // prettier-ignore
    parts.length === 2 && type === 'bundle' ||
      Fail`expected artifact name of the form 'bundle.{bundleID}', saw '${q(name)}'`;
    bundleIDkey === bundleID ||
      Fail`bundle artifact name ${name} doesn't match bundleID ${bundleID}`;
    bundleID.startsWith('b1-') || Fail`invalid bundleID ${q(bundleID)}`;
    const artifactChunks = exporter.getArtifact(name);
    const inStream = Readable.from(artifactChunks);
    const encodedBundle = await buffer(inStream);
    /** @type {EndoZipBase64Bundle} */
    const bundle = harden({
      moduleFormat: 'endoZipBase64',
      endoZipBase64Sha512: bundleID.substring(3),
      endoZipBase64: encodedBundle.toString(),
    });
    await checkBundle(bundle, computeSha512, bundleID);
    addBundle(bundleID, bundle);
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
      dump[bundleID] = bundle;
    }
    return dump;
  }

  return harden({
    addBundle,
    hasBundle,
    getBundle,
    deleteBundle,
    getExportRecords,
    getArtifactNames,
    exportBundle,
    importBundle,

    dumpBundles,
  });
}
