import { test } from 'tape-promise/tape';

import { makeUnits } from '../../../..//contracts/helpers/offerRules';
import { setup } from '../../setupBasicMints';

test('makeUnits', t => {
  try {
    const { extentOps, labels, assays, mints } = setup();
    const units = makeUnits(extentOps[0], labels[0], 10);
    t.deepEquals(units, assays[0].makeUnits(10));
    const purse = mints[0].mint(units);
    t.deepEquals(purse.getBalance(), units);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
