import { Fail, q } from '@endo/errors';

/**
 * @import {SnapStoreInternal} from './snapStore.js';
 * @import {TranscriptStoreInternal} from './transcriptStore.js';
 * @import {BundleStoreInternal} from './bundleStore.js';
 * @import {KVStore} from '@agoric/internal/src/kv-store.js';
 * @import {Database} from 'better-sqlite3';
 */

/**
 * @typedef {{
 *    dirPath: string | null,
 *    db: Database,
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
