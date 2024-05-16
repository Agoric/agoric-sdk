import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import path from 'path';

import bundleSource from '@endo/bundle-source';

import { E } from '@endo/eventual-send';
import { makeZoeForTest } from '../../../tools/setup-zoe.js';
import { setup } from '../setupBasicMints.js';
import { makeFakeVatAdmin } from '../../../tools/fakeVatAdmin.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractRoot = `${dirname}/useObjExample.js`;

test('zoe - useObj', async t => {
  t.plan(3);
  const { moolaIssuer, moolaMint, moola } = setup();
  const { admin: fakeVatAdmin, vatAdminState } = makeFakeVatAdmin();
  const zoe = makeZoeForTest(fakeVatAdmin);

  // pack the contract
  const bundle = await bundleSource(contractRoot);
  // install the contract
  vatAdminState.installBundle('b1-use-obj', bundle);
  const installation = await E(zoe).installBundleID('b1-use-obj');

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(3n));

  // Alice creates an instance
  const issuerKeywordRecord = harden({
    Pixels: moolaIssuer,
  });
  const { publicFacet } = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord,
  );

  const invitation = E(publicFacet).makeInvitation();

  // Alice escrows with zoe
  const aliceProposal = harden({
    give: { Pixels: moola(3n) },
  });
  const alicePayments = { Pixels: aliceMoolaPayment };

  // Alice makes an offer
  const aliceSeat = await E(zoe).offer(
    invitation,
    aliceProposal,
    alicePayments,
  );

  const useObj = await E(aliceSeat).getOfferResult();

  t.is(
    useObj.colorPixels('purple'),
    `successfully colored 3 pixels purple`,
    `use of use object works`,
  );

  assert(aliceSeat.tryExit);
  aliceSeat.tryExit();

  const aliceMoolaPayoutPayment = await E(aliceSeat).getPayout('Pixels');

  t.deepEqual(
    await moolaIssuer.getAmountOf(aliceMoolaPayoutPayment),
    moola(3n),
    `alice gets everything she escrowed back`,
  );

  t.throws(
    () => useObj.colorPixels('purple'),
    { message: /the escrowing offer is no longer active/ },
    `use of use object fails once offer is withdrawn or amounts are reallocated`,
  );
});
