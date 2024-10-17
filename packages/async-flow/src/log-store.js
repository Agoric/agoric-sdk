import { Fail, q } from '@endo/errors';
import { makePromiseKit } from '@endo/promise-kit';
import { M } from '@endo/patterns';
import { LogEntryShape, START_GENERATION_OP_NAME } from './type-guards.js';
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
  pushEntry: M.call(LogEntryShape).returns(M.number()),
  dumpUnfiltered: M.call().returns(M.arrayOf(LogEntryShape)),
  dump: M.call().returns(M.arrayOf(LogEntryShape)),
  promiseReplayDone: M.call().returns(M.promise()),
});

/** @param {LogEntry} entry */
export const DEFAULT_ENTRY_FILTER_PREDICATE = harden(
  entry => entry[0] !== START_GENERATION_OP_NAME,
);

/**
 * A growable, replayable, sequence of `LogEntry`s.
 *
 * @param {Zone} zone
 * @param {object} [optMetadata]
 * @param {number} [optMetadata.generation]
 * @param {(entry: LogEntry) => any} [predicate] Return truthy for entries to expose to callers.
 */
export const prepareLogStore = (
  zone,
  optMetadata,
  predicate = DEFAULT_ENTRY_FILTER_PREDICATE,
) => {
  const { generation = 0 } = optMetadata || {};

  /**
   * Only prepend entries as part of the first pushEntry.
   * @type {LogEntry[] | undefined}
   */
  let prependedEntries = [[START_GENERATION_OP_NAME, generation]];

  /**
   * @type {Ephemera<LogStore, {
   *           filteredIndex: number;
   *           index: number;
   *           replayDoneKit: PromiseKit<undefined>;
   *        }>}
   */
  const tmp = makeEphemera(log => {
    const result = {
      filteredIndex: 0,
      index: 0,
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

        return eph.index;
      },
      getIndex() {
        const { self } = this;
        const eph = tmp.for(self);

        return eph.filteredIndex;
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

        return eph.index < mapStore.getSize();
      },
      /**
       * @returns {LogEntry}
       */
      peekEntry() {
        const { state, self } = this;
        const { mapStore } = state;
        const eph = tmp.for(self);

        const getVisibleEntry = () => {
          self.isReplaying() ||
            Fail`No longer replaying: ${q(eph.index)} vs ${q(
              mapStore.getSize(),
            )}`;

          const entry = mapStore.get(eph.index);
          if (!predicate(entry)) {
            eph.index += 1;
            if (!self.isReplaying()) {
              eph.replayDoneKit.resolve(undefined);
            }
            return undefined;
          }
          return entry;
        };

        let result = getVisibleEntry();
        while (!result) {
          result = getVisibleEntry();
        }

        return result;
      },
      /**
       * @returns {LogEntry}
       */
      nextEntry() {
        const { self } = this;
        const eph = tmp.for(self);

        const result = self.peekEntry();
        eph.index += 1;
        if (predicate(result)) {
          eph.filteredIndex += 1;
        }
        if (!self.isReplaying()) {
          eph.replayDoneKit.resolve(undefined);
        }
        return result;
      },
      /**
       * @param {LogEntry} entry
       */
      pushEntry(entry) {
        const { state, self } = this;
        if (prependedEntries) {
          // Atomically capture and undefine the prependedEntries.
          const ents = prependedEntries;
          prependedEntries = undefined;
          for (const ent of ents) {
            self.pushEntry(ent);
          }
        }

        const { mapStore } = state;
        const eph = tmp.for(self);

        !self.isReplaying() ||
          Fail`still replaying: ${q(eph.index)} vs ${q(mapStore.getSize())}`;
        eph.index === mapStore.getSize() ||
          Fail`internal: index confusion ${q(eph.index)} vs ${q(
            mapStore.getSize(),
          )}`;
        mapStore.init(eph.index, entry);
        eph.index += 1;
        if (predicate(entry)) {
          eph.filteredIndex += 1;
        }
        eph.index === mapStore.getSize() ||
          Fail`internal: index confusion ${q(eph.index)} vs ${q(
            mapStore.getSize(),
          )}`;
        // console.log('LOG ENTRY ', eph.index - 1, entry);
        return eph.index;
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
        return harden(self.dumpUnfiltered().filter(predicate));
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
