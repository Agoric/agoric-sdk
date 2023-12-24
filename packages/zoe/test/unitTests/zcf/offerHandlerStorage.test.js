import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { Far } from '@endo/marshal';
import { makeScalarBigMapStore } from '@agoric/vat-data';

import { makeOfferHandlerStorage } from '../../../src/contractFacet/offerHandlerStorage.js';

test('offerHandlerStorage', async t => {
  const { storeOfferHandler, takeOfferHandler } = makeOfferHandlerStorage(
    makeScalarBigMapStore('zcfBaggage', { durable: true }),
  );

  const offerHandler = Far('offerHandler', () => {});
  const invitationHandle = storeOfferHandler(offerHandler);
  t.is(takeOfferHandler(invitationHandle), offerHandler);

  // Getting the offerHandler also deletes it for explicit GC, so trying to get
  // it twice errors.
  t.throws(() => takeOfferHandler(invitationHandle), {
    message: /offerHandler may not have survived upgrade/,
  });
});
