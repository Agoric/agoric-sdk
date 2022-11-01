// @ts-check

import { E } from '@endo/eventual-send';
import { AmountMath } from '@agoric/ertp';
import {
  provideDurableSetStore,
  makeScalarBigMapStore,
  vivifySingleton,
} from '@agoric/vat-data';

import { coerceAmountKeywordRecord } from '../cleanProposal.js';
import { makeIssuerRecord } from '../issuerRecord.js';
import { addToAllocation, subtractFromAllocation } from './allocationMath.js';

import '../../exported.js';
import '../internal-types.js';
import './internal-types.js';
import './types.js';

const { details: X } = assert;

// helpers for the code shared between MakeZCFMint and RegisterZCFMint

export const makeZCFMintFactory = async (
  zcfBaggage,
  recordIssuer,
  getAssetKindByBrand,
  makeEmptySeatKit,
  reallocateForZCFMint,
) => {
  // The set of baggages for zcfMints
  const zcfMintBaggageSet = provideDurableSetStore(zcfBaggage, 'baggageSet');

  /**
   * retrieve the state of the zcfMint from the baggage, and create a durable
   * singleton reflecting that state.
   *
   * @param {import('@agoric/vat-data').Baggage} zcfMintBaggage
   */
  const provideDurableZcfMint = async zcfMintBaggage => {
    const keyword = zcfMintBaggage.get('keyword');
    const zoeMint = zcfMintBaggage.get('zoeMint');
    const {
      brand: mintyBrand,
      issuer: mintyIssuer,
      displayInfo: mintyDisplayInfo,
    } = await E(zoeMint).getIssuerRecord();
    // AWAIT
    const mintyIssuerRecord = makeIssuerRecord(
      mintyBrand,
      mintyIssuer,
      mintyDisplayInfo,
    );
    recordIssuer(keyword, mintyIssuerRecord);

    const empty = AmountMath.makeEmpty(mintyBrand, mintyDisplayInfo.assetKind);
    const add = (total, amountToAdd) =>
      AmountMath.add(total, amountToAdd, mintyBrand);

    return vivifySingleton(
      zcfMintBaggage,
      'zcfMint',
      /** @type {ZCFMint} */
      {
        getIssuerRecord: () => {
          return mintyIssuerRecord;
        },
        /** @type {(gains: Record<string, Amount>, zcfSeat?: ZCFSeat) => ZCFSeat} */
        mintGains: (gains, zcfSeat = makeEmptySeatKit().zcfSeat) => {
          gains = coerceAmountKeywordRecord(gains, getAssetKindByBrand);
          const totalToMint = Object.values(gains).reduce(add, empty);
          assert(
            !zcfSeat.hasExited(),
            'zcfSeat must be active to mint gains for the zcfSeat',
          );
          const allocationPlusGains = addToAllocation(
            zcfSeat.getCurrentAllocation(),
            gains,
          );

          // Increment the stagedAllocation if it exists so that the
          // stagedAllocation is kept up to the currentAllocation
          if (zcfSeat.hasStagedAllocation()) {
            zcfSeat.incrementBy(gains);
          }

          // Offer safety should never be able to be violated here, as
          // we are adding assets. However, we keep this check so that
          // all reallocations are covered by offer safety checks, and
          // that any bug within Zoe that may affect this is caught.
          zcfSeat.isOfferSafe(allocationPlusGains) ||
            assert.fail(
              X`The allocation after minting gains ${allocationPlusGains} for the zcfSeat was not offer safe`,
            );
          // No effects above, apart from incrementBy. Note COMMIT POINT within
          // reallocateForZCFMint. The following two steps *should* be
          // committed atomically, but it is not a disaster if they are
          // not. If we minted only, no one would ever get those
          // invisibly-minted assets.
          E(zoeMint).mintAndEscrow(totalToMint);
          reallocateForZCFMint(zcfSeat, allocationPlusGains);
          return zcfSeat;
        },
        burnLosses: (losses, zcfSeat) => {
          losses = coerceAmountKeywordRecord(losses, getAssetKindByBrand);
          const totalToBurn = Object.values(losses).reduce(add, empty);
          assert(
            !zcfSeat.hasExited(),
            'zcfSeat must be active to burn losses from the zcfSeat',
          );
          const allocationMinusLosses = subtractFromAllocation(
            zcfSeat.getCurrentAllocation(),
            losses,
          );

          // verifies offer safety
          zcfSeat.isOfferSafe(allocationMinusLosses) ||
            assert.fail(
              X`The allocation after burning losses ${allocationMinusLosses} for the zcfSeat was not offer safe`,
            );

          // Decrement the stagedAllocation if it exists so that the
          // stagedAllocation is kept up to the currentAllocation
          if (zcfSeat.hasStagedAllocation()) {
            zcfSeat.decrementBy(losses);
          }

          // No effects above, apart from decrementBy. Note COMMIT POINT within
          // reallocateForZCFMint. The following two steps *should* be
          // committed atomically, but it is not a disaster if they are
          // not. If we only commit the allocationMinusLosses no one would
          // ever get the unburned assets.
          reallocateForZCFMint(zcfSeat, allocationMinusLosses);
          E(zoeMint).withdrawAndBurn(totalToBurn);
        },
      },
    );
  };

  const makeDurableZcfMint = async (keyword, zoeMint, zcfMintBaggage) => {
    zcfMintBaggage.init('keyword', keyword);
    zcfMintBaggage.init('zoeMint', zoeMint);
    return provideDurableZcfMint(zcfMintBaggage);
  };

  /**
   * zcfMintFactory has a method makeZCFMintInternal() that takes a keyword and the
   * promise returned by a makeZoeMint() call. makeZCFMintInternal() creates a new
   * baggage for the state of the zcfMint, makes a durableZcfMint from that
   * baggage, and registers that baggage to be revived with the factory.
   */
  const zcfMintFactory = vivifySingleton(zcfBaggage, 'zcfMintFactory', {
    makeZCFMintInternal: async (keyword, zoeMint) => {
      const zcfMintBaggage = makeScalarBigMapStore('zcfMintBaggage', {
        durable: true,
      });
      const zcfMint = await makeDurableZcfMint(
        keyword,
        zoeMint,
        zcfMintBaggage,
      );
      zcfMintBaggageSet.add(zcfMint);
      return zcfMint;
    },
  });

  for (const zcfMintBaggage of zcfMintBaggageSet.values()) {
    provideDurableZcfMint(zcfMintBaggage);
  }

  return zcfMintFactory;
};
harden(makeZCFMintFactory);
