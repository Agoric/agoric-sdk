// @ts-check

import { assert, details as X } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { AssetKind, AmountMath } from '@agoric/ertp';

import { objectMap } from '../objArrayConversion';
import { makeIssuerRecord } from '../issuerRecord';

export const setupMakeZCFMint = (
  assertUniqueKeyword,
  zoeInstanceAdmin,
  recordIssuer,
  reallocateInternal,
  makeEmptySeatKit,
) => {
  /** @type {MakeZCFMint} */
  const makeZCFMint = async (
    keyword,
    assetKind = AssetKind.NAT,
    displayInfo,
  ) => {
    assertUniqueKeyword(keyword);

    const zoeMintP = E(zoeInstanceAdmin).makeZoeMint(
      keyword,
      assetKind,
      displayInfo,
    );
    const { brand: mintyBrand, issuer: mintyIssuer } = await E(
      zoeMintP,
    ).getIssuerRecord();
    // AWAIT
    const mintyIssuerRecord = makeIssuerRecord(
      mintyBrand,
      mintyIssuer,
      assetKind,
      displayInfo,
    );
    recordIssuer(keyword, mintyIssuerRecord);

    /** @type {ZCFMint} */
    const zcfMint = Far('zcfMint', {
      getIssuerRecord: () => {
        return mintyIssuerRecord;
      },
      mintGains: (gains, zcfSeat = undefined) => {
        assert.typeof(
          gains,
          'object',
          X`gains ${gains} must be an amountKeywordRecord`,
        );
        assert(gains !== null, X`gains cannot be null`);
        if (zcfSeat === undefined) {
          zcfSeat = makeEmptySeatKit().zcfSeat;
        }
        assert(zcfSeat, X`zcfSeat must be defined`);
        let totalToMint = AmountMath.makeEmpty(mintyBrand, assetKind);
        const oldAllocation = zcfSeat.getCurrentAllocation();
        const updates = objectMap(gains, ([seatKeyword, amountToAdd]) => {
          assert(
            totalToMint.brand === amountToAdd.brand,
            X`Only digital assets of brand ${totalToMint.brand} can be minted in this call. ${amountToAdd} has the wrong brand.`,
          );
          totalToMint = AmountMath.add(totalToMint, amountToAdd);
          const oldAmount = oldAllocation[seatKeyword];
          // oldAmount being absent is equivalent to empty.
          const newAmount = oldAmount
            ? AmountMath.add(oldAmount, amountToAdd)
            : amountToAdd;
          return [seatKeyword, newAmount];
        });
        const newAllocation = harden({
          ...oldAllocation,
          ...updates,
        });
        // verifies offer safety
        const seatStaging = zcfSeat.stage(newAllocation);
        // No effects above. COMMIT POINT. The following two steps
        // *should* be committed atomically, but it is not a
        // disaster if they are not. If we minted only, no one would
        // ever get those invisibly-minted assets.
        E(zoeMintP).mintAndEscrow(totalToMint);
        reallocateInternal([seatStaging]);
        return zcfSeat;
      },
      burnLosses: (losses, zcfSeat) => {
        assert.typeof(
          losses,
          'object',
          X`losses ${losses} must be an amountKeywordRecord`,
        );
        assert(losses !== null, X`losses cannot be null`);
        let totalToBurn = AmountMath.makeEmpty(mintyBrand, assetKind);
        const oldAllocation = zcfSeat.getCurrentAllocation();
        const updates = objectMap(losses, ([seatKeyword, amountToSubtract]) => {
          assert(
            totalToBurn.brand === amountToSubtract.brand,
            X`Only digital assets of brand ${totalToBurn.brand} can be burned in this call. ${amountToSubtract} has the wrong brand.`,
          );
          totalToBurn = AmountMath.add(totalToBurn, amountToSubtract);
          const oldAmount = oldAllocation[seatKeyword];
          const newAmount = AmountMath.subtract(oldAmount, amountToSubtract);
          return [seatKeyword, newAmount];
        });
        const newAllocation = harden({
          ...oldAllocation,
          ...updates,
        });
        // verifies offer safety
        const seatStaging = zcfSeat.stage(newAllocation);
        // No effects above. Commit point. The following two steps
        // *should* be committed atomically, but it is not a
        // disaster if they are not. If we only commit the staging,
        // no one would ever get the unburned assets.
        reallocateInternal([seatStaging]);
        E(zoeMintP).withdrawAndBurn(totalToBurn);
      },
    });
    return zcfMint;
  };

  return makeZCFMint;
};
