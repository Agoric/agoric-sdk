/**
 * @file Durable queue helper backed by a durable map and index pointers.
 */
import { Fail } from '@endo/errors';
import { M } from '@endo/patterns';
import type { MapStore, StoreOptions } from '@agoric/store';
import type { Zone } from '@agoric/zone';

export type DurableQueueState<V> = {
  readonly entries: MapStore<bigint, V>;
  head: bigint;
  tail: bigint;
};

export type DurableQueue<V> = ReturnType<
  ReturnType<typeof prepareDurableQueue<V>>
>;

export const prepareDurableQueue = <V>(
  zone: Zone,
  queueName: string,
  options: StoreOptions = {},
) => {
  const collections = zone.detached();

  const indicesShape = M.splitRecord(
    {
      head: M.bigint(),
      tail: M.bigint(),
    },
    {},
  );

  const entryShape = M.splitRecord(
    {
      index: M.bigint(),
      value: options.valueShape || M.any(),
    },
    {},
  );

  const apiShape = options.valueShape || M.any();

  return zone.exoClass(
    queueName,
    M.interface(queueName, {
      enqueue: M.call(apiShape).returns(M.undefined()),
      dequeue: M.call().returns(M.opt(apiShape)),
      peek: M.call().returns(M.opt(apiShape)),
      isEmpty: M.call().returns(M.boolean()),
      size: M.call().returns(M.number()),
      clear: M.call().returns(M.undefined()),
      getIndices: M.call().returns(indicesShape),
      entries: M.call().returns(M.arrayOf(entryShape)),
    }),
    (
      storeName: string,
      { head = 0n, tail = head }: { head?: bigint; tail?: bigint } = {},
    ): DurableQueueState<V> => {
      tail >= head || Fail`initial tail ${tail} must be >= head ${head}`;
      const entries = collections.mapStore<bigint, V>(storeName, {
        keyShape: M.bigint(),
        ...options,
      });
      return {
        entries,
        head,
        tail,
      };
    },
    {
      enqueue(value: V) {
        const { state } = this;
        state.entries.init(state.tail, value);
        state.tail += 1n;
      },
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
      peek() {
        const { state } = this;
        if (state.head === state.tail) {
          return undefined;
        }
        return state.entries.get(state.head);
      },
      isEmpty() {
        const { head, tail } = this.state;
        return head === tail;
      },
      size() {
        const { head, tail } = this.state;
        return Number(tail - head);
      },
      clear() {
        this.state.entries.clear();
        this.state.head = 0n;
        this.state.tail = 0n;
      },
      getIndices() {
        const { head, tail } = this.state;
        return harden({ head, tail });
      },
      entries() {
        // TODO why doesn't this work?
        // return harden(Array.from(this.state.entries.entries()));
        const snapshot: Array<{ index: bigint; value: V }> = [];
        for (const [index, value] of this.state.entries.entries()) {
          snapshot.push({ index, value });
        }
        // snapshot.sort((left, right) => {
        //   if (left.index === right.index) {
        //     return 0;
        //   }
        //   return left.index < right.index ? -1 : 1;
        // });
        return harden(snapshot);
      },
    },
  );
};
