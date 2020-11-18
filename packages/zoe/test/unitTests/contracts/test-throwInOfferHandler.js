// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import bundleSource from '@agoric/bundle-source';

import { E } from '@agoric/eventual-send';
import { makeZoe } from '../../../src/zoeService/zoe';
import fakeVatAdmin from '../../../src/contractFacet/fakeVatAdmin';

const contractRoot = `${__dirname}/throwInOfferHandler`;

test('throw in offerHandler', async t => {
  const zoe = makeZoe(fakeVatAdmin);

  // pack the contract
  const bundle = await bundleSource(contractRoot);
  // install the contract
  const installation = await E(zoe).install(bundle);

  const { creatorFacet } = await E(zoe).startInstance(installation);

  const throwInOfferHandlerInvitation = E(
    creatorFacet,
  ).makeThrowInOfferHandlerInvitation();

  const throwInDepositToSeatInvitation = E(
    creatorFacet,
  ).makeThrowInDepositToSeatInvitation();

  const throwsInOfferHandlerSeat = E(zoe).offer(throwInOfferHandlerInvitation);

  await t.throwsAsync(() => E(throwsInOfferHandlerSeat).getOfferResult(), {
    message: 'error thrown in offerHandler in contract',
  });

  const throwsInDepositToSeatSeat = E(zoe).offer(
    throwInDepositToSeatInvitation,
  );

  await t.throwsAsync(() => E(throwsInDepositToSeatSeat).getOfferResult(), {
    message: `"brand" not found: (an object)`,
  });
});
