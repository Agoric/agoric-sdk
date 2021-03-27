/* global __dirname */
// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

// noinspection ES6PreferShortImport
import { makeZoe } from '../../../src/zoeService/zoe';
import { setup } from '../setupBasicMints';
import fakeVatAdmin from '../../../src/contractFacet/fakeVatAdmin';

const automaticRefundRoot = `${__dirname}/brokenAutoRefund`;

test('zoe - brokenAutomaticRefund', async t => {
  t.plan(1);
  // Setup zoe and mints
  const { moolaR } = setup();
  const zoe = makeZoe(fakeVatAdmin);
  // Pack the contract.
  const bundle = await bundleSource(automaticRefundRoot);
  const installation = await zoe.install(bundle);

  const issuerKeywordRecord = harden({ Contribution: moolaR.issuer });

  // Alice tries to create an instance, but the contract is badly
  // written.
  await t.throwsAsync(
    () => zoe.startInstance(installation, issuerKeywordRecord),
    { message: 'The contract did not correctly return a creatorInvitation' },
    'startInstance should have thrown',
  );
});
