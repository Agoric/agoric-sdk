/**
 * @param {import('./internal.js').SwingStoreInternal} internal
 * @param {Omit<import('./internal.js').ArtifactMode, 'debug'>} checkMode
 * @returns {void}
 */
export function assertComplete(internal, checkMode) {
  // every bundle must be populated
  internal.bundleStore.assertComplete(checkMode);

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
