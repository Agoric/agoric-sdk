/**
 * @typedef {object} QueueStorage
 * @property {() => void} commit
 * @property {() => void} abort
 * @property {(key: string) => unknown} get
 * @property {(key: string, value: unknown) => void} set
 * @property {(key: string) => void} delete
 */

/**
 * Create a queue backed by some sort of scoped storage.
 *
 * The queue writes the following bare keys, and expect any prefixing/scoping
 * to be handled by the storage:
 * - `head`: the index of the first entry of the queue.
 * - `tail`: the index *past* the last entry in the queue.
 * - `<index>`: the contents of the queue at the given index.
 *
 * For the `actionQueue`, the Cosmos side of the queue will push into the queue,
 * updating `<prefix>tail` and `<prefix><index>`.  The JS side will shift the
 * queue, updating `<prefix>head` and reading and deleting `<prefix><index>`.
 *
 * Parallel access is not supported, only a single outstanding operation at a
 * time.
 *
 * @param {QueueStorage} storage a scoped queue storage
 */
export const makeQueue = storage => {
  const queue = {
    size: () => {
      const tail = storage.get('tail') || 0;
      const head = storage.get('head') || 0;
      return tail - head;
    },
    push: obj => {
      const tail = storage.get('tail') || 0;
      storage.set('tail', tail + 1);
      storage.set(`${tail}`, obj);
      storage.commit();
    },
    /** @type {Iterable<unknown>} */
    consumeAll: () => ({
      [Symbol.iterator]: () => {
        let done = false;
        let head = storage.get('head') || 0;
        const tail = storage.get('tail') || 0;
        return {
          next: () => {
            if (done) return { done };
            if (head < tail) {
              // Still within the queue.
              const headKey = `${head}`;
              const value = storage.get(headKey);
              storage.delete(headKey);
              head += 1;
              return { value, done };
            }
            // Reached the end, so clean up our indices.
            storage.delete('head');
            storage.delete('tail');
            storage.commit();
            done = true;
            return { done };
          },
          return: () => {
            if (done) return { done };
            // We're done consuming, so save our state.
            storage.set('head', head);
            storage.commit();
            done = true;
            return { done };
          },
          throw: err => {
            if (done) return { done };
            // Don't change our state.
            storage.abort();
            done = true;
            throw err;
          },
        };
      },
    }),
  };
  return queue;
};
harden(makeQueue);
