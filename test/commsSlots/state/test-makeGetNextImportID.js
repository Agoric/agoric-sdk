import { test } from 'tape-promise/tape';
import { makeGetNextImportID } from '../../../src/kernel/commsSlots/state/makeGetNextImportID';

test('getNextImportID', t => {
  const id = makeGetNextImportID();
  const id1 = id.getNextImportID();
  const id2 = id.getNextImportID();
  t.equal(id1, 1);
  t.equal(id2, 2);
  t.end();
});
