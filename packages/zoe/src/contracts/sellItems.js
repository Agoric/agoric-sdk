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
    const {
      assertKeywords,
      rejectOffer,
      checkHook,
      assertNatMathHelpers,
    } = makeZoeHelpers(zcf);
    assertKeywords(harden(['Items', 'Money']));

    const { terms } = zcf.getInstanceRecord();
    assertNatMathHelpers('Money');

    const { pricePerItem } = terms;

    const amountMaths = zcf.getAmountMaths(['Items', 'Money']);

    const buyerExpected = harden({
      want: { Items: null },
      give: { Money: null },
    });

    const makeBuyerOfferHook = sellerOfferHandle => buyerOfferHandle => {
      const sellerAllocation = zcf.getCurrentAllocation(sellerOfferHandle);
      const buyerAllocation = zcf.getCurrentAllocation(buyerOfferHandle);
      const currentItemsForSale = sellerAllocation.Items;
      const providedMoney = buyerAllocation.Money;

      const { proposal } = zcf.getOffer(buyerOfferHandle);
      const wantedItems = proposal.want.Items;
      const numItemsWanted = wantedItems.extent.length;
      const totalCostExtent = pricePerItem.extent * numItemsWanted;
      const totalCost = amountMaths.Money.make(totalCostExtent);

      // Check that the wanted items are still for sale.
      if (!amountMaths.Items.isGTE(currentItemsForSale, wantedItems)) {
        return rejectOffer(
          buyerOfferHandle,
          `Some of the wanted items were not available for sale`,
        );
      }

      // Check that the money provided to pay for the items is greater than the totalCost.
      if (!amountMaths.Money.isGTE(providedMoney, totalCost)) {
        return rejectOffer(
          buyerOfferHandle,
          `More money (${totalCost}) is required to buy these items`,
        );
      }

      // Reallocate and complete the buyer offer.
      const newSellerAllocation = {
        Money: amountMaths.Money.add(sellerAllocation.Money, providedMoney),
        Items: amountMaths.Items.subtract(sellerAllocation.Items, wantedItems),
      };

      const newBuyerAllocation = {
        Money: amountMaths.Money.getEmpty(),
        Items: amountMaths.Items.add(buyerAllocation.Items, wantedItems),
      };

      zcf.reallocate(
        [sellerOfferHandle, buyerOfferHandle],
        [newSellerAllocation, newBuyerAllocation],
      );
      zcf.complete([buyerOfferHandle]);
      return defaultAcceptanceMsg;
    };

    const sellerOfferHook = sellerOfferHandle => {
      zcf.initPublicAPI(
        harden({
          makeBuyerInvite: () => {
            assert(
              !amountMaths.Items.isEmpty(
                zcf.getCurrentAllocation(sellerOfferHandle).Items,
              ),
              details`no items are for sale`,
            );
            return zcf.makeInvitation(
              checkHook(makeBuyerOfferHook(sellerOfferHandle), buyerExpected),
              'buyer',
            );
          },
          getAvailableItems: () =>
            zcf.getCurrentAllocation(sellerOfferHandle).Items,
          getItemsIssuer: () =>
            zcf.getInstanceRecord().issuerKeywordRecord.Items,
        }),
      );
      return defaultAcceptanceMsg;
    };

    return zcf.makeInvitation(sellerOfferHook, 'seller');
  },
);
