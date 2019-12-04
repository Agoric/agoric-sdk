import { test } from 'tape-promise/tape';

import { vectorWith } from '../../../../contracts/helpers/extents';
import { setup } from '../../setupBasicMints';

test('vectorWith', t => {
  try {
    const { extentOps } = setup();
    const leftExtents = [4, 5, 6];
    const rightExtents = [3, 5, 10];
    t.deepEquals(vectorWith(extentOps, leftExtents, rightExtents), [7, 10, 16]);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
