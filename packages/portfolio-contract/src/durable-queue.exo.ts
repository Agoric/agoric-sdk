/**
 * @file Durable queue helper backed by a durable map and index pointers.
 * @see {prepareDurableQueue}
 */
// (No failure conditions during construction now; previously used for index validation.)
import { M } from '@endo/patterns';
import type { MapStore, StoreOptions } from '@agoric/store';
import type { Zone } from '@agoric/zone';

/**
 * Internal durable state for a queue instance. Head and tail are bigint indices
 * pointing to the next element to dequeue and the next free slot respectively.
 * The invariant head <= tail is maintained; an empty queue has head === tail.
 */
export type DurableQueueState<V> = {
  /** Map from monotonically increasing index → stored value. */
  readonly entries: MapStore<bigint, V>;
  /** Index of the current front element (next to dequeue), or tail if empty. */
  head: bigint;
  /** Index that will be assigned to the next enqueued element. */
  tail: bigint;
};

export type DurableQueue<V> = ReturnType<
  ReturnType<typeof prepareDurableQueue<V>>
>;

/**
 * Prepare a durable FIFO queue class specialized to the provided value shape.
 * Each instantiation creates a separate durable map store keyed by bigint indices.
 *
 * @template V Type of each queued value.
 * @param zone durable zone providing allocation APIs.
 * @param queueName logical name for the exo class (also used for interface pattern).
 * @param options optional store configuration (e.g. valueShape for pattern matching).
 * @returns A maker function which, when invoked with a store name, yields a queue instance
 */
export const prepareDurableQueue = <V>(
  zone: Zone,
  queueName: string,
  options: StoreOptions = {},
) => {
  const collections = zone.detached();

  const indicesShape = M.splitRecord(
    {
      head: M.nat(),
      tail: M.nat(),
    },
    {},
  );

  const itemShape = options.valueShape || M.any();

  return zone.exoClass(
    queueName,
    M.interface(queueName, {
      /**
       * Enqueue a value at the tail of the queue.
       * @param value The value to store (must match valueShape if provided).
       * @returns undefined (side-effect: queue length increases by 1).
       */
      enqueue: M.call(itemShape).returns(M.undefined()),
      /**
       * Remove and return the value at the head of the queue.
       * @returns The dequeued value, or undefined if the queue is empty.
       */
      dequeue: M.call().returns(M.opt(itemShape)),
      /**
       * Return (without removing) the value at the head of the queue.
       * @returns The front value, or undefined if the queue is empty.
       */
      peek: M.call().returns(M.opt(itemShape)),
      /**
       * Test whether the queue is empty.
       * @returns true if empty; false otherwise.
       */
      isEmpty: M.call().returns(M.boolean()),
      /**
       * Number of elements currently enqueued.
       * @returns The queue length as a JavaScript number.
       */
      size: M.call().returns(M.number()),
      /**
       * Remove all entries, resetting indices to zero.
       * @returns undefined (side-effect: queue becomes empty).
       */
      clear: M.call().returns(M.undefined()),
      /**
       * Obtain the current head and tail indices for diagnostics.
       * @returns A record { head, tail } of bigint indices.
       */
      getIndices: M.call().returns(indicesShape),
    }),
    (storeName: string): DurableQueueState<V> => {
      // Always start empty; head and tail are zero.
      const entries = collections.mapStore<bigint, V>(storeName, {
        keyShape: M.nat(),
        ...options,
      });
      return {
        entries,
        head: 0n,
        tail: 0n,
      };
    },
    {
      /**
       * Enqueue a value at the logical tail position; assigns current tail index
       * then increments tail.
       * @param value The value to enqueue.
       * @returns undefined.
       */
      enqueue(value: V) {
        const { state } = this;
        state.entries.init(state.tail, value);
        state.tail += 1n;
      },
      /**
       * Dequeue the front value if present by reading and deleting the head index
       * then incrementing head.
       * @returns The dequeued value or undefined if empty.
       */
      dequeue() {
        const { state } = this;
        if (state.head === state.tail) {
          return undefined;
        }
        const index = state.head;
        const value = state.entries.get(index);
        state.entries.delete(index);
        state.head += 1n;
        return value;
      },
      /**
       * Return the front value without removing it.
       * @returns The front value or undefined if empty.
       */
      peek() {
        const { state } = this;
        if (state.head === state.tail) {
          return undefined;
        }
        return state.entries.get(state.head);
      },
      /**
       * Determine whether the queue contains no elements.
       * @returns true if empty; false otherwise.
       */
      isEmpty() {
        const { head, tail } = this.state;
        return head === tail;
      },
      /**
       * Compute the number of queued elements as (tail - head).
       * @returns The element count as a number.
       */
      size() {
        const { head, tail } = this.state;
        return Number(tail - head);
      },
      /**
       * Empty the queue by clearing the underlying map store and resetting indices.
       * @returns undefined.
       */
      clear() {
        this.state.entries.clear();
        this.state.head = 0n;
        this.state.tail = 0n;
      },
      /**
       * Provide current head and tail indices for debugging or monitoring.
       * @returns Hardened record { head, tail }.
       */
      getIndices() {
        const { head, tail } = this.state;
        return harden({ head, tail });
      },
    },
  );
};
