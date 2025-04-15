import test from '@endo/ses-ava/prepare-endo.js';

import type { Bech32Address } from '@agoric/cosmic-proto/address-hooks.js';
import type { NobleAddress } from '@agoric/fast-usdc';
import { prepareCctpTxEvidence } from './mocks.ts';
import { mustMatch } from '@agoric/internal';
import { CctpTxEvidenceShape } from '@agoric/fast-usdc/src/type-guards.js';

test('prepareCctpTxEvidence generates valid evidence', t => {
  const nobleAgoricChannelId = 'channel-123';
  const fakeCctpTxEvidence = prepareCctpTxEvidence(nobleAgoricChannelId);

  const mintAmt = 1000n;
  const userForwardingAddr = 'noble1...' as NobleAddress;
  const recipientAddress = 'agoric1...' as Bech32Address;

  const evidence = fakeCctpTxEvidence(
    mintAmt,
    userForwardingAddr,
    recipientAddress,
  );

  mustMatch(evidence, CctpTxEvidenceShape);
  t.is(evidence.tx.amount, mintAmt);
  t.is(evidence.tx.forwardingAddress, userForwardingAddr);
  t.is(typeof evidence.tx.sender, 'string');
  t.is(evidence.aux.forwardingChannel, nobleAgoricChannelId);
  t.is(evidence.aux.recipientAddress, recipientAddress);
  t.is(evidence.chainId, 42161);
});

test('prepareCctpTxEvidence generates unique txHash per call', t => {
  const nobleAgoricChannelId = 'channel-456';
  const fakeCctpTxEvidence = prepareCctpTxEvidence(nobleAgoricChannelId, 5); // Start count at 5

  const mintAmt1 = 100n;
  const userForwardingAddr1 = 'noble1aaa' as NobleAddress;
  const recipientAddress1 = 'agoric1aaa' as Bech32Address;
  const evidence1 = fakeCctpTxEvidence(
    mintAmt1,
    userForwardingAddr1,
    recipientAddress1,
  );
  mustMatch(evidence1, CctpTxEvidenceShape);

  const mintAmt2 = 200n;
  const userForwardingAddr2 = 'noble1bbb' as NobleAddress;
  const recipientAddress2 = 'agoric1bbb' as Bech32Address;
  const evidence2 = fakeCctpTxEvidence(
    mintAmt2,
    userForwardingAddr2,
    recipientAddress2,
  );
  mustMatch(evidence2, CctpTxEvidenceShape);

  t.not(evidence1.txHash, evidence2.txHash, 'txHash should be unique');
  t.true(
    evidence1.txHash.endsWith('05'),
    'First txHash should end with base call count',
  );
  t.true(
    evidence2.txHash.endsWith('06'),
    'Second txHash should end with incremented call count',
  );
});
