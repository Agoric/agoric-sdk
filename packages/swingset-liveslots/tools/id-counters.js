const { Fail } = assert;

export const makeIDCounters = (
  syscall,
  initialIDCounters = { exportID: 1, collectionID: 1 },
) => {
  /** @type {Record<string, number>} */
  let idCounters;
  let idCountersAreDirty = false;

  function initializeIDCounters() {
    if (!idCounters) {
      // the saved value might be missing, or from an older liveslots
      // (with fewer counters), so merge it with our initial values
      const saved = JSON.parse(syscall.vatstoreGet('idCounters') || '{}');
      idCounters = { ...initialIDCounters, ...saved };
      idCountersAreDirty = true;
    }
  }

  function allocateNextID(name) {
    if (!idCounters) {
      // Normally `initializeIDCounters` would be called from startVat, but some
      // tests bypass that so this is a backstop.  Note that the invocation from
      // startVat is there to make vatStore access patterns a bit more
      // consistent from one vat to another, principally as a confusion
      // reduction measure in service of debugging; it is not a correctness
      // issue.
      initializeIDCounters();
    }
    const result = idCounters[name];
    result !== undefined || Fail`unknown idCounters[${name}]`;
    idCounters[name] += 1;
    idCountersAreDirty = true;
    return result;
  }

  function allocateExportID() {
    return allocateNextID('exportID');
  }

  function allocateCollectionID() {
    return allocateNextID('collectionID');
  }

  function flushIDCounters() {
    if (idCountersAreDirty) {
      syscall.vatstoreSet('idCounters', JSON.stringify(idCounters));
      idCountersAreDirty = false;
    }
  }

  return {
    allocateNextID,
    allocateExportID,
    allocateCollectionID,
    flushIDCounters,
    initializeIDCounters,
  };
};
