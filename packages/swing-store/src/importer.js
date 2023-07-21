import { Readable } from 'stream';
import { Fail, q } from '@agoric/assert';

import { makeSwingStore } from './swingStore.js';
import { buffer } from './util.js';

export function assertComplete(internal, level) {
  assert.equal(level, 'operational'); // only option for now
  // every bundle must be populated
  internal.bundleStore.assertComplete(level);

  // every 'isCurrent' transcript span must have all items
  // TODO: every vat with any data must have a isCurrent transcript
  // span
  internal.transcriptStore.assertComplete(level);

  // every 'inUse' snapshot must be populated
  internal.snapStore.assertComplete(level);

  // TODO: every isCurrent span that starts with load-snapshot has a
  // matching snapshot (counter-argument: swing-store should not know
  // those details about transcript entries)
}

/**
 * Function used to create a new swingStore from an object implementing the
 * exporter API. The exporter API may be provided by a swingStore instance, or
 * implemented by a host to restore data that was previously exported.
 *
 * @param {import('./exporter').SwingStoreExporter} exporter
 * @param {string | null} [dirPath]
 * @param {object} options
 * @returns {Promise<import('./swingStore').SwingStore>}
 */
export async function importSwingStore(exporter, dirPath = null, options = {}) {
  if (dirPath) {
    typeof dirPath === 'string' || Fail`dirPath must be a string`;
  }
  const { includeHistorical = false } = options;
  const store = makeSwingStore(dirPath, true, options);
  const { kernelStorage, internal } = store;

  // For every exportData entry, we add a DB record. 'kv' entries are
  // the "kvStore shadow table", and are not associated with any
  // artifacts. All other entries are associated with an artifact,
  // however the import may or may not contain that artifact (the
  // dataset can be incomplete: either the original DB was pruned at
  // some point, or the exporter did not choose to include
  // everything). The DB records we add are marked as incomplete (as
  // if they had been pruned locally), and can be populated later when
  // the artifact is retrieved.

  // While unlikely, the getExportData() protocol *is* allowed to
  // deliver multiple values for the same key (last one wins), or use
  // 'null' to delete a previously-defined key. So our first pass both
  // installs the kvStore shadow records, and de-dups/deletes the
  // metadata records into this Map.

  const allMetadata = new Map();

  for await (const [key, value] of exporter.getExportData()) {
    const [tag] = key.split('.', 1);
    if (tag === 'kv') {
      // 'kv' keys contain individual kvStore entries
      const subKey = key.substring(tag.length + 1);
      if (value == null) {
        // Note '==' rather than '===': any nullish value implies deletion
        kernelStorage.kvStore.delete(subKey);
      } else {
        kernelStorage.kvStore.set(subKey, value);
      }
    } else if (value == null) {
      allMetadata.delete(key);
    } else {
      allMetadata.set(key, value);
    }
  }

  // Now take each metadata record and install the stub/pruned entry
  // into the DB.

  for (const [key, value] of allMetadata.entries()) {
    const [tag, ...pieces] = key.split('.');
    if (tag === 'bundle') {
      const bundleID = pieces[0];
      internal.bundleStore.addBundleRecord(bundleID);
    } else if (tag === 'snapshot') {
      const [_vatID, endPos] = pieces;
      if (endPos !== 'current') {
        internal.snapStore.addSnapshotRecord(JSON.parse(value));
      }
      // metadata['snapshot.v1.current'] = 'snapshot.v1.5' , i.e. it
      // points to the name of the current artifact. We could
      // conceivably remember this and compare it against the .inUse
      // property of that record, but it's not worth the effort (we
      // might encounter the records in either order).
    } else if (tag === 'transcript') {
      const metadata = JSON.parse(value);
      if (!!key.endsWith('.current') !== !!metadata.isCurrent) {
        throw Fail`transcript key ${key} mismatches metadata ${metadata}`;
      }
      internal.transcriptStore.addTranscriptSpanRecord(metadata);
    } else {
      Fail`unknown export-data type ${q(tag)} on import`;
    }
  }

  // All the metadata is now installed, and we're prepared for
  // artifacts. We walk `getArtifactNames()` and offer each one to the
  // submodule, which ignores historical ones (unless
  // 'includeHistorical' is true), and validates+accepts the
  // rest. This is an initial import, so we don't need to check if we
  // already have the data, but the submodule function is free to do
  // that check if they want.

  for await (const name of exporter.getArtifactNames()) {
    const chunkProvider = () => exporter.getArtifact(name);
    const dataProvider = async () => buffer(Readable.from(chunkProvider()));
    const pieces = name.split('.');
    assert(pieces.length > 1);
    const tag = pieces[0];
    if (tag === 'bundle') {
      await internal.bundleStore.importBundle(name, dataProvider);
    } else if (tag === 'snapshot') {
      await internal.snapStore.populateSnapshot(
        name,
        chunkProvider,
        includeHistorical,
      );
    } else if (tag === 'transcript') {
      await internal.transcriptStore.populateTranscriptSpan(
        name,
        chunkProvider,
        includeHistorical,
      );
    } else {
      Fail`unknown artifact type ${q(tag)} on import`;
    }
  }

  // We've installed all the artifacts that we could, now do a
  // completeness check.

  assertComplete(internal, 'operational');

  await exporter.close();
  return store;
}
