import { Fail, q } from '@agoric/assert';
import { makeSwingStore } from './swingStore.js';
import { assertComplete } from './importer.js';

/**
 * Given a pre-existing swingstore and a SwingStoreExporter, read in
 * all the metadata from the exporter and use it to regenerate any
 * missing metadata records. This can be used to fix the damage caused
 * by #8025.
 *
 * The repair method will call `exporter.getExportData` and examine
 * all entries to do one of three things:
 *
 * 1: kvStore records are ignored (not metadata)
 * 2: bundle/snapshot/transcript records whose keys already exist will
 *    be compared against the existing data, and an error thrown if
 *    they do not match
 * 3: new bundle/snapshot/transcript records will be silently added to
 *    the swingstore
 *
 * It will not call `exporter.getArtifactNames` or `getArtifacts`.
 *
 * At the end of the process, the DB changes will be committed. The
 * function does not return a SwingStore: most callers will want to
 * call `openSwingStore` shortly after this repair process.
 *
 * @param {string} dirPath
 * @param {import('./exporter').SwingStoreExporter} exporter
 * @returns {Promise<void>}
 */
export async function repairMetadata(dirPath, exporter) {
  typeof dirPath === 'string' || Fail`dirPath must be a string`;
  const options = {};
  const store = makeSwingStore(dirPath, false, options);
  const { hostStorage, internal } = store;

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
    const [tag, ...pieces] = key.split('.');
    if (tag === 'bundle') {
      // we ignore bundle records, because we're also ignoring
      // artifacts, so any new bundle records stand no chance of being
      // populated, which would fail our completeness check. Also,
      // #8025 was accidentally deleting historical
      // snapshots/transcript records, not bundles.
      continue;
    } else if (tag === 'snapshot') {
      const [_vatID, endPos] = pieces;
      if (endPos === 'current') {
        continue; // not deleted by #8025
      }
      const metadata = JSON.parse(value);
      internal.snapStore.repairSnapshotRecord(metadata);
    } else if (tag === 'transcript') {
      const metadata = JSON.parse(value);
      internal.transcriptStore.repairTranscriptSpanRecord(metadata);
    } else {
      Fail`unknown export-data type ${q(tag)} on repairMetadata`;
    }
  }

  // and do a completeness check
  assertComplete(internal, 'operational');
  await exporter.close();
  await hostStorage.commit();
}
