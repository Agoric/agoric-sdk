import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { M, mustMatch } from '@endo/patterns';
import { TxStatus, PendingTxStatus } from '../src/constants.js';
import {
  CctpTxEvidenceShape,
  ChainPolicyShape,
  PendingTxShape,
} from '../src/type-guards.js';
import type { CctpTxEvidence, ChainPolicy } from '../src/types.js';

import { MockCctpTxEvidences } from './fixtures.js';

test('CctpTxEvidenceShape', t => {
  const specimen: CctpTxEvidence = harden(
    MockCctpTxEvidences.AGORIC_PLUS_OSMO(),
  );

  t.notThrows(() => mustMatch(specimen, CctpTxEvidenceShape));
});

test('PendingTxShape', t => {
  const specimen: CctpTxEvidence & { status: TxStatus } = harden({
    ...MockCctpTxEvidences.AGORIC_PLUS_OSMO(),
    status: PendingTxStatus.Observed,
  });

  t.notThrows(() => mustMatch(specimen, PendingTxShape));

  t.notThrows(() =>
    mustMatch(
      harden({ ...specimen, status: PendingTxStatus.Advanced }),
      PendingTxShape,
    ),
  );

  t.throws(() =>
    mustMatch(
      harden({ ...specimen, status: TxStatus.Settled }),
      PendingTxShape,
    ),
  );
});

test('ChainPolicyShape', t => {
  const policy: ChainPolicy = harden({
    attenuatedCttpBridgeAddresses: [
      '0xe298b93ffB5eA1FB628e0C0D55A43aeaC268e347',
    ],
    rateLimits: {
      blockWindow: 20_000_000_000n,
      blockWindowSize: 10,
      tx: 10_000_000_000n,
    },
    cctpTokenMessengerAddress: '0x19330d10D9Cc8751218eaf51E8885D058642E08A',
    chainId: 42161,
    confirmations: 2,
  });
  t.notThrows(() => mustMatch(policy, ChainPolicyShape));

  const a = policy.attenuatedCttpBridgeAddresses[0];
  const twoAddrs = harden({
    ...policy,
    attenuatedCttpBridgeAddresses: [a, a],
  });
  t.notThrows(() => mustMatch(twoAddrs, ChainPolicyShape));

  const threeAddrs = harden({
    ...policy,
    attenuatedCttpBridgeAddresses: [a, a, a],
  });
  t.notThrows(() => mustMatch(threeAddrs, ChainPolicyShape));

  const noAddrs = harden({
    ...policy,
    attenuatedCttpBridgeAddresses: [],
  });
  t.throws(() => mustMatch(noAddrs, ChainPolicyShape));
});
