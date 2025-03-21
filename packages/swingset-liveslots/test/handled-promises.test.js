import test from 'ava';

import { Fail } from '@endo/errors';
import { Far } from '@endo/marshal';
import { M } from '@agoric/store';
import { makePromiseKit } from '@endo/promise-kit';
// Disabled to avoid circular dependencies.
// import { makeStoreUtils } from '@agoric/vat-data/src/vat-data-bindings.js';
// import { makeExoUtils } from '@agoric/vat-data/src/exo-utils.js';
import { kslot, kser } from '@agoric/kmarshal';
import { setupTestLiveslots } from './liveslots-helpers.js';
import { makeResolve, makeReject } from './util.js';
import { makeExoUtils } from './exo-utils.js';

// eslint-disable-next-line no-unused-vars
const compareEntriesByKey = ([ka], [kb]) => (ka < kb ? -1 : 1);

// cf. packages/SwingSet/test/vat-durable-promise-watcher.js
const buildPromiseWatcherRootObject = (vatPowers, vatParameters, baggage) => {
  const { VatData } = vatPowers;
  const { watchPromise } = VatData;
  const { prepareExo } = makeExoUtils(VatData);
  // const { makeScalarBigMapStore } = makeStoreUtils(VatData);
  const PromiseWatcherI = M.interface('ExtraArgPromiseWatcher', {
    onFulfilled: M.call(M.any(), M.string()).returns(),
    onRejected: M.call(M.any(), M.string()).returns(),
  });
  const watchResolutions = new Map();
  const watcher = prepareExo(
    baggage,
    // No longer ignoring, but the name is set in stone in `kvStoreDataV1`
    'DurablePromiseIgnorer',
    PromiseWatcherI,
    {
      onFulfilled(value, name) {
        watchResolutions.set(name, { status: 'fulfilled', value });
      },
      onRejected(reason, name) {
        watchResolutions.set(name, { status: 'rejected', reason });
      },
    },
  );

  const knownPromises = new Map();

  const root = Far('root', {
    getPromise: name => {
      knownPromises.has(name) || Fail`promise not found: ${name}`;
      const { promise } = knownPromises.get(name);
      return { promise };
    },
    importPromise: (name, promise) => {
      !knownPromises.has(name) || Fail`promise already exists: ${name}`;
      knownPromises.set(name, { promise });
      return `imported promise: ${name}`;
    },
    createLocalPromise: (name, fulfillment, rejection) => {
      !knownPromises.has(name) || Fail`promise already exists: ${name}`;
      const { promise, resolve, reject } = makePromiseKit();
      let resolvers = {};
      if (fulfillment !== undefined) {
        resolve(fulfillment);
      } else if (rejection !== undefined) {
        reject(rejection);
      } else {
        resolvers = { resolve, reject };
      }
      knownPromises.set(name, { promise, ...resolvers });
      return `created local promise: ${name}`;
    },
    resolveLocalPromise: (name, rejection, value) => {
      knownPromises.has(name) || Fail`promise not found: ${name}`;
      const { resolve, reject, promise } = knownPromises.get(name);
      (resolve && reject) || Fail`promise not resolvable: ${name}`;
      (rejection ? reject : resolve)(value);
      knownPromises.set(name, { promise });
      return `resolved promise: ${name}`;
    },
    watchPromise: name => {
      knownPromises.has(name) || Fail`promise not found: ${name}`;
      watchPromise(knownPromises.get(name).promise, watcher, name);
      return `watched promise: ${name}`;
    },
    getWatchResolution: name => {
      return watchResolutions.get(name);
    },
    sendToPromise: (name, method, ...args) => {
      knownPromises.has(name) || Fail`promise not found: ${name}`;
      const { promise } = knownPromises.get(name);
      return HandledPromise.applyMethod(promise, method, args);
    },
  });

  const startOperations = vatParameters?.startOperations || [];
  for (const [method, ...args] of startOperations) {
    root[method](...args);
  }

  return root;
};
const kvStoreDataV1 = Object.entries({
  baggageID: 'o+d6/1',
  idCounters: '{"exportID":11,"collectionID":5,"promiseID":9}',
  kindIDID: '1',
  storeKindIDTable:
    '{"scalarMapStore":2,"scalarWeakMapStore":3,"scalarSetStore":4,"scalarWeakSetStore":5,"scalarDurableMapStore":6,"scalarDurableWeakMapStore":7,"scalarDurableSetStore":8,"scalarDurableWeakSetStore":9}',
  'vc.1.sDurablePromiseIgnorer_kindHandle':
    '{"body":"#\\"$0.Alleged: kind\\"","slots":["o+d1/10"]}',
  'vc.1.sthe_DurablePromiseIgnorer':
    '{"body":"#\\"$0.Alleged: DurablePromiseIgnorer\\"","slots":["o+d10/1"]}',
  'vc.1.|entryCount': '2',
  'vc.1.|nextOrdinal': '1',
  'vc.1.|schemata':
    '{"label":"baggage","body":"#{\\"keyShape\\":{\\"#tag\\":\\"match:string\\",\\"payload\\":[]}}","slots":[]}',
  // non-durable
  // 'vc.2.sp+6': '{"body":"#\\"&0\\"","slots":["p+6"]}',
  // 'vc.2.|entryCount': '1',
  // 'vc.2.|nextOrdinal': '1',
  // 'vc.2.|schemata': '{"label":"promiseRegistrations","body":"#{\\"keyShape\\":{\\"#tag\\":\\"match:scalar\\",\\"payload\\":\\"#undefined\\"}}","slots":[]}',
  'vc.3.|entryCount': '0',
  'vc.3.|nextOrdinal': '1',
  'vc.3.|schemata':
    '{"label":"promiseWatcherByKind","body":"#{\\"keyShape\\":{\\"#tag\\":\\"match:scalar\\",\\"payload\\":\\"#undefined\\"}}","slots":[]}',
  'vc.4.sp+6':
    '{"body":"#[[\\"$0.Alleged: DurablePromiseIgnorer\\",\\"orphaned\\"]]","slots":["o+d10/1"]}',
  'vc.4.sp-8':
    '{"body":"#[[\\"$0.Alleged: DurablePromiseIgnorer\\",\\"unresolved\\"]]","slots":["o+d10/1"]}',
  'vc.4.sp-9':
    '{"body":"#[[\\"$0.Alleged: DurablePromiseIgnorer\\",\\"late-rejected\\"]]","slots":["o+d10/1"]}',
  'vc.4.|entryCount': '3',
  'vc.4.|nextOrdinal': '1',
  'vc.4.|schemata':
    '{"label":"watchedPromises","body":"#{\\"keyShape\\":{\\"#tag\\":\\"match:and\\",\\"payload\\":[{\\"#tag\\":\\"match:scalar\\",\\"payload\\":\\"#undefined\\"},{\\"#tag\\":\\"match:string\\",\\"payload\\":[]}]}}","slots":[]}',
  'vom.dkind.10.descriptor':
    '{"kindID":"10","tag":"DurablePromiseIgnorer","unfaceted":true}',
  'vom.dkind.10.nextID': '2',
  'vom.o+d10/1': '{}',
  'vom.rc.o+d1/10': '1',
  'vom.rc.o+d10/1': '3',
  'vom.rc.o+d6/1': '1',
  'vom.rc.o+d6/3': '1',
  'vom.rc.o+d6/4': '1',
  watchedPromiseTableID: 'o+d6/4',
  watcherTableID: 'o+d6/3',
});
const kvStoreDataV1VpidsToReject = ['p+6', 'p-9'];
const kvStoreDataV1KeysToDelete = ['vc.4.sp+6', 'vc.4.sp-9'];
const kvStoreDataV1VpidsToKeep = ['p-8'];
const kvStoreDataV1KeysToKeep = ['vc.4.sp-8'];

// Ignore vatstore syscalls.
const extractDispatchLogs = vatLogs =>
  vatLogs.splice(0).filter(m => !m.type.startsWith('vatstore'));

const settlementMessage = (vpid, rejected, value) => ({
  type: 'resolve',
  resolutions: [[vpid, rejected, kser(value)]],
});
const fulfillmentMessage = (vpid, value) =>
  settlementMessage(vpid, false, value);
const rejectionMessage = (vpid, value) => settlementMessage(vpid, true, value);
const subscribeMessage = vpid => ({
  type: 'subscribe',
  target: vpid,
});

/** @param {`p-${number}` | `p+${number}`} p */
const extractPNum = p => {
  const r = /^p[-+](\d+)$/.exec(p);
  if (!r) throw Fail`Invalid promise ${p}`;
  return parseInt(r[1], 10);
};

test('past-incarnation watched promises', async t => {
  const S = 'settlement';
  // Anchor promise counters upon which the other assertions depend.
  const firstPImport = 9;
  // cf. src/liveslots.js:initialIDCounters
  const firstPExport = 5;

  const startImportedP = `p-${firstPImport - 2}`;

  const v1StartOperations = [
    ['createLocalPromise', 'start orphaned'],
    ['watchPromise', 'start orphaned'],
    ['createLocalPromise', 'start fulfilled', S],
    ['watchPromise', 'start fulfilled'],
    ['importPromise', 'start imported', kslot(startImportedP)],
    ['watchPromise', 'start imported'],
  ];
  const kvStore = new Map();
  let {
    v,
    dispatch,
    dispatchMessage: rawDispatch,
  } = await setupTestLiveslots(
    t,
    buildPromiseWatcherRootObject,
    'durable-promise-watcher',
    {
      kvStore,
      nextPromiseImportNumber: firstPImport,
      vatParameters: { startOperations: v1StartOperations },
    },
  );
  let vatLogs = v.log;

  /** @type {`p-${number}`} */
  let rp = `p-0`;
  /** @type {typeof rawDispatch} */
  const dispatchMessage = async (...args) => {
    rp = /** @type {`p-${number}`} */ (await rawDispatch(...args));
    return rp;
  };
  let lastPExport = firstPExport - 1;
  const exportedPromises = new Map();
  const recordNextExportedPromise = name => {
    const p = `p+${(lastPExport += 1)}`;
    exportedPromises.set(p, name);
    return p;
  };
  const recordExportedPromiseNotification = p => {
    t.true(exportedPromises.delete(p));
    return p;
  };

  // startVat logs
  const startOrphanedP = recordNextExportedPromise('start orphaned');
  const startFulfilledP = recordNextExportedPromise('start fulfilled');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    subscribeMessage(startImportedP),
    subscribeMessage(startOrphanedP),
    subscribeMessage(startFulfilledP),
    fulfillmentMessage(startFulfilledP, S),
  ]);
  await dispatchMessage('createLocalPromise', 'exported', S);
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, 'created local promise: exported'),
  ]);
  await dispatchMessage('getPromise', 'exported');
  const exportedP = recordNextExportedPromise('exported');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, {
      promise: kslot(exportedP),
    }),
    fulfillmentMessage(recordExportedPromiseNotification(exportedP), S),
  ]);
  const importedP = `p-${firstPImport - 1}`;
  await dispatchMessage('importPromise', 'imported', kslot(importedP));
  t.deepEqual(extractDispatchLogs(vatLogs), [
    subscribeMessage(importedP),
    fulfillmentMessage(rp, 'imported promise: imported'),
  ]);
  await dispatchMessage('createLocalPromise', 'orphaned');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, 'created local promise: orphaned'),
  ]);
  await dispatchMessage('createLocalPromise', 'orphaned exported');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, 'created local promise: orphaned exported'),
  ]);
  await dispatchMessage('getPromise', 'orphaned exported');
  const orphanedExportedP = recordNextExportedPromise('orphaned exported');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, {
      promise: kslot(orphanedExportedP),
    }),
  ]);
  await dispatchMessage('createLocalPromise', 'fulfilled', S);
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, 'created local promise: fulfilled'),
  ]);
  await dispatchMessage('createLocalPromise', 'rejected', undefined, S);
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, 'created local promise: rejected'),
  ]);

  await dispatchMessage('watchPromise', 'orphaned');
  const orphanedP = recordNextExportedPromise('orphaned');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    subscribeMessage(orphanedP),
    fulfillmentMessage(rp, 'watched promise: orphaned'),
  ]);
  await dispatchMessage('watchPromise', 'fulfilled');
  const fulfilledP = recordNextExportedPromise('fulfilled');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    subscribeMessage(fulfilledP),
    fulfillmentMessage(rp, 'watched promise: fulfilled'),
    fulfillmentMessage(recordExportedPromiseNotification(fulfilledP), S),
  ]);
  await dispatchMessage('watchPromise', 'rejected');
  const rejectedP = recordNextExportedPromise('rejected');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    subscribeMessage(rejectedP),
    fulfillmentMessage(rp, 'watched promise: rejected'),
    rejectionMessage(recordExportedPromiseNotification(rejectedP), S),
  ]);
  await dispatchMessage('watchPromise', 'imported');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    // no subscribe, we already did at import
    fulfillmentMessage(rp, 'watched promise: imported'),
  ]);
  await dispatchMessage('getWatchResolution', 'fulfilled');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, {
      status: 'fulfilled',
      value: S,
    }),
  ]);
  await dispatchMessage('getWatchResolution', 'rejected');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, {
      status: 'rejected',
      reason: S,
    }),
  ]);
  await dispatchMessage('getWatchResolution', 'start fulfilled');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, {
      status: 'fulfilled',
      value: S,
    }),
  ]);

  const v2FirstPromise = extractPNum(rp) + 1;

  // Simulate upgrade by starting from the non-empty kvStore.
  // t.log(Object.fromEntries([...kvStore.entries()].sort(compareEntriesByKey)));
  const clonedStore = new Map(kvStore);
  const startImported2P = `p-${firstPImport - 3}`;
  const v2StartOperations = [
    ['importPromise', 'start imported 2', kslot(startImported2P)], // import of new promise
    ['importPromise', 'imported', kslot(importedP)], // import previously imported and watched promise
    ['importPromise', 'orphaned exported', kslot(orphanedExportedP)], // import previously exported but unwatched promise
    ['watchPromise', 'orphaned exported'],
  ];
  ({
    v,
    dispatch,
    dispatchMessage: rawDispatch,
  } = await setupTestLiveslots(
    t,
    buildPromiseWatcherRootObject,
    'durable-promise-watcher-v2',
    {
      kvStore: clonedStore,
      nextPromiseImportNumber: v2FirstPromise,
      vatParameters: { startOperations: v2StartOperations },
    },
  ));
  vatLogs = v.log;

  // startVat logs
  t.deepEqual(extractDispatchLogs(vatLogs), [
    subscribeMessage(startImported2P),
    subscribeMessage(importedP),
    subscribeMessage(orphanedExportedP),
  ]);
  // Simulate kernel rejection of promises orphaned by termination/upgrade of their decider vat.
  const expectedDeletions = [...clonedStore.entries()].filter(entry =>
    entry[1].includes('orphaned'),
  );
  t.true(expectedDeletions.length >= 1);
  for (const [orphanedPExport] of exportedPromises) {
    await dispatch(makeReject(orphanedPExport, kser('tomorrow never came')));
  }
  exportedPromises.clear();
  await dispatchMessage('getWatchResolution', 'orphaned');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, {
      status: 'rejected',
      reason: 'tomorrow never came',
    }),
  ]);
  await dispatchMessage('getWatchResolution', 'start orphaned');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, {
      status: 'rejected',
      reason: 'tomorrow never came',
    }),
  ]);
  await dispatchMessage('getWatchResolution', 'orphaned exported');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, {
      status: 'rejected',
      reason: 'tomorrow never came',
    }),
  ]);
  for (const [key, value] of expectedDeletions) {
    t.false(clonedStore.has(key), `entry should be removed: ${key}: ${value}`);
  }
  // Simulate resolution of imported promises watched in previous incarnation
  await dispatch(makeResolve(importedP, kser(undefined)));
  await dispatchMessage('getWatchResolution', 'imported');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, {
      status: 'fulfilled',
      value: undefined,
    }),
  ]);
  await dispatch(makeResolve(startImportedP, kser(undefined)));
  await dispatchMessage('getWatchResolution', 'start imported');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, {
      status: 'fulfilled',
      value: undefined,
    }),
  ]);
  await dispatch(makeResolve(startImported2P, kser(undefined)));
  await dispatchMessage('getWatchResolution', 'start imported 2');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, undefined),
  ]);
  // simulate resolution of imported promise watched after resolution
  await dispatchMessage('watchPromise', 'start imported 2');
  const startImported2ReexportedP =
    recordNextExportedPromise('start imported 2');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    // Promise was previously resolved, so it is re-exported
    subscribeMessage(startImported2ReexportedP),
    fulfillmentMessage(rp, 'watched promise: start imported 2'),
    fulfillmentMessage(
      recordExportedPromiseNotification(startImported2ReexportedP),
      undefined,
    ),
  ]);
  await dispatchMessage('getWatchResolution', 'start imported 2');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, {
      status: 'fulfilled',
      value: undefined,
    }),
  ]);

  const finalFirstPromise = extractPNum(rp) + 1;

  // Verify that the data is still in loadable condition.
  const finalClonedStore = new Map(clonedStore);
  ({
    v,
    dispatch,
    dispatchMessage: rawDispatch,
  } = await setupTestLiveslots(
    t,
    buildPromiseWatcherRootObject,
    'durable-promise-watcher-final',
    { kvStore: finalClonedStore, nextPromiseImportNumber: finalFirstPromise },
  ));
  vatLogs = v.log;
  vatLogs.length = 0;
  t.deepEqual([...exportedPromises], [], 'exportedPromises is empty');
  await dispatchMessage('createLocalPromise', 'final', S);
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, 'created local promise: final'),
  ]);
  await dispatchMessage('watchPromise', 'final');
  const finalP = recordNextExportedPromise('final');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    subscribeMessage(finalP),
    fulfillmentMessage(rp, 'watched promise: final'),
    fulfillmentMessage(recordExportedPromiseNotification(finalP), S),
  ]);
  await dispatchMessage('getWatchResolution', 'final');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, {
      status: 'fulfilled',
      value: S,
    }),
  ]);
});

test('past-incarnation watched promises from original-format kvStore', async t => {
  const kvStore = new Map(kvStoreDataV1);
  for (const key of [
    ...kvStoreDataV1KeysToDelete,
    ...kvStoreDataV1KeysToKeep,
  ]) {
    t.true(kvStore.has(key), `key must be initially present: ${key}`);
  }

  let { v, dispatch, dispatchMessage } = await setupTestLiveslots(
    t,
    buildPromiseWatcherRootObject,
    'durable-promise-watcher',
    { kvStore, nextPromiseImportNumber: 100 },
  );
  let vatLogs = v.log;
  for (const vpid of kvStoreDataV1VpidsToReject) {
    await dispatch(makeReject(vpid, kser('tomorrow never came')));
  }
  for (const key of kvStoreDataV1KeysToDelete) {
    t.false(kvStore.has(key), `key should be removed: ${key}`);
  }
  for (const key of kvStoreDataV1KeysToKeep) {
    t.true(kvStore.has(key), `key should remain: ${key}`);
  }

  // Verify that the data is still in loadable condition.
  const finalClonedStore = new Map(kvStore);
  // eslint-disable-next-line no-unused-vars
  ({ v, dispatch, dispatchMessage } = await setupTestLiveslots(
    t,
    buildPromiseWatcherRootObject,
    'durable-promise-watcher-final',
    { kvStore: finalClonedStore, nextPromiseImportNumber: 200 },
  ));
  vatLogs = v.log;
  vatLogs.length = 0;
  for (const vpid of kvStoreDataV1VpidsToKeep) {
    await dispatch(makeResolve(vpid, kser('finally')));
  }
  for (const key of kvStoreDataV1KeysToKeep) {
    t.false(finalClonedStore.has(key), `key should be removed: ${key}`);
  }
});

test('watched local promises should not leak slotToVal entries', async t => {
  const S = 'settlement';
  // cf. src/liveslots.js:initialIDCounters
  const firstPExport = 5;

  const {
    v: { log: vatLogs },
    dispatchMessage,
    testHooks,
  } = await setupTestLiveslots(t, buildPromiseWatcherRootObject, 'vatA');
  const { slotToVal } = testHooks;
  const initial = slotToVal.size;

  let lastPExport = firstPExport - 1;
  const nextPExport = () => `p+${(lastPExport += 1)}`;

  let rp;

  // Watch already resolved promise
  rp = await dispatchMessage('createLocalPromise', 'p1', S);
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, 'created local promise: p1'),
  ]);
  rp = await dispatchMessage('watchPromise', 'p1');
  const p1 = nextPExport();
  t.deepEqual(extractDispatchLogs(vatLogs), [
    subscribeMessage(p1),
    fulfillmentMessage(rp, 'watched promise: p1'),
    fulfillmentMessage(p1, S),
  ]);
  t.is(slotToVal.size, initial); // exported promise did not leak
  rp = await dispatchMessage('getWatchResolution', 'p1');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, {
      status: 'fulfilled',
      value: S,
    }),
  ]);

  // Watch subsequently resolved promise
  rp = await dispatchMessage('createLocalPromise', 'p2');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, 'created local promise: p2'),
  ]);
  t.is(slotToVal.size, initial);

  rp = await dispatchMessage('watchPromise', 'p2');
  const p2 = nextPExport();
  t.deepEqual(extractDispatchLogs(vatLogs), [
    subscribeMessage(p2),
    fulfillmentMessage(rp, 'watched promise: p2'),
  ]);
  t.is(slotToVal.size, initial + 1); // exported promise

  rp = await dispatchMessage('resolveLocalPromise', 'p2', false, S);
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(p2, S),
    fulfillmentMessage(rp, 'resolved promise: p2'),
  ]);
  t.is(slotToVal.size, initial); // exported promise did not leak

  rp = await dispatchMessage('getWatchResolution', 'p2');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, {
      status: 'fulfilled',
      value: S,
    }),
  ]);
});

// Remaining case for https://github.com/Agoric/agoric-sdk/issues/10756
// The workaround doesn't handle this case because it learns about the
// settlement before the virtual object system
// See https://github.com/Agoric/agoric-sdk/issues/10757
// prettier-ignore
test.failing('watched imported promises should not leak slotToVal entries', async t => {
  const S = 'settlement';
  // cf. src/liveslots.js:initialIDCounters
  const firstPExport = 5;

  const {
    v: { log: vatLogs },
    dispatch,
    dispatchMessage,
    nextPImport,
    testHooks,
  } = await setupTestLiveslots(t, buildPromiseWatcherRootObject, 'vatA');
  const { slotToVal } = testHooks;
  const initial = slotToVal.size;

  let lastPExport = firstPExport - 1;
  const nextPExport = () => `p+${(lastPExport += 1)}`;

  let rp;

  // Watch already imported promise
  const importedP = nextPImport();
  rp = await dispatchMessage('importPromise', 'importedP', kslot(importedP));
  t.deepEqual(extractDispatchLogs(vatLogs), [
    subscribeMessage(importedP),
    fulfillmentMessage(rp, 'imported promise: importedP'),
  ]);
  t.is(slotToVal.size, initial + 1); // imported promise

  rp = await dispatchMessage('watchPromise', 'importedP');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, 'watched promise: importedP'),
  ]);
  t.is(slotToVal.size, initial + 1); // imported promise

  await dispatch(makeResolve(importedP, kser(S)));
  t.deepEqual(extractDispatchLogs(vatLogs), []);
  t.is(slotToVal.size, initial); // should not leak

  rp = await dispatchMessage('getPromise', 'importedP');
  const reexportedP = nextPExport(); // Should allocate a new exported promise
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, { promise: kslot(reexportedP) }),
    fulfillmentMessage(reexportedP, S),
  ]);
  t.is(slotToVal.size, initial); // reexported promise did not leak
});

// prettier-ignore
test.failing('known imported promises in resolutions should not leak slotToVal entries', async t => {
  const S = 'settlement';
  // cf. src/liveslots.js:initialIDCounters
  const firstPExport = 5;

  const {
    v: { log: vatLogs },
    dispatch,
    dispatchMessage,
    nextPImport,
    testHooks,
  } = await setupTestLiveslots(t, buildPromiseWatcherRootObject, 'vatA');
  const { slotToVal } = testHooks;
  const initial = slotToVal.size;

  let lastPExport = firstPExport - 1;
  const nextPExport = () => `p+${(lastPExport += 1)}`;

  let rp;

  const importedP = nextPImport();
  rp = await dispatchMessage('importPromise', 'importedP', kslot(importedP));
  t.deepEqual(extractDispatchLogs(vatLogs), [
    subscribeMessage(importedP),
    fulfillmentMessage(rp, 'imported promise: importedP'),
  ]);
  t.is(slotToVal.size, initial + 1); // imported promise

  rp = await dispatchMessage('getPromise', 'importedP');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, { promise: kslot(importedP) }),
  ]);
  t.is(slotToVal.size, initial + 1); // imported promise

  await dispatch(makeResolve(importedP, kser(S)));
  t.deepEqual(extractDispatchLogs(vatLogs), []);
  t.is(slotToVal.size, initial); // promise no longer imported

  // The first getPromise causes liveslots to learn about the resolution value
  // of importedP since liveslots currently only tracks known promise
  // resolutions on export.
  rp = await dispatchMessage('getPromise', 'importedP');
  const reexportedP = nextPExport();
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, { promise: kslot(reexportedP) }),
    fulfillmentMessage(reexportedP, S), // liveslots learns about the resolution
  ]);
  t.is(slotToVal.size, initial);

  // The second getPromise verifies that liveslots does not leak when notifying
  // a known resolved promise. It allocates a new exported promise because the
  // resolution was previously notified
  rp = await dispatchMessage('getPromise', 'importedP');
  const reexportedP2 = nextPExport(); // allocates a new export promise
  t.deepEqual(extractDispatchLogs(vatLogs), [
    {
      type: 'resolve',
      resolutions: [
        [rp, false, kser({ promise: kslot(reexportedP2) })],
        [reexportedP2, false, kser(S)], // one shot resolution notification
      ],
    },
  ]);
  t.is(slotToVal.size, initial); // did not leak reexportedP2

  // The 3rd getPromise ensures that the 2nd fully cleaned up, and that liveslots
  // doesn't attempt to re-use a the previously exported promise
  rp = await dispatchMessage('getPromise', 'importedP');
  const reexportedP3 = nextPExport(); // allocates a new export promise
  t.deepEqual(extractDispatchLogs(vatLogs), [
    {
      type: 'resolve',
      resolutions: [
        [rp, false, kser({ promise: kslot(reexportedP3) })],
        [reexportedP3, false, kser(S)], // still one shot resolution
      ],
    },
  ]);
  t.is(slotToVal.size, initial); // did not leak reexportedP3
});

// prettier-ignore
test.failing('known exported promises in resolutions should not leak slotToVal entries', async t => {
  const S = 'settlement';
  // cf. src/liveslots.js:initialIDCounters
  const firstPExport = 5;

  const {
    v: { log: vatLogs },
    dispatchMessage,
    testHooks,
  } = await setupTestLiveslots(t, buildPromiseWatcherRootObject, 'vatA');
  const { slotToVal } = testHooks;
  const initial = slotToVal.size;

  let lastPExport = firstPExport - 1;
  const nextPExport = () => `p+${(lastPExport += 1)}`;

  let rp;

  rp = await dispatchMessage('createLocalPromise', 'localP');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, 'created local promise: localP'),
  ]);
  t.is(slotToVal.size, initial);

  rp = await dispatchMessage('getPromise', 'localP');
  const localP = nextPExport();
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, { promise: kslot(localP) }),
  ]);
  t.is(slotToVal.size, initial + 1); // exported promise

  rp = await dispatchMessage('resolveLocalPromise', 'localP', false, S);
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(localP, S),
    fulfillmentMessage(rp, 'resolved promise: localP'),
  ]);
  t.is(slotToVal.size, initial); // promise no longer exported

  // The first getPromise verifies that liveslots does not leak when notifying
  // a known resolved promise. It allocates a new exported promise because the
  // resolution was previously notified
  rp = await dispatchMessage('getPromise', 'localP');
  const reexportedP = nextPExport();
  t.deepEqual(extractDispatchLogs(vatLogs), [
    {
      type: 'resolve',
      resolutions: [
        [rp, false, kser({ promise: kslot(reexportedP) })],
        [reexportedP, false, kser(S)], // one shot resolution notification
      ],
    },
  ]);
  t.is(slotToVal.size, initial);

  // The second getPromise ensures that previous fully cleaned up, and that
  // liveslots doesn't attempt to re-use a the previously exported promise
  rp = await dispatchMessage('getPromise', 'localP');
  const reexportedP2 = nextPExport(); // allocates a new export promise
  t.deepEqual(extractDispatchLogs(vatLogs), [
    {
      type: 'resolve',
      resolutions: [
        [rp, false, kser({ promise: kslot(reexportedP2) })],
        [reexportedP2, false, kser(S)], // still one shot resolution
      ],
    },
  ]);
  t.is(slotToVal.size, initial); // did not leak reexportedP2
});

// prettier-ignore
test.failing('known promises in message sends should not leak slotToVal entries', async t => {
  const S = 'settlement';
  // cf. src/liveslots.js:initialIDCounters
  const firstPExport = 5;

  const targetO = `o-1`;

  const {
    v: { log: vatLogs },
    dispatch,
    dispatchMessage,
    testHooks,
  } = await setupTestLiveslots(t, buildPromiseWatcherRootObject, 'vatA', {
    vatParameters: {
      startOperations: [['createLocalPromise', 'target', kslot(targetO)]],
    },
  });
  const { slotToVal } = testHooks;
  const initial = slotToVal.size;

  let lastPExport = firstPExport - 1;
  const nextPExport = () => `p+${(lastPExport += 1)}`;

  let rp;

  rp = await dispatchMessage('createLocalPromise', 'targetP');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, 'created local promise: targetP'),
  ]);
  t.is(slotToVal.size, initial);

  rp = await dispatchMessage('createLocalPromise', 'localP');
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, 'created local promise: localP'),
  ]);
  t.is(slotToVal.size, initial);

  rp = await dispatchMessage('getPromise', 'localP');
  const localP = nextPExport();
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, { promise: kslot(localP) }),
  ]);
  t.is(slotToVal.size, initial + 1); // localP promise

  rp = await dispatchMessage('sendToPromise', 'targetP', 'foo', kslot(localP));
  const sendToPromiseResultP = rp;
  t.deepEqual(extractDispatchLogs(vatLogs), []);
  t.is(slotToVal.size, initial + 2); // localP and sendToPromiseResultP promises

  rp = await dispatchMessage('resolveLocalPromise', 'localP', false, S);
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(localP, S),
    fulfillmentMessage(rp, 'resolved promise: localP'),
  ]);
  t.is(slotToVal.size, initial + 1); // sendToPromiseResultP promise

  rp = await dispatchMessage(
    'resolveLocalPromise',
    'targetP',
    false,
    kslot(targetO),
  );
  const reexportedP = nextPExport(); // Allocate a new promise for importedP
  const sendResultP = nextPExport();
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(rp, 'resolved promise: targetP'), // no await so first syscall
    {
      type: 'send',
      targetSlot: targetO,
      methargs: kser(['foo', [kslot(reexportedP)]]),
      resultSlot: sendResultP,
    },
    fulfillmentMessage(reexportedP, S), // known resolutions comes before subscribe of send result
    subscribeMessage(sendResultP),
  ]);
  t.is(slotToVal.size, initial + 2); // sendToPromiseResultP and sendResultP promises

  await dispatch(makeResolve(sendResultP, kser(S)));
  t.deepEqual(extractDispatchLogs(vatLogs), [
    fulfillmentMessage(sendToPromiseResultP, S),
  ]);
  t.is(slotToVal.size, initial);
});
