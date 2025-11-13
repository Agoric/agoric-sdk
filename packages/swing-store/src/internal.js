import { Fail, q } from '@endo/errors';

/**
 * @import {KVStore} from './kvStore.js';
 */

/**
 * @import {SnapStoreInternal} from './snapStore.js';
 * @import {TranscriptStoreInternal} from './transcriptStore.js';
 * @import {BundleStoreInternal} from './bundleStore.js';
 *
 * @typedef {{
 *    dirPath: string | null,
 *    db: ReturnType<import('better-sqlite3')>,
 *    kvStore: KVStore,
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
