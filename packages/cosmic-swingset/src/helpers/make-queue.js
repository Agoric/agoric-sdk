// @ts-check

import { Fail } from '@endo/errors';

/**
 * @typedef {object} QueueStorage
 * @property {() => void} commit
 * @property {() => void} abort
 * @property {(key: string) => string | undefined} get
 * @property {(key: string, value: string) => void} set
 * @property {(key: string) => void} delete
 */

/**
 * @typedef {{[idx: number]: string | undefined, head?: string, tail?: string}} QueueStorageDump
 * @param {QueueStorageDump} [init]
 * @returns {{storage: QueueStorage; dump: () => QueueStorageDump}}
 */
export const makeQueueStorageMock = init => {
  const storage = new Map(init && Object.entries(init));
  return harden({
    storage: {
      get(key) {
        return storage.get(key);
      },
      set(key, value) {
        typeof value === 'string' || Fail`invalid value type ${value}`;
        storage.set(key, value);
      },
      delete(key) {
        storage.delete(key);
      },
      commit() {},
      abort() {},
    },
    dump: () => harden(Object.fromEntries(storage.entries())),
  });
};

/**
 * Create a queue backed by some sort of scoped storage.
 *
 * The queue writes the following bare keys, and expect any prefixing/scoping
 * to be handled by the storage:
 * - `head`: the index of the first entry of the queue.
 * - `tail`: the index *past* the last entry in the queue.
 * - `<index>`: the contents of the queue at the given index.
 *
 * For the cosmos inbound queues (`actionQueue` or `highPriorityQueue`), the
 * golang side will push into the queue, updating the index stored at key
 * `${queuePath}.tail` and setting data for key `${queuePath}.${index}`.
 * The JS side will shift the queue, updating the index at key
 * `${queuePath}.head` and reading and deleting `${queuePath}.${index}`.
 *
 * Parallel access is not supported, only a single outstanding operation at a
 * time.
 *
 * @template {unknown} [T=unknown]
 * @param {QueueStorage} storage a scoped queue storage
 */
export const makeQueue = storage => {
  const getHead = () => BigInt(storage.get('head') || 0);
  const getTail = () => BigInt(storage.get('tail') || 0);

  /** @type {IterableIterator<T> | null} */
  let currentIterator = null;
  const queue = {
    size: () => {
      return Number(getTail() - getHead());
    },
    /** @param {T} obj */
    push: obj => {
      const tail = getTail();
      storage.set('tail', String(tail + 1n));
      storage.set(`${tail}`, JSON.stringify(obj));
      storage.commit();
      currentIterator = null;
    },
    /** @returns {IterableIterator<T>} */
    consumeAll: () => {
      let head = getHead();
      const tail = getTail();
      let done = !(head < tail);
      const iterator = {
        [Symbol.iterator]: () => iterator,
        next: () => {
          currentIterator === iterator || Fail`invalid iterator`;
          if (!done) {
            if (head < tail) {
              // Still within the queue.
              const headKey = `${head}`;
              const value = JSON.parse(
                /** @type {string} */ (storage.get(headKey)),
              );
              storage.delete(headKey);
              head += 1n;
              return { value, done };
            }
            // Reached the end, so clean up our indices.
            storage.delete('head');
            storage.delete('tail');
            storage.commit();
            done = true;
          }
          return { value: undefined, done };
        },
        return: () => {
          currentIterator === iterator || Fail`invalid iterator`;
          if (!done) {
            // We're done consuming, so save our state.
            storage.set('head', String(head));
            storage.commit();
            done = true;
          }
          return { value: undefined, done };
        },
        throw: err => {
          currentIterator === iterator || Fail`invalid iterator`;
          if (!done) {
            // Don't change our state.
            storage.abort();
            done = true;
            throw err;
          }
          return { value: undefined, done };
        },
      };
      currentIterator = iterator;
      return iterator;
    },
  };
  return queue;
};
harden(makeQueue);
