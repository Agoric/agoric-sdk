/* eslint-disable no-use-before-define */
// @ts-check

import { assert, details } from '@agoric/assert';
import {
  assertIssuerKeywords,
  trade,
  defaultAcceptanceMsg,
  assertProposalKeywords,
  assertUsesNatMath,
} from '../contractSupport';

import '../../exported';

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
 * @type {ContractStartFn}
 */
const start = zcf => {
  const {
    pricePerItem,
    issuers,
    maths: { Money: moneyMath, Items: itemsMath },
  } = zcf.getTerms();
  const allKeywords = ['Items', 'Money'];
  assertIssuerKeywords(zcf, harden(allKeywords));
  assertUsesNatMath(zcf, pricePerItem.brand);

  let sellerSeat;

  const sell = seat => {
    sellerSeat = seat;
    return defaultAcceptanceMsg;
  };

  const buy = buyerSeat => {
    const currentItemsForSale = sellerSeat.getAmountAllocated('Items');
    const providedMoney = buyerSeat.getAmountAllocated('Money');

    const {
      want: { Items: wantedItems },
    } = buyerSeat.getProposal();

    // Check that the wanted items are still for sale.
    if (!itemsMath.isGTE(currentItemsForSale, wantedItems)) {
      const rejectMsg = `Some of the wanted items were not available for sale`;
      throw buyerSeat.kickOut(rejectMsg);
    }

    const totalCost = moneyMath.make(
      pricePerItem.value * wantedItems.value.length,
    );

    // Check that the money provided to pay for the items is greater than the totalCost.
    if (!moneyMath.isGTE(providedMoney, totalCost)) {
      const rejectMsg = `More money (${totalCost}) is required to buy these items`;
      throw buyerSeat.kickOut(rejectMsg);
    }

    // Reallocate. We are able to trade by only defining the gains
    // (omitting the losses) because the keywords for both offers are
    // the same, so the gains for one offer are the losses for the
    // other.
    trade(
      zcf,
      { seat: sellerSeat, gains: { Money: providedMoney } },
      { seat: buyerSeat, gains: { Items: wantedItems } },
    );

    // exit the buyer seat
    buyerSeat.exit();
    return defaultAcceptanceMsg;
  };

  const getAvailableItems = () => {
    assert(sellerSeat && !sellerSeat.hasExited(), `no items are for sale`);
    return sellerSeat.getAmountAllocated('Items');
  };

  const getItemsIssuer = () => issuers.Items;

  /** @type {SellItemsPublicFacet} */
  const publicFacet = {
    getAvailableItems,
    getItemsIssuer,
  };

  /** @type {SellItemsCreatorFacet} */
  const creatorFacet = {
    makeBuyerInvitation: () => {
      const itemsAmount = sellerSeat.getAmountAllocated('Items');
      assert(
        sellerSeat && !itemsMath.isEmpty(itemsAmount),
        details`no items are for sale`,
      );
      const buyerExpected = harden({
        want: { Items: null },
        give: { Money: null },
      });
      return zcf.makeInvitation(
        assertProposalKeywords(buy, buyerExpected),
        'buyer',
      );
    },
    getAvailableItems,
    getItemsIssuer,
  };

  const creatorInvitation = zcf.makeInvitation(sell, 'seller');

  return harden({ creatorFacet, creatorInvitation, publicFacet });
};

harden(start);
export { start };
