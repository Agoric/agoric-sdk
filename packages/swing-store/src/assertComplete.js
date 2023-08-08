/**
 * @param {import('./internal.js').SwingStoreInternal} internal
 * @param {'operational'} level
 * @returns {void}
 */
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
