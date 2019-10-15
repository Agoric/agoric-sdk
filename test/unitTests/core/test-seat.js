import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeSeatMint } from '../../../core/seatMint';
import { offerEqual } from '../../../core/zoe/contractUtils';
import { setup } from './zoe/setupBasicMints';
import { insist } from '../../../util/insist';

/*
 * A seat extent may look like:
 *
 * {
 *   id: {},
 *   offerToBeMade: [rule1, rule2],
 * }
 *
 * or:
 *
 * {
 *   id: {},
 *   offerMade: [rule1, rule2],
 * }
 *
 */

test('seatMint', async t => {
  try {
    const { assays, extentOps } = setup();
    const { seatMint, addUseObj } = makeSeatMint();

    const makeUseObj = extent => {
      insist(extent !== null)`the asset is empty or already used`;
      if (extent.offerToBeMade) {
        return harden({
          makeOffer: offer => {
            insist(offerEqual(extentOps, offer, extent.offerToBeMade));
            // do things with the offer
            return true;
          },
        });
      }
      if (extent.offerMade) {
        return harden({
          claim: () => {
            return [];
          },
        });
      }
      return harden({});
    };

    const purse1Extent = harden({
      id: harden({}),
      offerToBeMade: [
        { rule: 'offerExactly', assetDesc: assays[0].makeAssetDesc(8) },
        { rule: 'wantExactly', assetDesc: assays[1].makeAssetDesc(6) },
      ],
    });

    const purse1 = seatMint.mint(purse1Extent);
    t.deepEqual(purse1.getBalance().extent, purse1Extent);
    addUseObj(purse1Extent.id, makeUseObj(purse1Extent));

    const useObjPurse1 = await purse1.unwrap();
    // purse1 should be empty at this point. Note that `withdrawAll` doesn't
    // destroy purses; it just empties the balance.
    t.deepEqual(purse1.getBalance().extent, null);

    t.rejects(purse1.unwrap(), /the purse is empty or already used/);

    t.equal(useObjPurse1.makeOffer(purse1Extent.offerToBeMade), true);

    const purse2Extent = harden({
      id: harden({}),
      offerMade: [
        { rule: 'offerExactly', assetDesc: assays[0].makeAssetDesc(8) },
        { rule: 'wantExactly', assetDesc: assays[1].makeAssetDesc(6) },
      ],
    });

    const purse2 = seatMint.mint(purse2Extent);
    t.deepEqual(purse2.getBalance().extent, purse2Extent);
    addUseObj(purse2Extent.id, makeUseObj(purse2Extent));

    const useObjPurse2 = await purse2.unwrap();
    // purse1 should be empty at this point. Note that `withdrawAll` doesn't
    // destroy purses; it just empties the balance.
    t.deepEqual(purse2.getBalance().extent, null);

    t.rejects(purse2.unwrap(), /the purse is empty or already used/);

    t.deepEqual(useObjPurse2.claim(), []);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
