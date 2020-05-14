/* eslint-disable no-use-before-define */
// @ts-check

import harden from '@agoric/harden';
import { makeZoeHelpers, defaultAcceptanceMsg } from '../contractSupport';

/** @typedef {import('../zoe').ContractFacet} ContractFacet */

// zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
export const makeContract = harden(
  /** @param {ContractFacet} zcf */ zcf => {
    const { assertKeywords, rejectOffer, checkHook } = makeZoeHelpers(zcf);
    assertKeywords(harden(['Items', 'Money']));

    const { terms } = zcf.getInstanceRecord();
    const { pricePerItem } = terms;

    let sellerOfferHandle;

    const sellerOfferHook = offerHandle => {
      sellerOfferHandle = offerHandle;
      return defaultAcceptanceMsg;
    };

    const buyerOfferHook = buyerOfferHandle => {
      const sellerAllocation = zcf.getCurrentAllocation(sellerOfferHandle);
      const buyerAllocation = zcf.getCurrentAllocation(buyerOfferHandle);
      const currentItemsForSale = sellerAllocation.Items;
      const providedMoney = buyerAllocation.Money;

      const { proposal } = zcf.getOffer(buyerOfferHandle);
      const wantedItems = proposal.want.Items;
      const numItemsWanted = wantedItems.extent.length;
      const amountMaths = zcf.getAmountMaths(['Items', 'Money']);
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
          `More money (${pricePerItem.extent}) is required to buy these items`,
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
    };

    const buyerExpected = harden({
      want: { Items: null },
      give: { Money: null },
    });

    return harden({
      invite: zcf.makeInvitation(sellerOfferHook, 'seller'),
      publicAPI: {
        makeBuyerInvite: () =>
          zcf.makeInvitation(
            checkHook(buyerOfferHook, buyerExpected),
            'buy items',
          ),
        getAvailableItems: () =>
          zcf.getCurrentAllocation(sellerOfferHandle).Items,
        getItemsIssuer: () => zcf.getInstanceRecord().issuerKeywordRecord.Items,
      },
    });
  },
);
