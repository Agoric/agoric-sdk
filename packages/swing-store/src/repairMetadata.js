import { Fail, q } from '@endo/errors';
import { assertComplete } from './assertComplete.js';

/**
 * Given a pre-existing swingstore and a SwingStoreExporter, read in
 * all the metadata from the exporter and use it to regenerate any
 * missing metadata records. This can be used to fix the damage caused
 * by #8025.
 *
 * The repair method will call `exporter.getExportData` and examine
 * all entries to do one of three things:
 *
 * 1: kvStore records are ignored (they are not metadata)
 * 2: bundle/snapshot/transcript records whose keys already exist will
 *    be compared against the existing data, and an error thrown if
 *    they do not match
 * 3: new snapshot/transcript records will be silently added to
 *    the swingstore (new bundle records are an error, since we do not
 *    tolerate pruned bundles)
 *
 * It will not call `exporter.getArtifactNames` or `getArtifacts`.
 *
 * At the end of the process, the DB will contain pending changes in
 * an open transaction. The caller is responsible for calling
 * `hostStorage.commit()` when they are ready.
 *
 * @param {import('./internal.js').SwingStoreInternal} internal
 * @param {import('./exporter.js').SwingStoreExporter} exporter
 * @returns {Promise<void>}
 */
export async function doRepairMetadata(internal, exporter) {
  // first we strip kvStore entries and deduplicate the rest

  const allMetadata = new Map();

  for await (const [key, value] of exporter.getExportData()) {
    const [tag] = key.split('.', 1);
    if (tag === 'kv') {
      continue;
    } else if (value == null) {
      allMetadata.delete(key);
    } else {
      allMetadata.set(key, value);
    }
  }

  // then process the metadata records

  for (const [key, value] of allMetadata.entries()) {
    const [tag] = key.split('.', 1);
    if (tag === 'bundle') {
      internal.bundleStore.repairBundleRecord(key, value);
    } else if (tag === 'snapshot') {
      internal.snapStore.repairSnapshotRecord(key, value);
    } else if (tag === 'transcript') {
      internal.transcriptStore.repairTranscriptSpanRecord(key, value);
    } else {
      Fail`unknown export-data type in key ${q(key)} on repairMetadata`;
    }
  }

  // and do a completeness check
  /** @type { import('./internal.js').ArtifactMode } */
  const artifactMode = 'operational';
  assertComplete(internal, artifactMode);
  await exporter.close();
}
