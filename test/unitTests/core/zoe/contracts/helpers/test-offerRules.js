import { test } from 'tape-promise/tape';

import { makeAssetDesc } from '../../../../../../core/zoe/contracts/helpers/offerRules';
import { setup } from '../../setupBasicMints';

test('makeAssetDesc', t => {
  try {
    const { extentOps, labels, assays, mints } = setup();
    const assetDesc = makeAssetDesc(extentOps[0], labels[0], 10);
    t.deepEquals(assetDesc, assays[0].makeAssetDesc(10));
    const purse = mints[0].mint(assetDesc);
    t.deepEquals(purse.getBalance(), assetDesc);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
