import test from 'ava';

import { Fail } from '@endo/errors';
import { Far } from '@endo/marshal';
import { M, provideLazy as provide } from '@agoric/store';
import { makePromiseKit } from '@endo/promise-kit';
// Disabled to avoid circular dependencies.
// import { makeStoreUtils } from '@agoric/vat-data/src/vat-data-bindings.js';
// import { makeExoUtils } from '@agoric/vat-data/src/exo-utils.js';
import { kslot, kser } from '@agoric/kmarshal';
import { setupTestLiveslots } from './liveslots-helpers.js';
import { makeResolve, makeReject } from './util.js';

// eslint-disable-next-line no-unused-vars
const compareEntriesByKey = ([ka], [kb]) => (ka < kb ? -1 : 1);

// Paritally duplicates @agoric/vat-data to avoid circular dependencies.
const makeExoUtils = VatData => {
  const { defineDurableKind, makeKindHandle, watchPromise } = VatData;

  const provideKindHandle = (baggage, kindName) =>
    provide(baggage, `${kindName}_kindHandle`, () => makeKindHandle(kindName));

  const emptyRecord = harden({});
  const initEmpty = () => emptyRecord;

  const defineDurableExoClass = (
    kindHandle,
    interfaceGuard,
    init,
    methods,
    options,
  ) =>
    defineDurableKind(kindHandle, init, methods, {
      ...options,
      thisfulMethods: true,
      interfaceGuard,
    });

  const prepareExoClass = (
    baggage,
    kindName,
    interfaceGuard,
    init,
    methods,
    options = undefined,
  ) =>
    defineDurableExoClass(
      provideKindHandle(baggage, kindName),
      interfaceGuard,
      init,
      methods,
      options,
    );

  const prepareExo = (
    baggage,
    kindName,
    interfaceGuard,
    methods,
    options = undefined,
  ) => {
    const makeSingleton = prepareExoClass(
      baggage,
      kindName,
      interfaceGuard,
      initEmpty,
      methods,
      options,
    );
    return provide(baggage, `the_${kindName}`, () => makeSingleton());
  };

  return {
    defineDurableKind,
    makeKindHandle,
    watchPromise,

    provideKindHandle,
    defineDurableExoClass,
    prepareExoClass,
    prepareExo,
  };
};

// cf. packages/SwingSet/test/vat-durable-promise-watcher.js
const buildPromiseWatcherRootObject = (vatPowers, _vatParameters, baggage) => {
  const { VatData } = vatPowers;
  const { watchPromise } = VatData;
  const { prepareExo } = makeExoUtils(VatData);
  // const { makeScalarBigMapStore } = makeStoreUtils(VatData);
  const PromiseWatcherI = M.interface('ExtraArgPromiseWatcher', {
    onFulfilled: M.call(M.any(), M.string()).returns(),
    onRejected: M.call(M.any(), M.string()).returns(),
  });
  const watcher = prepareExo(
    baggage,
    'DurablePromiseIgnorer',
    PromiseWatcherI,
    {
      onFulfilled(_value, _name) {},
      onRejected(_reason, _name) {},
    },
  );

  const localPromises = new Map();

  return Far('root', {
    exportPromise: () => [Promise.resolve()],
    createLocalPromise: (name, fulfillment, rejection) => {
      !localPromises.has(name) || Fail`local promise already exists: ${name}`;
      const { promise, resolve, reject } = makePromiseKit();
      if (fulfillment !== undefined) {
        resolve(fulfillment);
      } else if (rejection !== undefined) {
        reject(rejection);
      }
      localPromises.set(name, promise);
      return `created local promise: ${name}`;
    },
    watchLocalPromise: name => {
      localPromises.has(name) || Fail`local promise not found: ${name}`;
      watchPromise(localPromises.get(name), watcher, name);
      return `watched local promise: ${name}`;
    },
  });
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

test('past-incarnation watched promises', async t => {
  const kvStore = new Map();
  let { v, dispatch, dispatchMessage } = await setupTestLiveslots(
    t,
    buildPromiseWatcherRootObject,
    'durable-promise-watcher',
    { kvStore },
  );
  let vatLogs = v.log;

  // Anchor promise counters upon which the other assertions depend.
  const firstPImport = 1;
  // cf. src/liveslots.js:initialIDCounters
  const firstPExport = 5;
  let lastPImport = firstPImport - 1;
  let lastPExport = firstPExport - 1;
  const nextPImport = () => (lastPImport += 1);
  const nextPExport = () => (lastPExport += 1);
  // Ignore vatstore syscalls.
  const getDispatchLogs = () =>
    vatLogs.splice(0).filter(m => !m.type.startsWith('vatstore'));
  const settlementMessage = (vpid, rejected, value) => ({
    type: 'resolve',
    resolutions: [[vpid, rejected, kser(value)]],
  });
  const fulfillmentMessage = (vpid, value) =>
    settlementMessage(vpid, false, value);
  const rejectionMessage = (vpid, value) =>
    settlementMessage(vpid, true, value);
  const subscribeMessage = vpid => ({
    type: 'subscribe',
    target: vpid,
  });
  vatLogs.length = 0;
  await dispatchMessage('exportPromise');
  t.deepEqual(getDispatchLogs(), [
    fulfillmentMessage(`p-${nextPImport()}`, [kslot(`p+${nextPExport()}`)]),
    fulfillmentMessage(`p+${lastPExport}`, undefined),
  ]);

  const S = 'settlement';
  await dispatchMessage('createLocalPromise', 'orphaned');
  t.deepEqual(getDispatchLogs(), [
    fulfillmentMessage(`p-${nextPImport()}`, 'created local promise: orphaned'),
  ]);
  await dispatchMessage('createLocalPromise', 'fulfilled', S);
  t.deepEqual(getDispatchLogs(), [
    fulfillmentMessage(
      `p-${nextPImport()}`,
      'created local promise: fulfilled',
    ),
  ]);
  await dispatchMessage('createLocalPromise', 'rejected', undefined, S);
  t.deepEqual(getDispatchLogs(), [
    fulfillmentMessage(`p-${nextPImport()}`, 'created local promise: rejected'),
  ]);
  t.is(
    lastPImport - firstPImport + 1,
    4,
    'imported 4 promises (1 per dispatch)',
  );
  t.is(lastPExport - firstPExport + 1, 1, 'exported 1 promise: first');

  await dispatchMessage('watchLocalPromise', 'orphaned');
  t.deepEqual(getDispatchLogs(), [
    subscribeMessage(`p+${nextPExport()}`),
    fulfillmentMessage(`p-${nextPImport()}`, 'watched local promise: orphaned'),
  ]);
  await dispatchMessage('watchLocalPromise', 'fulfilled');
  t.deepEqual(getDispatchLogs(), [
    subscribeMessage(`p+${nextPExport()}`),
    fulfillmentMessage(
      `p-${nextPImport()}`,
      'watched local promise: fulfilled',
    ),
    fulfillmentMessage(`p+${lastPExport}`, S),
  ]);
  await dispatchMessage('watchLocalPromise', 'rejected');
  t.deepEqual(getDispatchLogs(), [
    subscribeMessage(`p+${nextPExport()}`),
    fulfillmentMessage(`p-${nextPImport()}`, 'watched local promise: rejected'),
    rejectionMessage(`p+${lastPExport}`, S),
  ]);
  t.is(
    lastPImport - firstPImport + 1,
    7,
    'imported 7 promises (1 per dispatch)',
  );
  t.is(
    lastPExport - firstPExport + 1,
    4,
    'exported 4 promises: first, orphaned, fulfilled, rejected',
  );

  // Simulate upgrade by starting from the non-empty kvStore.
  // t.log(Object.fromEntries([...kvStore.entries()].sort(compareEntriesByKey)));
  const clonedStore = new Map(kvStore);
  ({ v, dispatch, dispatchMessage } = await setupTestLiveslots(
    t,
    buildPromiseWatcherRootObject,
    'durable-promise-watcher-v2',
    { kvStore: clonedStore, nextPromiseImportNumber: lastPImport + 1 },
  ));
  vatLogs = v.log;

  // Simulate kernel rejection of promises orphaned by termination/upgrade of their decider vat.
  const expectedDeletions = [...clonedStore.entries()].filter(entry =>
    entry[1].includes('orphaned'),
  );
  t.true(expectedDeletions.length >= 1);
  await dispatch(
    makeReject(`p+${firstPExport + 1}`, kser('tomorrow never came')),
  );
  for (const [key, value] of expectedDeletions) {
    t.false(clonedStore.has(key), `entry should be removed: ${key}: ${value}`);
  }

  // Verify that the data is still in loadable condition.
  const finalClonedStore = new Map(clonedStore);
  ({ v, dispatch, dispatchMessage } = await setupTestLiveslots(
    t,
    buildPromiseWatcherRootObject,
    'durable-promise-watcher-final',
    { kvStore: finalClonedStore, nextPromiseImportNumber: lastPImport + 1 },
  ));
  vatLogs = v.log;
  vatLogs.length = 0;
  await dispatchMessage('createLocalPromise', 'final', S);
  await dispatchMessage('watchLocalPromise', 'final');
  t.deepEqual(getDispatchLogs(), [
    fulfillmentMessage(`p-${nextPImport()}`, 'created local promise: final'),
    subscribeMessage(`p+${nextPExport()}`),
    fulfillmentMessage(`p-${nextPImport()}`, 'watched local promise: final'),
    fulfillmentMessage(`p+${lastPExport}`, S),
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
