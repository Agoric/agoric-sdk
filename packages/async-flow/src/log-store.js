import { Fail, q } from '@endo/errors';
import { makePromiseKit } from '@endo/promise-kit';
import { M } from '@endo/patterns';
import { LogEntryShape } from './type-guards.js';
import { makeEphemera } from './ephemera.js';

/**
 * @import {PromiseKit} from '@endo/promise-kit'
 * @import {Zone} from '@agoric/base-zone'
 * @import {MapStore} from '@agoric/store';
 * @import {Ephemera, LogEntry} from './types.js';
 */

const LogStoreI = M.interface('LogStore', {
  reset: M.call().returns(),
  dispose: M.call().returns(),
  getUnfilteredIndex: M.call().returns(M.number()),
  getIndex: M.call().returns(M.number()),
  getLength: M.call().returns(M.number()),
  isReplaying: M.call().returns(M.boolean()),
  peekEntry: M.call().returns(LogEntryShape),
  nextEntry: M.call().returns(LogEntryShape),
  nextUnfilteredEntry: M.call().returns(LogEntryShape),
  pushEntry: M.call(LogEntryShape).returns(M.number()),
  dumpUnfiltered: M.call().returns(M.arrayOf(LogEntryShape)),
  dump: M.call().returns(M.arrayOf(LogEntryShape)),
  promiseReplayDone: M.call().returns(M.promise()),
});

/**
 * Get a generation number to use in `startGeneration` log entries.
 *
 * @param {Zone} zone
 * @returns {number}
 */
export const nextGeneration = zone => {
  /** @type {MapStore<'generation', number>} */
  const logStoreMetadata = zone.mapStore('LogStoreMetadata');
  const generationKey = 'generation';

  if (!logStoreMetadata.has(generationKey)) {
    const firstGen = 0;
    logStoreMetadata.init(generationKey, firstGen);
    return firstGen;
  }

  const nextGen = logStoreMetadata.get(generationKey) + 1;
  logStoreMetadata.set(generationKey, nextGen);
  return nextGen;
};

/**
 * A growable, replayable, sequence of `LogEntry`s.
 *
 * @param {Zone} zone
 */
export const prepareLogStore = zone => {
  /**
   * Ensure that any new or reset LogStore instance that (for a given
   * incarnation) pushes at least one entry will insert these entries first,
   * even if the log is reset, replayed, and pushed to in the same incarnation.
   * @type {LogEntry[]}
   */
  const initialPush = harden([['startGeneration', nextGeneration(zone)]]);

  /**
   * A predicate to indicate whether the entry is normally visible to the
   * LogStore user, or is a more internal entry that only is visible via the
   * Unfiltered methods.
   * @param {LogEntry} entry
   */
  const entryIsVisible = entry => entry[0] !== 'startGeneration';

  /**
   * @type {Ephemera<LogStore, {
   *           index: number;
   *           unfilteredIndex: number;
   *           initialPush: LogEntry[] | undefined;
   *           replayDoneKit: PromiseKit<undefined>;
   *        }>}
   */
  const tmp = makeEphemera(log => {
    const result = {
      index: 0,
      unfilteredIndex: 0,
      initialPush,
      replayDoneKit: makePromiseKit(),
    };
    if (log.getLength() === 0) {
      result.replayDoneKit.resolve(undefined);
    }
    return result;
  });

  return zone.exoClass(
    'LogStore',
    LogStoreI,
    () => {
      /**
       * Really used to emulate a zone-storable vector, i.e., what in
       * conventional JS you'd use a mutable array for, where you mutate
       * only by `.push`
       *
       * @type {MapStore<number, LogEntry>}
       */
      const mapStore = zone.detached().mapStore('logMapStore', {
        keyShape: M.number(),
        valueShape: LogEntryShape,
      });
      return {
        mapStore,
      };
    },
    {
      reset() {
        const { self } = this;
        tmp.resetFor(self);

        // TODO: Should we resolve replayDoneKit here, in case we're
        // transitioning to a Failed state, so that any pending watchers
        // can exit?
      },
      dispose() {
        const { state, self } = this;
        const { mapStore } = state;

        tmp.resetFor(self);
        mapStore.clear();
      },
      getUnfilteredIndex() {
        const { self } = this;
        const eph = tmp.for(self);

        return eph.unfilteredIndex;
      },
      getIndex() {
        const { self } = this;
        const eph = tmp.for(self);

        return eph.index;
      },
      getLength() {
        const { state } = this;
        const { mapStore } = state;

        return mapStore.getSize();
      },
      isReplaying() {
        const { state, self } = this;
        const { mapStore } = state;
        const eph = tmp.for(self);

        return eph.unfilteredIndex < mapStore.getSize();
      },
      /**
       * @returns {LogEntry}
       */
      peekEntry() {
        const { state, self } = this;
        const { mapStore } = state;
        const eph = tmp.for(self);

        self.isReplaying() ||
          Fail`No longer replaying: ${q(eph.unfilteredIndex)} vs ${q(
            mapStore.getSize(),
          )}`;
        const result = mapStore.get(eph.unfilteredIndex);
        return result;
      },
      /**
       * @returns {LogEntry}
       */
      nextUnfilteredEntry() {
        const { self } = this;
        const eph = tmp.for(self);

        const result = self.peekEntry();
        eph.unfilteredIndex += 1;
        if (entryIsVisible(result)) {
          eph.index += 1;
        }
        if (!self.isReplaying()) {
          eph.replayDoneKit.resolve(undefined);
        }
        return result;
      },
      /**
       * @returns {LogEntry}
       */
      nextEntry() {
        const { self } = this;
        let result = self.nextUnfilteredEntry();
        while (!entryIsVisible(result)) {
          self.isReplaying() || Fail`Unexpected entry at log tail: ${result}`;
          result = self.nextUnfilteredEntry();
        }
        return result;
      },
      /**
       * @param {LogEntry} latestEntry
       */
      pushEntry(latestEntry) {
        const { state, self } = this;

        const { mapStore } = state;
        const eph = tmp.for(self);

        !self.isReplaying() ||
          Fail`still replaying: ${q(eph.unfilteredIndex)} vs ${q(mapStore.getSize())}`;

        const pushOne = entry => {
          eph.unfilteredIndex === mapStore.getSize() ||
            Fail`internal: unfilteredIndex confusion ${q(eph.unfilteredIndex)} vs ${q(
              mapStore.getSize(),
            )}`;
          mapStore.init(eph.unfilteredIndex, entry);
          eph.unfilteredIndex += 1;
          if (entryIsVisible(entry)) {
            eph.index += 1;
          }
          eph.unfilteredIndex === mapStore.getSize() ||
            Fail`internal: unfilteredIndex confusion ${q(eph.unfilteredIndex)} vs ${q(
              mapStore.getSize(),
            )}`;
        };

        if (eph.initialPush) {
          const initialEntries = eph.initialPush;
          eph.initialPush = undefined;
          for (const initialEntry of initialEntries) {
            pushOne(initialEntry);
          }
        }
        pushOne(latestEntry);

        // console.log('LOG ENTRY ', eph.unfilteredIndex - 1, entry);
        return eph.unfilteredIndex;
      },
      /**
       * @returns {LogEntry[]}
       */
      dumpUnfiltered() {
        const { state } = this;
        const { mapStore } = state;
        const len = mapStore.getSize();
        const result = [];
        for (let i = 0; i < len; i += 1) {
          result.push(mapStore.get(i));
        }
        return harden(result);
      },
      dump() {
        const { self } = this;
        return harden(self.dumpUnfiltered().filter(entryIsVisible));
      },
      promiseReplayDone() {
        const { self } = this;
        const eph = tmp.for(self);

        return eph.replayDoneKit.promise;
      },
    },
  );
};

/**
 * @typedef {ReturnType<ReturnType<prepareLogStore>>} LogStore
 */
