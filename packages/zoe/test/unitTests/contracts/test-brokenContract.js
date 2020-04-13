// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import harden from '@agoric/harden';

import { makeZoe } from '../../../src/zoe';
// TODO: Remove setupBasicMints and rename setupBasicMints2
import { setup } from '../setupBasicMints2';

const automaticRefundRoot = `${__dirname}/brokenAutoRefund`;

test('zoe - brokenAutomaticRefund', async t => {
  t.plan(1);
  // Setup zoe and mints
  const { moolaR } = setup();
  const zoe = makeZoe();
  // Pack the contract.
  const { source, moduleFormat } = await bundleSource(automaticRefundRoot);
  const installationHandle = zoe.install(source, moduleFormat);

  const issuerKeywordRecord = harden({ Contribution: moolaR.issuer });

  // 1: Alice tries to create an instance, but the contract is badly written.
  t.rejects(
    () => zoe.makeInstance(installationHandle, issuerKeywordRecord),
    new Error('invites must be issued by InviteIssuer'),
    'makeInstance should have thrown',
  );
});
