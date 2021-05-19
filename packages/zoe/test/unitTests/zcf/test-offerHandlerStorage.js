// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { makeOfferHandlerStorage } from '../../../src/contractFacet/offerHandlerStorage';

test('offerHandlerStorage', async t => {
  const { storeOfferHandler, getOfferHandler } = makeOfferHandlerStorage();

  const offerHandler = () => {};
  const invitationHandle = storeOfferHandler(offerHandler);
  t.is(getOfferHandler(invitationHandle), offerHandler);

  // Getting the offerHandler also deletes it for explicit GC, so trying to get it
  // twice errors.
  t.throws(() => getOfferHandler(invitationHandle), {
    message: '"invitationHandle" not found: "[Alleged: InvitationHandle]"',
  });
});
