import { Fail, q } from '@endo/errors';

/**
 * @typedef { import('./snapStore.js').SnapStoreInternal } SnapStoreInternal
 * @typedef { import('./transcriptStore.js').TranscriptStoreInternal } TranscriptStoreInternal
 * @typedef { import('./bundleStore.js').BundleStoreInternal } BundleStoreInternal
 *
 * @typedef {{
 *    dirPath: string | null,
 *    db: ReturnType<import('better-sqlite3')>,
 *    kvStore: import('./kvStore.js').KVStore,
 *    transcriptStore: TranscriptStoreInternal,
 *    snapStore: SnapStoreInternal,
 *    bundleStore: BundleStoreInternal,
 * }} SwingStoreInternal
 *
 * @typedef {'operational' | 'replay' | 'archival' | 'debug'} ArtifactMode
 */

export const artifactModes = ['operational', 'replay', 'archival', 'debug'];
export function validateArtifactMode(artifactMode) {
  if (!artifactModes.includes(artifactMode)) {
    Fail`invalid artifactMode ${q(artifactMode)}`;
  }
}
