import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';
import { E } from '@agoric/eventual-send';

// noinspection ES6PreferShortImport
import { makeZoe } from '../../../src/zoeService/zoe';
import { setup } from '../setupBasicMints';
import fakeVatAdmin from './fakeVatAdmin';

const grifterRoot = `${__dirname}/grifter`;

test('zoe - grifter tries to steal; prevented by offer safety', async t => {
  t.plan(1);
  // Setup zoe and mints
  const { moola, moolaR, moolaMint, bucksR, bucks } = setup();
  const zoe = makeZoe(fakeVatAdmin);
  // Pack the contract.
  const bundle = await bundleSource(grifterRoot);
  const installationHandle = await zoe.install(bundle);

  const issuerKeywordRecord = harden({
    Asset: bucksR.issuer,
    Price: moolaR.issuer,
  });

  const { creatorInvitation: malloryInvitation } = await zoe.startInstance(
    installationHandle,
    issuerKeywordRecord,
  );

  // Mallory doesn't need any money
  const malloryProposal = harden({
    want: { Price: moola(37) },
  });
  const mallorySeat = await zoe.offer(
    malloryInvitation,
    malloryProposal,
    harden({}),
  );

  const vicInvitationP = await E(mallorySeat).getOfferResult();

  const vicMoolaPayment = moolaMint.mintPayment(moola(37));
  const vicProposal = harden({
    give: { Price: moola(37) },
    want: { Asset: bucks(24) },
    exit: { onDemand: null },
  });
  const vicPayments = { Price: vicMoolaPayment };
  const vicSeat = await zoe.offer(vicInvitationP, vicProposal, vicPayments);

  t.rejects(
    E(vicSeat).getOfferResult(),
    /The reallocation was not offer safe/,
    `vicOffer is rejected`,
  );
});
