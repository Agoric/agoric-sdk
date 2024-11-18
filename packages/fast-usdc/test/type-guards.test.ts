import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { mustMatch } from '@endo/patterns';
import { TxStatus, PendingTxStatus } from '../src/constants.js';
import { CctpTxEvidenceShape, PendingTxShape } from '../src/type-guards.js';
import type { CctpTxEvidence } from '../src/types.js';

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
