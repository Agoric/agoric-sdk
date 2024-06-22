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
  getIndex: M.call().returns(M.number()),
  getLength: M.call().returns(M.number()),
  isReplaying: M.call().returns(M.boolean()),
  peekEntry: M.call().returns(LogEntryShape),
  nextEntry: M.call().returns(LogEntryShape),
  pushEntry: M.call(LogEntryShape).returns(M.number()),
  dump: M.call().returns(M.arrayOf(LogEntryShape)),
  promiseReplayDone: M.call().returns(M.promise()),
});

/**
 * A growable, replayable, sequence of `LogEntry`s.
 *
 * @param {Zone} zone
 */
export const prepareLogStore = zone => {
  /**
   * @type {Ephemera<LogStore, {
   *           index: number
   *           replayDoneKit: PromiseKit<undefined>
   *        }>}
   */
  const tmp = makeEphemera(log => {
    const result = {
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

        return eph.index < mapStore.getSize();
      },
      peekEntry() {
        const { state, self } = this;
        const { mapStore } = state;
        const eph = tmp.for(self);

        self.isReplaying() ||
          Fail`No longer replaying: ${q(eph.index)} vs ${q(
            mapStore.getSize(),
          )}`;
        const result = mapStore.get(eph.index);
        return result;
      },
      nextEntry() {
        const { self } = this;
        const eph = tmp.for(self);

        const result = self.peekEntry();
        eph.index += 1;
        if (!self.isReplaying()) {
          eph.replayDoneKit.resolve(undefined);
        }
        return result;
      },
      pushEntry(entry) {
        const { state, self } = this;
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
        eph.index === mapStore.getSize() ||
          Fail`internal: index confusion ${q(eph.index)} vs ${q(
            mapStore.getSize(),
          )}`;
        // console.log('LOG ENTRY ', eph.index - 1, entry);
        return eph.index;
      },
      dump() {
        const { state } = this;
        const { mapStore } = state;
        const len = mapStore.getSize();
        const result = [];
        for (let i = 0; i < len; i += 1) {
          result.push(mapStore.get(i));
        }
        return harden(result);
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
