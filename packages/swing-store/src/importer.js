import { Fail, q } from '@agoric/assert';

import { makeSwingStore } from './swingStore.js';

/**
 * Function used to create a new swingStore from an object implementing the
 * exporter API. The exporter API may be provided by a swingStore instance, or
 * implemented by a host to restore data that was previously exported.
 *
 * @typedef { import('./exporter').SwingStoreExporter } SwingStoreExporter
 * @typedef { import('./swingStore').SwingStore } SwingStore
 * @typedef {(exporter: SwingStoreExporter) => Promise<SwingStore>} ImportSwingStore
 */

function parseVatArtifactExportKey(key) {
  const parts = key.split('.');
  const [_type, vatID, rawPos] = parts;
  // prettier-ignore
  parts.length === 3 ||
    Fail`expected artifact name of the form '{type}.{vatID}.{pos}', saw ${q(key)}`;
  const isCurrent = rawPos === 'current';
  let pos;
  if (isCurrent) {
    pos = -1;
  } else {
    pos = Number(rawPos);
  }

  return { vatID, isCurrent, pos };
}

function artifactKey(type, vatID, pos) {
  return `${type}.${vatID}.${pos}`;
}

/**
 * @param {SwingStoreExporter} exporter
 * @param {string | null} [dirPath]
 * @param {object} options
 * @returns {Promise<SwingStore>}
 */
export async function importSwingStore(exporter, dirPath = null, options = {}) {
  if (dirPath) {
    typeof dirPath === 'string' || Fail`dirPath must be a string`;
  }
  const { includeHistorical = false } = options;
  const store = makeSwingStore(dirPath, true, options);
  const { kernelStorage, internal } = store;

  // Artifact metadata, keyed as `${type}.${vatID}.${pos}`
  //
  // Note that this key is almost but not quite the artifact name, since the
  // names of transcript span artifacts also include the endPos, but the endPos
  // value is in flux until the span is complete.
  const artifactMetadata = new Map();

  // Each vat requires a transcript span and (usually) a snapshot.  This table
  // tracks which of these we've seen, keyed by vatID.
  // vatID -> { snapshotKey: metadataKey, transcriptKey: metatdataKey }
  const vatArtifacts = new Map();
  const bundleArtifacts = new Map();

  for await (const [key, value] of exporter.getExportData()) {
    const [tag] = key.split('.', 1);
    const subKey = key.substring(tag.length + 1);
    if (tag === 'kv') {
      // 'kv' keys contain individual kvStore entries
      if (value == null) {
        // Note '==' rather than '===': any nullish value implies deletion
        kernelStorage.kvStore.delete(subKey);
      } else {
        kernelStorage.kvStore.set(subKey, value);
      }
    } else if (tag === 'bundle') {
      // 'bundle' keys contain bundle IDs
      if (value == null) {
        bundleArtifacts.delete(key);
      } else {
        bundleArtifacts.set(key, value);
      }
    } else if (tag === 'transcript' || tag === 'snapshot') {
      // 'transcript' and 'snapshot' keys contain artifact description info.
      assert(value); // make TypeScript shut up
      const { vatID, isCurrent, pos } = parseVatArtifactExportKey(key);
      if (isCurrent) {
        const vatInfo = vatArtifacts.get(vatID) || {};
        if (tag === 'snapshot') {
          // `export.snapshot.{vatID}.current` directly identifies the current snapshot artifact
          vatInfo.snapshotKey = value;
        } else if (tag === 'transcript') {
          // `export.transcript.${vatID}.current` contains a metadata record for the current
          // state of the current transcript span as of the time of export
          const metadata = JSON.parse(value);
          vatInfo.transcriptKey = artifactKey(tag, vatID, metadata.startPos);
          artifactMetadata.set(vatInfo.transcriptKey, metadata);
        }
        vatArtifacts.set(vatID, vatInfo);
      } else {
        artifactMetadata.set(artifactKey(tag, vatID, pos), JSON.parse(value));
      }
    } else {
      Fail`unknown artifact type tag ${q(tag)} on import`;
    }
  }

  // At this point we should have acquired the entire KV store state, plus
  // sufficient metadata to identify the complete set of artifacts we'll need to
  // fetch along with the information required to validate each of them after
  // fetching.
  //
  // Depending on how the export was parameterized, the metadata may also include
  // information about historical artifacts that we might or might not actually
  // fetch depending on how this import was parameterized

  // Fetch the set of current artifacts.

  // Keep track of fetched artifacts in this set so we don't fetch them a second
  // time if we are trying for historical artifacts also.
  const fetchedArtifacts = new Set();

  for await (const [vatID, vatInfo] of vatArtifacts.entries()) {
    // For each vat, we *must* have a transcript span.  If this is not the very
    // first transcript span in the history of that vat, then we also must have
    // a snapshot for the state of the vat immediately prior to when the
    // transcript span begins.
    vatInfo.transcriptKey ||
      Fail`missing current transcript key for vat ${q(vatID)}`;
    const transcriptInfo = artifactMetadata.get(vatInfo.transcriptKey);
    transcriptInfo || Fail`missing transcript metadata for vat ${q(vatID)}`;
    let snapshotInfo;
    if (vatInfo.snapshotKey) {
      snapshotInfo = artifactMetadata.get(vatInfo.snapshotKey);
      snapshotInfo || Fail`missing snapshot metadata for vat ${q(vatID)}`;
    }
    if (!snapshotInfo) {
      transcriptInfo.startPos === 0 ||
        Fail`missing current snapshot for vat ${q(vatID)}`;
    } else {
      snapshotInfo.snapPos + 1 === transcriptInfo.startPos ||
        Fail`current transcript for vat ${q(vatID)} doesn't go with snapshot`;
      fetchedArtifacts.add(vatInfo.snapshotKey);
    }
    await (!snapshotInfo ||
      internal.snapStore.importSnapshot(
        vatInfo.snapshotKey,
        exporter,
        snapshotInfo,
      ));

    const transcriptArtifactName = `${vatInfo.transcriptKey}.${transcriptInfo.endPos}`;
    await internal.transcriptStore.importSpan(
      transcriptArtifactName,
      exporter,
      transcriptInfo,
    );
    fetchedArtifacts.add(transcriptArtifactName);
  }
  const bundleArtifactNames = Array.from(bundleArtifacts.keys()).sort();
  for await (const bundleArtifactName of bundleArtifactNames) {
    await internal.bundleStore.importBundle(
      bundleArtifactName,
      exporter,
      bundleArtifacts.get(bundleArtifactName),
    );
  }

  if (!includeHistorical) {
    await exporter.close();
    return store;
  }

  // If we're also importing historical artifacts, have the exporter enumerate
  // the complete set of artifacts it has and fetch all of them except for the
  // ones we've already fetched.
  for await (const artifactName of exporter.getArtifactNames()) {
    if (fetchedArtifacts.has(artifactName)) {
      continue;
    }
    let fetchedP;
    if (artifactName.startsWith('snapshot.')) {
      fetchedP = internal.snapStore.importSnapshot(
        artifactName,
        exporter,
        artifactMetadata.get(artifactName),
      );
    } else if (artifactName.startsWith('transcript.')) {
      // strip endPos off artifact name
      const metadataKey = artifactName.split('.').slice(0, 3).join('.');
      fetchedP = internal.transcriptStore.importSpan(
        artifactName,
        exporter,
        artifactMetadata.get(metadataKey),
      );
    } else if (artifactName.startsWith('bundle.')) {
      // already taken care of
      continue;
    } else {
      Fail`unknown artifact type: ${artifactName}`;
    }
    await fetchedP;
  }
  await exporter.close();
  return store;
}
