/**
 * @param {import('./internal.js').SwingStoreInternal} internal
 * @param {import('./internal.js').ArtifactMode} artifactMode
 * @returns {void}
 */
export function assertComplete(internal, artifactMode) {
  // every bundle must be populated
  internal.bundleStore.assertComplete(artifactMode);

  // every 'isCurrent' transcript span must have all items
  // TODO: every vat with any data must have a isCurrent transcript
  // span
  internal.transcriptStore.assertComplete(artifactMode);

  // every 'inUse' snapshot must be populated
  internal.snapStore.assertComplete(artifactMode);

  // TODO: every isCurrent span that starts with load-snapshot has a
  // matching snapshot (counter-argument: swing-store should not know
  // those details about transcript entries)
}
