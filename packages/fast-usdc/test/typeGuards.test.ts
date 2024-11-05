import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { mustMatch } from '@endo/patterns';
import { TxStatus } from '../src/constants.js';
import {
  CctpTxEvidenceShape,
  StatusManagerEntryShape,
} from '../src/typeGuards.js';
import type { CctpTxEvidence } from '../src/types.js';

import { MockCctpTxEvidences } from './fixtures.js';

test('CctpTxEvidenceShape', t => {
  const specimen: CctpTxEvidence = harden(
    MockCctpTxEvidences.AGORIC_PLUS_OSMO(),
  );

  t.notThrows(() => mustMatch(specimen, CctpTxEvidenceShape));
});

test('StatusManagerEntryShape', t => {
  const specimen: CctpTxEvidence & { status: TxStatus } = harden({
    ...MockCctpTxEvidences.AGORIC_PLUS_OSMO(),
    status: TxStatus.OBSERVED,
  });

  t.notThrows(() => mustMatch(specimen, StatusManagerEntryShape));
});
