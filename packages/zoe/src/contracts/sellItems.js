/* eslint-disable no-use-before-define */
// @ts-check

import { assert, details } from '@agoric/assert';
import { makeZoeHelpers, defaultAcceptanceMsg } from '../contractSupport';

import '../types';

/**
 * Sell items in exchange for money. Items may be fungible or
 * non-fungible and multiple items may be bought at once. Money must
 * be fungible.
 *
 * The `pricePerItem` is to be set in the terms. It is expected that all items
 * are sold for the same uniform price.
 *
 * The initial offer should be { give: { Items: items } }, accompanied by
 * terms as described above.
 * Buyers use offers that match { want: { Items: items } give: { Money: m } }.
 * The items provided should match particular items that the seller still has
 * available to sell, and the money should be pricePerItem times the number of
 * items requested.
 *
 * @param {ContractFacet} zcf
 */
const makeContract = zcf => {
  const allKeywords = ['Items', 'Money'];
  const {
    assertKeywords,
    rejectOffer,
    checkHook,
    assertNatMathHelpers,
    trade,
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
    const numItemsWanted = wantedItems.value.length;
    const totalCostValue = pricePerItem.value * numItemsWanted;
    const moneyAmountMaths = zcf.getAmountMath(pricePerItem.brand);
    const itemsAmountMath = zcf.getAmountMath(wantedItems.brand);

    const totalCost = moneyAmountMaths.make(totalCostValue);

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

    // Reallocate. We are able to trade by only defining the gains
    // (omitting the losses) because the keywords for both offers are
    // the same, so the gains for one offer are the losses for the
    // other.
    trade(
      { offerHandle: sellerOfferHandle, gains: { Money: providedMoney } },
      { offerHandle: buyerOfferHandle, gains: { Items: wantedItems } },
    );

    // Complete the buyer offer.
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
};

harden(makeContract);
export { makeContract };
