/* eslint-disable no-use-before-define */
// @ts-check

import { assert, details } from '@agoric/assert';
import {
  assertIssuerKeywords,
  trade,
  defaultAcceptanceMsg,
  assertProposalShape,
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
 * When all the items have been sold, the contract will terminate, triggering
 * the creator's payout. If the creator has an onDemand exit clause, they can
 * exit early to collect their winnings. The remaining items will still be
 * available for sale, but the creator won't be able to collect later earnings.
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

  /** @type {SellItemsPublicFacet} */
  const publicFacet = {
    getAvailableItems: () => {
      assert(sellerSeat && !sellerSeat.hasExited(), `no items are for sale`);
      return sellerSeat.getAmountAllocated('Items');
    },
    getItemsIssuer: () => issuers.Items,
  };

  const buy = buyerSeat => {
    assertProposalShape(buyerSeat, {
      want: { Items: null },
      give: { Money: null },
    });
    const currentItemsForSale = sellerSeat.getAmountAllocated('Items');
    const providedMoney = buyerSeat.getAmountAllocated('Money');

    const {
      want: { Items: wantedItems },
    } = buyerSeat.getProposal();

    // Check that the wanted items are still for sale.
    if (!itemsMath.isGTE(currentItemsForSale, wantedItems)) {
      const rejectMsg = `Some of the wanted items were not available for sale`;
      throw buyerSeat.kickOut(new Error(rejectMsg));
    }

    // All items are the same price.
    const totalCost = moneyMath.make(
      pricePerItem.value * wantedItems.value.length,
    );

    // Check that the money provided to pay for the items is greater than the totalCost.
    assert(
      moneyMath.isGTE(providedMoney, totalCost),
      details`More money (${totalCost}) is required to buy these items`,
    );

    // Reallocate. We are able to trade by only defining the gains
    // (omitting the losses) because the keywords for both offers are
    // the same, so the gains for one offer are the losses for the
    // other.
    trade(
      zcf,
      { seat: sellerSeat, gains: { Money: providedMoney } },
      { seat: buyerSeat, gains: { Items: wantedItems } },
    );

    // The buyer's offer has been processed.
    buyerSeat.exit();

    if (itemsMath.isEmpty(publicFacet.getAvailableItems())) {
      zcf.shutdown();
    }
    return defaultAcceptanceMsg;
  };

  /** @type {SellItemsCreatorFacet} */
  const creatorFacet = {
    makeBuyerInvitation: () => {
      const itemsAmount = sellerSeat.getAmountAllocated('Items');
      assert(
        sellerSeat && !itemsMath.isEmpty(itemsAmount),
        details`no items are for sale`,
      );
      return zcf.makeInvitation(buy, 'buyer');
    },
    getAvailableItems: publicFacet.getAvailableItems,
    getItemsIssuer: publicFacet.getItemsIssuer,
  };

  const creatorInvitation = zcf.makeInvitation(sell, 'seller');

  return harden({ creatorFacet, creatorInvitation, publicFacet });
};

harden(start);
export { start };
