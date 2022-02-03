// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import path from 'path';

// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@endo/bundle-source';
import { E } from '@agoric/eventual-send';

import { makeZoeKit } from '../../../src/zoeService/zoe.js';
import { setup } from '../setupBasicMints.js';
import fakeVatAdmin from '../../../tools/fakeVatAdmin.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const automaticRefundRoot = `${dirname}/brokenAutoRefund.js`;

test('zoe - brokenAutomaticRefund', async t => {
  t.plan(1);
  // Setup zoe and mints
  const { moolaR } = setup();
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);
  // Pack the contract.
  const bundle = await bundleSource(automaticRefundRoot);
  const installation = await E(zoe).install(bundle);

  const issuerKeywordRecord = harden({ Contribution: moolaR.issuer });

  // Alice tries to create an instance, but the contract is badly
  // written.
  await t.throwsAsync(
    () => E(zoe).startInstance(installation, issuerKeywordRecord),
    { message: 'The contract did not correctly return a creatorInvitation' },
    'startInstance should have thrown',
  );
});
