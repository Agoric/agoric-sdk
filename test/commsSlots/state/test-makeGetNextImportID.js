import { test } from 'tape-promise/tape';
import { makeAllocateID } from '../../../src/kernel/commsSlots/state/makeAllocateID';

test('allocateID', t => {
  const id = makeAllocateID();
  const id1 = id.allocateID();
  const id2 = id.allocateID();
  t.equal(id1, 1);
  t.equal(id2, 2);
  t.end();
});
