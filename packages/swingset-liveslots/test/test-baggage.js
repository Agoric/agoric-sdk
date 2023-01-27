import test from 'ava';
import '@endo/init/debug.js';

import { Far } from '@endo/marshal';
import { setupTestLiveslots } from './liveslots-helpers.js';
import { vstr } from './util.js';
import { parseVatSlot } from '../src/lib/parseVatSlots.js';

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
    true,
  );
  const { fakestore } = v;

  const baggageVref = fakestore.get('baggageID');
  const { subid } = parseVatSlot(baggageVref);
  const baggageID = Number(subid);
  console.log(`baggageID`, baggageID);
  const kindIDs = JSON.parse(fakestore.get('storeKindIDTable'));
  // baggage is the first collection created, a scalarDurableMapStore
  t.is(baggageVref, `o+${kindIDs.scalarDurableMapStore}/1`);
  t.is(fakestore.get(`vc.${baggageID}.|label`), 'baggage');
  const outsideVal = fakestore.get(`vc.${baggageID}.soutside`);
  t.is(outsideVal, vstr('outer val'));
  t.is(fakestore.get(`vc.${baggageID}.|entryCount`), '1');

  await dispatchMessageSuccessfully('doSomething', []);
  const insideVal = fakestore.get(`vc.${baggageID}.sinside`);
  t.is(insideVal, vstr('inner val'));
  t.is(fakestore.get(`vc.${baggageID}.|entryCount`), '2');
});
