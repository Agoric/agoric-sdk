import { Fail, q } from '@endo/errors';
import { makePromiseKit } from '@endo/promise-kit';
import { M } from '@endo/patterns';
import { LogEntryShape } from './type-guards.js';
import { makeEphemera } from './ephemera.js';

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
 * @param {import('@agoric/base-zone').Zone} zone
 */
export const prepareLogStore = zone => {
  /**
   * @type {Ephemera<LogStore, {
   *           index: number
   *           replayDoneKit: import('@endo/promise-kit').PromiseKit<undefined>
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
      },
      dispose() {
        const { state, self } = this;
        tmp.resetFor(self);
        state.mapStore.clear();
      },
      getIndex() {
        const { self } = this;
        return tmp.for(self).index;
      },
      getLength() {
        const { state } = this;
        return state.mapStore.getSize();
      },
      isReplaying() {
        const { state, self } = this;
        return tmp.for(self).index < state.mapStore.getSize();
      },
      peekEntry() {
        const { state, self } = this;
        self.isReplaying() ||
          Fail`No longer replaying: ${q(tmp.for(self).index)} vs ${q(
            state.mapStore.getSize(),
          )}`;
        const result = state.mapStore.get(tmp.for(self).index);
        return result;
      },
      nextEntry() {
        const { self } = this;
        const result = self.peekEntry();
        tmp.for(self).index += 1;
        if (!self.isReplaying()) {
          tmp.for(self).replayDoneKit.resolve(undefined);
        }
        return result;
      },
      pushEntry(entry) {
        const { state, self } = this;
        !self.isReplaying() ||
          Fail`still replaying: ${q(tmp.for(self).index)} vs ${q(
            state.mapStore.getSize(),
          )}`;
        tmp.for(self).index === state.mapStore.getSize() ||
          Fail`internal: index confusion ${q(tmp.for(self).index)} vs ${q(
            state.mapStore.getSize(),
          )}`;
        state.mapStore.init(tmp.for(self).index, entry);
        tmp.for(self).index += 1;
        tmp.for(self).index === state.mapStore.getSize() ||
          Fail`internal: index confusion ${q(tmp.for(self).index)} vs ${q(
            state.mapStore.getSize(),
          )}`;
        return tmp.for(self).index;
      },
      dump() {
        const { state } = this;
        const len = state.mapStore.getSize();
        const result = [];
        for (let i = 0; i < len; i += 1) {
          result.push(state.mapStore.get(i));
        }
        return harden(result);
      },
      promiseReplayDone() {
        const { self } = this;
        return tmp.for(self).replayDoneKit.promise;
      },
    },
  );
};

/**
 * @typedef {ReturnType<ReturnType<prepareLogStore>>} LogStore
 */
