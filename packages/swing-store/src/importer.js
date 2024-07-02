import { Fail, q } from '@endo/errors';

import { makeSwingStore } from './swingStore.js';
import { buffer } from './util.js';
import { validateArtifactMode } from './internal.js';
import { assertComplete } from './assertComplete.js';

/**
 * @typedef { object } ImportSwingStoreOptions
 * @property { import('./internal.js').ArtifactMode } [artifactMode]  What artifacts should the importer use and require?
 */

/**
 * Function used to populate a swingStore from an object implementing the
 * exporter API. The exporter API may be provided by a swingStore instance, or
 * implemented by a host to restore data that was previously exported. The
 * returned swingStore is not suitable for execution, and thus only contains
 * the host facet for committing the populated swingStore.
 *
 * @param {import('./exporter.js').SwingStoreExporter} exporter
 * @param {string | null} [dirPath]
 * @param {ImportSwingStoreOptions} [options]
 * @returns {Promise<Pick<import('./swingStore.js').SwingStore, 'hostStorage' | 'debug'>>}
 */
export async function importSwingStore(exporter, dirPath = null, options = {}) {
  if (dirPath && typeof dirPath !== 'string') {
    Fail`dirPath must be a string`;
  }
  const { artifactMode = 'operational', ...makeSwingStoreOptions } = options;
  validateArtifactMode(artifactMode);

  const { hostStorage, kernelStorage, internal, debug } = makeSwingStore(
    dirPath,
    true,
    {
      unsafeFastMode: true,
      ...makeSwingStoreOptions,
    },
  );

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
    const [tag] = key.split('.', 1);
    if (tag === 'bundle') {
      internal.bundleStore.importBundleRecord(key, value);
    } else if (tag === 'snapshot') {
      internal.snapStore.importSnapshotRecord(key, value);
    } else if (tag === 'transcript') {
      internal.transcriptStore.importTranscriptSpanRecord(key, value);
    } else {
      Fail`unknown export-data type ${q(tag)} on import`;
    }
  }

  // All the metadata is now installed, and we're prepared for
  // artifacts. We walk `getArtifactNames()` and offer each one to the
  // submodule, which may ignore it according to `artifactMode`, but
  // otherwise validates and accepts it. This is an initial import, so
  // we don't need to check if we already have the data, but the
  // submodule function is free to do such checks.

  for await (const name of exporter.getArtifactNames()) {
    const makeChunkIterator = () => exporter.getArtifact(name);
    const dataProvider = async () => buffer(makeChunkIterator());
    const [tag] = name.split('.', 1);
    // TODO: pass the same args to all artifact importers, and let
    // stores register their functions by
    // 'type'. https://github.com/Agoric/agoric-sdk/pull/8075#discussion_r1285265453
    if (tag === 'bundle') {
      await internal.bundleStore.importBundle(name, dataProvider);
    } else if (tag === 'snapshot') {
      await internal.snapStore.populateSnapshot(name, makeChunkIterator, {
        artifactMode,
      });
    } else if (tag === 'transcript') {
      await internal.transcriptStore.populateTranscriptSpan(
        name,
        makeChunkIterator,
        { artifactMode },
      );
    } else {
      Fail`unknown artifact type ${q(tag)} on import`;
    }
  }

  // We've installed all the artifacts that we could, now do a
  // completeness check. Enforce at least 'operational' completeness,
  // even if the given mode was 'debug'.

  const checkMode = artifactMode === 'debug' ? 'operational' : artifactMode;
  assertComplete(internal, checkMode);

  await exporter.close();
  return { hostStorage, debug };
}
