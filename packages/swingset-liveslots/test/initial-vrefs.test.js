import test from 'ava';

import { Far } from '@endo/far';
import { kunser } from '@agoric/kmarshal';
import { M } from '@agoric/store';
import { setupTestLiveslots } from './liveslots-helpers.js';

function buildRootObject(vatPowers, vatParameters, baggage) {
  const vd = vatPowers.VatData;

  let vinstance1;
  let kh1;
  let dinstance1;
  let dinstance2;
  let store1;

  function start() {
    // this is the first Kind to be created, so it gets the first
    // objectID (probably 10), and a 'v' annotation, so o+v10
    const init = () => ({ state: 0 });
    const behavior = {
      set: ({ state }, value) => {
        state.value = value;
      },
    };
    const makeVK1 = vd.defineKind('kind', init, behavior);
    // the first instance thus gets o+v10/1
    vinstance1 = makeVK1();

    // Kind handles are durable instances of the kindIDID
    kh1 = vd.makeKindHandle('k1');
    const makeK1 = vd.defineDurableKind(kh1, () => ({}), {});
    baggage.init('kh1', kh1);
    dinstance1 = makeK1();
    dinstance2 = makeK1();

    store1 = vd.makeScalarBigMapStore('store1');
    store1.init('key', 'value');
    store1.init('self', store1);
  }

  return Far('root', {
    start,
    getVinstance1: () => vinstance1,
    getKH1: () => kh1,
    getDinstance1: () => dinstance1,
    getDinstance2: () => dinstance2,
    getStore1: () => store1,
  });
}

test('initial vatstore contents', async t => {
  const { v } = await setupTestLiveslots(t, buildRootObject, 'bob', {
    forceGC: true,
  });
  const { fakestore } = v;
  const get = key => fakestore.get(key);
  const getLabel = key => kunser(JSON.parse(get(key))).label;

  // an empty buildRootObject should create 4 collections, and some metadata
  const kindIDs = JSON.parse(get('storeKindIDTable'));
  const dmsBase = `o+d${kindIDs.scalarDurableMapStore}`;
  // the first collection is baggage: a durable mapstore
  const baggageVref = `${dmsBase}/1`;
  t.is(get('baggageID'), baggageVref);
  t.is(get(`vc.1.|entryCount`), '0'); // no entries yet
  t.is(get(`vc.1.|nextOrdinal`), '1'); // no ordinals yet
  t.is(get(`vc.1.|entryCount`), '0');
  const stringSchema = { label: 'baggage', keyShape: M.string() };
  t.deepEqual(kunser(JSON.parse(get(`vc.1.|schemata`))), stringSchema);

  // then three tables for the promise watcher (one virtual, two durable)
  t.is(getLabel(`vc.3.|schemata`), 'promiseWatcherByKind'); // durable
  t.is(getLabel(`vc.4.|schemata`), 'watchedPromises'); // durable
  // the promiseRegistrations table is not durable, and only gets vc.2
  // on the first incarnation: it will get a new ID on subsequent
  // incarnations
  t.is(getLabel(`vc.2.|schemata`), `promiseRegistrations`); // virtual

  const watcherTableVref = get('watcherTableID');
  const watchedPromiseTableVref = get('watchedPromiseTableID');
  t.is(watcherTableVref, `${dmsBase}/3`);
  t.is(watchedPromiseTableVref, `${dmsBase}/4`);

  // baggage and the two durable promise-watcher tables are pinned
  t.is(get(`vom.rc.${baggageVref}`), '1');
  t.is(get(`vom.rc.${watcherTableVref}`), '1');
  t.is(get(`vom.rc.${watchedPromiseTableVref}`), '1');

  // promiseRegistrations and promiseWatcherByKind arbitrary scalars as keys
  const scalarSchema2 = { label: 'promiseRegistrations', keyShape: M.scalar() };
  const scalarSchema3 = { label: 'promiseWatcherByKind', keyShape: M.scalar() };
  t.deepEqual(kunser(JSON.parse(get(`vc.2.|schemata`))), scalarSchema2);
  t.deepEqual(kunser(JSON.parse(get(`vc.3.|schemata`))), scalarSchema3);
  // watchedPromises uses vref (string) keys
  const scalarStringSchema = {
    label: 'watchedPromises',
    keyShape: M.and(M.scalar(), M.string()),
  };
  t.deepEqual(kunser(JSON.parse(get(`vc.4.|schemata`))), scalarStringSchema);
});

test('vrefs', async t => {
  const { v, dispatchMessageSuccessfully: run } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    { forceGC: true },
  );
  // const { fakestore, dumpFakestore } = v;
  const { fakestore } = v;
  const get = key => fakestore.get(key);
  const getLabel = key => kunser(JSON.parse(get(key))).label;

  const kindIDID = JSON.parse(fakestore.get('kindIDID'));
  const initialKindIDs = JSON.parse(fakestore.get('storeKindIDTable'));
  const initialCounters = JSON.parse(fakestore.get(`idCounters`));
  const firstObjID = initialCounters.exportID;

  // we expect makeVK1 (virtual, non-durable) to get firstObjID
  const expectedVI1Vref = `o+v${firstObjID}/1`; // usually o+v10/1
  // and kh1 is a KindHandle, so its subid is allocated from the objectID space
  const kh1KindID = `${firstObjID + 1}`;
  const expectedKH1Vref = `o+d${kindIDID}/${kh1KindID}`; // usually o+d1/11
  console.log(`expectedKH1Vref`, expectedKH1Vref);
  // instances of kh1 are allocated from the `o+d` kh1KindID space
  const expectedDH1Vref = `o+d${kh1KindID}/1`;
  const expectedDH2Vref = `o+d${kh1KindID}/2`;

  await run('start');
  // dumpFakestore();

  const vI1Vref = (await run('getVinstance1')).slots[0];
  t.is(vI1Vref, expectedVI1Vref);

  const kh1Vref = (await run('getKH1')).slots[0];
  t.is(kh1Vref, expectedKH1Vref);

  const dh1Vref = (await run('getDinstance1')).slots[0];
  t.is(dh1Vref, expectedDH1Vref);
  const dh2Vref = (await run('getDinstance2')).slots[0];
  t.is(dh2Vref, expectedDH2Vref);

  // the liveslots-created collections consume vc.1 through vc.4,
  // leaving vc.5 for the first user-created collection
  t.is(getLabel('vc.5.|schemata'), 'store1');
  const expectedStore1Vref = `o+v${initialKindIDs.scalarMapStore}/5`;
  const store1Vref = (await run('getStore1')).slots[0];
  t.is(store1Vref, expectedStore1Vref);
  t.is(kunser(JSON.parse(fakestore.get(`vc.5.s${'key'}`))), 'value');
});
