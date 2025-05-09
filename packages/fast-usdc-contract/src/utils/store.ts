import { Fail } from '@endo/errors';
import type { Key } from '@endo/patterns';
import type { MapStore } from '@agoric/store';

// TODO provide something like this in a more common place, perhaps as a BagStore
/**
 * Creates a bag (multi-set) API that wraps a MapStore where values are counts.
 *
 * @template {Key} K
 * @param {MapStore<K, number>} mapStore
 */
export const asMultiset = <K extends Key>(mapStore: MapStore<K, number>) =>
  harden({
    /**
     * Add an item to the bag, incrementing its count.
     *
     * @param {K} item The item to add
     * @param {number} [count] How many to add (defaults to 1)
     */
    add: (item: K, count = 1) => {
      (count > 0 && Number.isInteger(count)) ||
        Fail`Cannot add a non-positive integer count ${count} to bag`;

      if (mapStore.has(item)) {
        const currentCount = mapStore.get(item);
        mapStore.set(item, currentCount + count);
      } else {
        mapStore.init(item, count);
      }
    },

    /**
     * Remove an item from the bag, decrementing its count. If count reaches
     * zero, the item is removed completely.
     *
     * @param {K} item The item to remove
     * @param {number} [count] How many to remove (defaults to 1)
     * @returns {boolean} Whether the removal was successful
     * @throws {Error} If trying to remove more items than exist
     */
    remove: (item: K, count = 1): boolean => {
      (count > 0 && Number.isInteger(count)) ||
        Fail`Cannot remove a non-positive integer count ${count} from bag`;

      if (!mapStore.has(item)) {
        return false;
      }

      const currentCount = mapStore.get(item);
      if (currentCount < count) {
        return false;
      }

      if (currentCount === count) {
        mapStore.delete(item);
      } else {
        mapStore.set(item, currentCount - count);
      }
      return true;
    },

    /**
     * Get the count of an item in the bag.
     *
     * @param {K} item The item to check
     * @returns {number} The count (0 if not present)
     */
    count: (item: K): number => {
      return mapStore.has(item) ? mapStore.get(item) : 0;
    },

    /**
     * Check if the bag contains at least one of the item.
     *
     * @param {K} item The item to check
     * @returns {boolean} Whether the item is in the bag
     */
    has: (item: K): boolean => {
      return mapStore.has(item);
    },

    /**
     * Get all unique items in the bag.
     *
     * @returns {Iterable<K>} Iterable of unique items
     */
    keys: (): Iterable<K> => {
      return mapStore.keys();
    },

    /**
     * Get all entries (item, count) in the bag.
     *
     * @returns {Iterable<[K, number]>} Iterable of [item, count] pairs
     */
    entries: (): Iterable<[K, number]> => {
      return mapStore.entries();
    },

    /**
     * Get the total number of unique items in the bag.
     *
     * @returns {number} Number of unique items
     */
    size: (): number => {
      return mapStore.getSize();
    },

    /**
     * Remove all items from the bag.
     */
    clear: () => {
      mapStore.clear();
    },
  });

/**
 * Append `item` to the array held at `key`, keeping it **sorted** according
 * to `compare`.  Uses a simple linear scan – clearer than a binary search and
 * plenty fast for small lists.
 *
 * Stable‑after: duplicates are inserted *after* existing equal elements.
 *
 * @template K - Type of keys in the map store
 * @template V - Type of values in the arrays stored in the map
 */
export const appendToSortedStoredArray = <K, V>(
  mapStore: MapStore<K, V[]>,
  key: K,
  item: V,
  compare: (a: V, b: V) => number = defaultCompareDesc as any,
): void => {
  if (!mapStore.has(key)) {
    mapStore.init(key, harden([item]));
    return;
  }

  const cur = mapStore.get(key);

  // linear scan to find insertion index
  let i = cur.length;
  while (i > 0 && compare(item, cur[i - 1]) < 0) {
    i -= 1;
  }

  const next = [...cur];
  next.splice(i, 0, item); // insert after any equal items
  mapStore.set(key, harden(next));
};
harden(appendToSortedStoredArray);

/**
 * Default ascending comparator for numbers, bigints, and strings.
 */
const defaultCompareDesc = <T extends bigint | number | string>(
  a: T,
  b: T,
): number => {
  if (a < b) return 1;
  else if (a > b) return -1;
  else return 0;
};
harden(defaultCompareDesc);
