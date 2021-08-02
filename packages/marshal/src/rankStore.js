// @ts-check

import { Far } from './make-far.js';
import { mapIterable } from './helpers/iter-helpers.js';
import { assertPassable } from './passStyleOf.js';
import {
  assertRankSorted,
  FullRankCover,
  coveredEntries,
  getIndexCover,
  compareRank,
} from './rankOrder.js';

export const makeRankStore = (_elementName = 'element', _options = {}) => {
  const backingArray = [];
  let sortedCache;
  /** @type {RankStore} */
  const rankStore = harden({
    add: passable => {
      assertPassable(passable);
      sortedCache = undefined;
      backingArray.push(passable);
    },
    snapshot: () => {
      if (sortedCache === undefined) {
        backingArray.sort(compareRank);
        sortedCache = harden([...backingArray]);
        assertRankSorted(sortedCache, compareRank);
      }
      return sortedCache;
    },
    entries: (rankCover = FullRankCover) => {
      rankStore.snapshot();
      return coveredEntries(
        sortedCache,
        getIndexCover(sortedCache, compareRank, rankCover),
      );
    },
    keys: (rankCover = FullRankCover) =>
      mapIterable(rankStore.entries(rankCover), ([index, _]) => index),
    values: (rankCover = FullRankCover) =>
      mapIterable(rankStore.entries(rankCover), ([_, value]) => value),
    // eslint-disable-next-line no-use-before-define
    readOnlyView: () => readOnlyStore,
  });

  const readOnlyStore = harden({
    snapshot: rankStore.snapshot,
    entries: rankStore.entries,
    keys: rankStore.keys,
    values: rankStore.values,
    readOnlyView: rankStore.readOnlyView,
  });
  return rankStore;
};
harden(makeRankStore);

export const makeRankStoreFactoryKit = () => {
  const backingStore = makeRankStore('backingElements');
  let rankStoreCount = 0;
  const makeVirtualRankStore = (_elementName = 'element', _options = {}) => {
    const label = rankStoreCount;
    rankStoreCount += 1;
    let snapshotCache;
    /** @type {RankStore} */
    const virtualRankStore = Far(`virtual rank store ${label}`, {
      add: passable => {
        snapshotCache = undefined;
        backingStore.add([label, passable]);
      },
      entries: (rankCover = FullRankCover) => {
        const backingEntries = backingStore.entries(harden([label, rankCover]));
        let offset;
        return mapIterable(
          backingEntries,
          ([backingIndex, [backingLabel, passable]]) => {
            if (offset === undefined) {
              offset = backingIndex;
            }
            const index = backingIndex - offset;
            assert(backingLabel === label);
            return [index, passable];
          },
        );
      },
      keys: (rankCover = FullRankCover) =>
        mapIterable(virtualRankStore.entries(rankCover), ([index, _]) => index),
      values: (rankCover = FullRankCover) =>
        mapIterable(virtualRankStore.entries(rankCover), ([_, value]) => value),
      snapshot: () => {
        if (snapshotCache === undefined) {
          snapshotCache = harden([...virtualRankStore.values()]);
        }
        return snapshotCache;
      },
      // eslint-disable-next-line no-use-before-define
      readOnlyView: () => readOnlyStore,
    });

    const readOnlyStore = harden({
      snapshot: virtualRankStore.snapshot,
      entries: virtualRankStore.entries,
      keys: virtualRankStore.keys,
      values: virtualRankStore.values,
      readOnlyView: virtualRankStore.readOnlyView,
    });
    return virtualRankStore;
  };

  // We include the readOnlyBackingStore only for testing.
  // It is readOnly though, so that returning it does not violate
  // defensive consistency. It should not enable the caller to
  // violate the invariants that makeVirtualRankStore relies on.
  // Note that the readOnlyBackingStore is not powerless. It may still contain
  // powerful objects such as remotables and promises.
  const readOnlyBackingStore = backingStore.readOnlyView();
  return { makeVirtualRankStore, readOnlyBackingStore };
};
harden(makeRankStoreFactoryKit);
