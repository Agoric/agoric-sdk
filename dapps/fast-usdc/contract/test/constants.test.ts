import test from 'ava';
import '@agoric/swingset-liveslots/tools/prepare-test-env.js';

import { TxStatus, PendingTxStatus } from '../src/constants.js';

const { values } = Object;

test('PendingTxStatus is a subset of TxStatus', t => {
  const txStatuses = values(TxStatus);
  const difference = values(PendingTxStatus).filter(
    status => !txStatuses.includes(status),
  );
  t.deepEqual(difference, [], 'PendingTxStatus value(s) not in TxStatus');
});
