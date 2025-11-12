/**
 * @param {Pick<SwingStoreInternal, 'bundleStore' | 'transcriptStore' | 'snapStore'>} internal
 * @param {Exclude<ArtifactMode, 'debug'>} checkMode
 * @returns {void}
 */
export function assertComplete(internal, checkMode) {
  // every bundle must be populated
  internal.bundleStore.assertComplete(checkMode);

  /**
   * @import {SwingStoreInternal} from './internal.js';
   * @import {ArtifactMode} from './internal.js';
   */

  // every 'isCurrent' transcript span must have all items
  // TODO: every vat with any data must have a isCurrent transcript
  // span
  internal.transcriptStore.assertComplete(checkMode);

  // every 'inUse' snapshot must be populated
  internal.snapStore.assertComplete(checkMode);

  // TODO: every isCurrent span that starts with load-snapshot has a
  // matching snapshot (counter-argument: swing-store should not know
  // those details about transcript entries)
}
