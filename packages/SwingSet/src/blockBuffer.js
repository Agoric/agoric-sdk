// buildBlockBuffer() is used by all hosts, to wrap whatever hostDB they use

// TODO rationalize naming pattern of buildFoo vs. makeFoo

/**
 * @typedef {Object} BlockBuffer
 * @property {HostDB} blockBuffer the wrapped hostDB
 * @property {() => void} commitBlock a function that will commit changes
 */

/**
 * Make a wrapper around a hostDB that accumulates changes in memory until
 * requested to commit them.
 *
 * @param {HostDB} hostDB  The hostDB object to be wrapped.
 * @returns {BlockBuffer} an object: {
 *      blockBuffer: HostDB,     // the wrapped hostDB
 *      commitBlock: () => void  // a function that will commit changes
 * }
 */
export function buildBlockBuffer(hostDB) {
  // to avoid confusion, additions and deletions should never share a key
  const additions = new Map();
  const deletions = new Set();

  const blockBuffer = {
    has(key) {
      if (additions.has(key)) {
        return true;
      }
      if (deletions.has(key)) {
        return false;
      }
      return hostDB.has(key);
    },

    *getKeys(start, end) {
      const keys = new Set(hostDB.getKeys(start, end));
      for (const k of additions.keys()) {
        keys.add(k);
      }
      for (const k of deletions.keys()) {
        keys.delete(k);
      }
      for (const k of Array.from(keys).sort()) {
        if (start <= k && k < end) {
          yield k;
        }
      }
    },

    get(key) {
      if (additions.has(key)) {
        return additions.get(key);
      }
      if (deletions.has(key)) {
        return undefined;
      }
      return hostDB.get(key);
    },

    set(key, value) {
      additions.set(key, value);
      deletions.delete(key);
    },

    delete(key) {
      additions.delete(key);
      deletions.add(key);
    },
  };

  function commitBlock() {
    const ops = [];
    for (const [key, value] of additions) {
      ops.push({ op: 'set', key, value });
    }
    for (const key of deletions) {
      ops.push({ op: 'delete', key });
    }
    hostDB.applyBatch(ops);
    additions.clear();
    deletions.clear();
  }

  return harden({ blockBuffer, commitBlock });
}
