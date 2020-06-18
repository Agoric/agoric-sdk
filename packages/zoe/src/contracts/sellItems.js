/* eslint-disable no-use-before-define */
// @ts-check

import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import { makeZoeHelpers, defaultAcceptanceMsg } from '../contractSupport';

/** @typedef {import('../zoe').ContractFacet} ContractFacet */

/**
 * Sell items in exchange for money. Items may be fungible or
 * non-fungible and multiple items may be bought at once. Money must
 * be fungible.
 *
 * The `pricePerItem` is to be set in the terms. It is expected that all items
 * are sold for the same uniform price.
 */

// zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
export const makeContract = harden(
  /** @param {ContractFacet} zcf */ zcf => {
    const allKeywords = ['Items', 'Money'];
    const {
      assertKeywords,
      rejectOffer,
      checkHook,
      assertNatMathHelpers,
    } = makeZoeHelpers(zcf);
    assertKeywords(harden(allKeywords));

    const { pricePerItem } = zcf.getInstanceRecord().terms;
    assertNatMathHelpers(pricePerItem.brand);
    let sellerOfferHandle;

    const sellerOfferHook = offerHandle => {
      sellerOfferHandle = offerHandle;
      return defaultAcceptanceMsg;
    };

    const buyerOfferHook = buyerOfferHandle => {
      const { brandKeywordRecord } = zcf.getInstanceRecord();
      const [sellerAllocation, buyerAllocation] = zcf.getCurrentAllocations(
        [sellerOfferHandle, buyerOfferHandle],
        [brandKeywordRecord, brandKeywordRecord],
      );
      const currentItemsForSale = sellerAllocation.Items;
      const providedMoney = buyerAllocation.Money;

      const { proposal } = zcf.getOffer(buyerOfferHandle);
      const wantedItems = proposal.want.Items;
      const numItemsWanted = wantedItems.extent.length;
      const totalCostExtent = pricePerItem.extent * numItemsWanted;
      const moneyAmountMaths = zcf.getAmountMath(pricePerItem.brand);
      const itemsAmountMath = zcf.getAmountMath(wantedItems.brand);

      const totalCost = moneyAmountMaths.make(totalCostExtent);

      // Check that the wanted items are still for sale.
      if (!itemsAmountMath.isGTE(currentItemsForSale, wantedItems)) {
        return rejectOffer(
          buyerOfferHandle,
          `Some of the wanted items were not available for sale`,
        );
      }

      // Check that the money provided to pay for the items is greater than the totalCost.
      if (!moneyAmountMaths.isGTE(providedMoney, totalCost)) {
        return rejectOffer(
          buyerOfferHandle,
          `More money (${totalCost}) is required to buy these items`,
        );
      }

      // Reallocate and complete the buyer offer.
      const newSellerAllocation = {
        Money: moneyAmountMaths.add(sellerAllocation.Money, providedMoney),
        Items: itemsAmountMath.subtract(sellerAllocation.Items, wantedItems),
      };

      const newBuyerAllocation = {
        Money: moneyAmountMaths.getEmpty(),
        Items: itemsAmountMath.add(buyerAllocation.Items, wantedItems),
      };

      zcf.reallocate(
        [sellerOfferHandle, buyerOfferHandle],
        [newSellerAllocation, newBuyerAllocation],
      );
      zcf.complete([buyerOfferHandle]);
      return defaultAcceptanceMsg;
    };

    const buyerExpected = harden({
      want: { Items: null },
      give: { Money: null },
    });

    zcf.initPublicAPI(
      harden({
        makeBuyerInvite: () => {
          const itemsAmount = zcf.getCurrentAllocation(sellerOfferHandle).Items;
          const itemsAmountMath = zcf.getAmountMath(itemsAmount.brand);
          assert(
            sellerOfferHandle && !itemsAmountMath.isEmpty(itemsAmount),
            details`no items are for sale`,
          );
          return zcf.makeInvitation(
            checkHook(buyerOfferHook, buyerExpected),
            'buyer',
          );
        },
        getAvailableItems: () => {
          if (!sellerOfferHandle) {
            throw new Error(`no items have been escrowed`);
          }
          return zcf.getCurrentAllocation(sellerOfferHandle).Items;
        },
        getItemsIssuer: () => zcf.getInstanceRecord().issuerKeywordRecord.Items,
      }),
    );

    return zcf.makeInvitation(sellerOfferHook, 'seller');
  },
);
