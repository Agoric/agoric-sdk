import test from 'ava';

import { Far } from '@endo/marshal';
import { kunser } from '@agoric/kmarshal';
import { setupTestLiveslots } from './liveslots-helpers.js';
import { vstr } from './util.js';
import { parseVatSlot } from '../src/parseVatSlots.js';

function buildRootObject(vatPowers, vatParameters, baggage) {
  baggage.has('outside');
  baggage.init('outside', 'outer val');
  return Far('root', {
    doSomething() {
      baggage.get('outside');
      baggage.init('inside', 'inner val');
    },
  });
}

test.serial('exercise baggage', async t => {
  const { v, dispatchMessageSuccessfully } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    { forceGC: true },
  );
  const { fakestore } = v;
  const get = key => fakestore.get(key);
  const getLabel = key => kunser(JSON.parse(get(key))).label;

  const baggageVref = fakestore.get('baggageID');
  const { subid } = parseVatSlot(baggageVref);
  const baggageID = Number(subid);
  const kindIDs = JSON.parse(fakestore.get('storeKindIDTable'));
  // baggage is the first collection created, a scalarDurableMapStore
  t.is(baggageVref, `o+d${kindIDs.scalarDurableMapStore}/1`);
  t.is(getLabel(`vc.${baggageID}.|schemata`), 'baggage');
  const outsideVal = fakestore.get(`vc.${baggageID}.soutside`);
  t.is(outsideVal, vstr('outer val'));
  t.is(fakestore.get(`vc.${baggageID}.|entryCount`), '1');

  await dispatchMessageSuccessfully('doSomething', []);
  const insideVal = fakestore.get(`vc.${baggageID}.sinside`);
  t.is(insideVal, vstr('inner val'));
  t.is(fakestore.get(`vc.${baggageID}.|entryCount`), '2');
});
