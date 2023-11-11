// no-lonely-if is a stupid rule that really should be disabled globally
/* eslint-disable no-lonely-if */

import { assert } from '@agoric/assert';
import { initEmpty, M } from '@agoric/store';
import { E } from '@endo/eventual-send';
import { parseVatSlot } from './parseVatSlots.js';

/**
 * @param {object} options
 * @param {*} options.syscall
 * @param {import('./virtualReferences.js').VirtualReferenceManager} options.vrm
 * @param {import('./virtualObjectManager.js').VirtualObjectManager} options.vom
 * @param {*} options.collectionManager
 * @param {import('@endo/marshal').ConvertValToSlot<any>} options.convertValToSlot
 * @param {import('@endo/marshal').ConvertSlotToVal<any>} options.convertSlotToVal
 * @param {(vref: any) => boolean} options.maybeExportPromise
 */
export function makeWatchedPromiseManager({
  syscall,
  vrm,
  vom,
  collectionManager,
  convertValToSlot,
  convertSlotToVal,
  maybeExportPromise,
}) {
  const { makeScalarBigMapStore } = collectionManager;
  const { defineDurableKind } = vom;

  // virtual Store (not durable) mapping vpid to Promise objects, to
  // maintain the slotToVal registration until resolution. Without
  // this, slotToVal would forget local Promises that aren't exported.
  let promiseRegistrations;

  // watched promises by vpid: each entry is an array of watches on the
  // corresponding vpid; each of these is in turn an array of a watcher object
  // and the arguments associated with it by `watchPromise`.
  let watchedPromiseTable;

  // defined promise watcher objects indexed by kindHandle
  let promiseWatcherByKindTable;

  function preparePromiseWatcherTables() {
    promiseRegistrations = makeScalarBigMapStore('promiseRegistrations');
    let watcherTableID = syscall.vatstoreGet('watcherTableID');
    if (watcherTableID) {
      promiseWatcherByKindTable = convertSlotToVal(watcherTableID);
    } else {
      promiseWatcherByKindTable = makeScalarBigMapStore(
        'promiseWatcherByKind',
        { durable: true },
      );
      watcherTableID = convertValToSlot(promiseWatcherByKindTable);
      syscall.vatstoreSet('watcherTableID', watcherTableID);
      // artificially increment the table's refcount so it never gets GC'd
      vrm.addReachableVref(watcherTableID);
    }

    let watchedPromiseTableID = syscall.vatstoreGet('watchedPromiseTableID');
    if (watchedPromiseTableID) {
      watchedPromiseTable = convertSlotToVal(watchedPromiseTableID);
    } else {
      watchedPromiseTable = makeScalarBigMapStore('watchedPromises', {
        keyShape: M.string(), // key is always a vpid
        durable: true,
      });
      watchedPromiseTableID = convertValToSlot(watchedPromiseTable);
      syscall.vatstoreSet('watchedPromiseTableID', watchedPromiseTableID);
      // artificially increment the table's refcount so it never gets GC'd
      vrm.addReachableVref(watchedPromiseTableID);
    }
  }

  /**
   *
   * @param {Promise<unknown>} p
   * @param {string} vpid
   */
  function pseudoThen(p, vpid) {
    function settle(value, wasFulfilled) {
      const watches = watchedPromiseTable.get(vpid);
      watchedPromiseTable.delete(vpid);
      promiseRegistrations.delete(vpid);
      for (const watch of watches) {
        const [watcher, ...args] = watch;
        void Promise.resolve().then(() => {
          if (wasFulfilled) {
            if (watcher.onFulfilled) {
              watcher.onFulfilled(value, ...args);
            }
          } else {
            if (watcher.onRejected) {
              watcher.onRejected(value, ...args);
            } else {
              throw value; // for host's unhandled rejection handler to catch
            }
          }
        });
      }
    }

    void E.when(
      p,
      res => settle(res, true),
      rej => settle(rej, false),
    );
  }

  /**
   * Revives watched promises.
   *
   * @param {(vref: any) => Promise<any>} revivePromise
   * @returns {void}
   */
  function loadWatchedPromiseTable(revivePromise) {
    for (const vpid of watchedPromiseTable.keys()) {
      const p = revivePromise(vpid);
      promiseRegistrations.init(vpid, p);
      pseudoThen(p, vpid);
    }
  }

  function providePromiseWatcher(
    kindHandle,
    fulfillHandler = x => x,
    rejectHandler = x => {
      throw x;
    },
  ) {
    assert.typeof(fulfillHandler, 'function');
    assert.typeof(rejectHandler, 'function');

    const makeWatcher = defineDurableKind(kindHandle, initEmpty, {
      // @ts-expect-error  TS is confused by the spread operator
      onFulfilled: (_context, res, ...args) => fulfillHandler(res, ...args),
      // @ts-expect-error
      onRejected: (_context, rej, ...args) => rejectHandler(rej, ...args),
    });

    if (promiseWatcherByKindTable.has(kindHandle)) {
      return promiseWatcherByKindTable.get(kindHandle);
    } else {
      const watcher = makeWatcher();
      promiseWatcherByKindTable.init(kindHandle, watcher);
      return watcher;
    }
  }

  /**
   *
   * @param {Promise} p
   * @param {{onFulfilled?: Function, onRejected?: Function}} watcher
   * @param  {...any} args
   */
  function watchPromise(p, watcher, ...args) {
    // The following wrapping defers setting up the promise watcher itself to a
    // later turn so that if the promise to be watched was the return value from
    // a preceding eventual message send, then the assignment of a vpid to that
    // promise, which happens in a turn after the initiation of the send, will
    // have happened by the time the code below executes, and thus when we call
    // `convertValToSlot` on the promise here we'll get back the vpid that was
    // assigned rather than generating a new one that nobody knows about.

    // TODO: add vpid->p virtual table mapping, to keep registration alive
    // TODO: remove mapping upon resolution
    //  maybe check importedVPIDs here and add to table if !has
    void Promise.resolve().then(() => {
      const watcherVref = convertValToSlot(watcher);
      assert(watcherVref, 'invalid watcher');
      const { virtual, durable } = parseVatSlot(watcherVref);
      assert(virtual || durable, 'promise watcher must be a virtual object');
      if (watcher.onFulfilled) {
        assert.typeof(watcher.onFulfilled, 'function');
      }
      if (watcher.onRejected) {
        assert.typeof(watcher.onRejected, 'function');
      }
      assert(
        watcher.onFulfilled || watcher.onRejected,
        'promise watcher must implement at least one handler method',
      );

      const vpid = convertValToSlot(p);
      assert(vpid, 'invalid promise');
      const { type } = parseVatSlot(vpid);
      assert(type === 'promise', 'watchPromise only watches promises');
      if (watchedPromiseTable.has(vpid)) {
        const watches = watchedPromiseTable.get(vpid);
        watchedPromiseTable.set(vpid, harden([...watches, [watcher, ...args]]));
      } else {
        watchedPromiseTable.init(vpid, harden([[watcher, ...args]]));

        // Ensure that this vat's promises are rejected at termination.
        if (maybeExportPromise(vpid)) {
          syscall.subscribe(vpid);
        }

        promiseRegistrations.init(vpid, p);
        pseudoThen(p, vpid);
      }
    });
  }

  return harden({
    preparePromiseWatcherTables,
    loadWatchedPromiseTable,
    providePromiseWatcher,
    watchPromise,
  });
}
