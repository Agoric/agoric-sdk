/* eslint-disable no-use-before-define */
// @ts-check

import makeIssuerKit from '@agoric/ertp';
import { escrowAndAllocateTo } from '../contractSupport';

import '../../exported';

/**
 * This is a very simple contract that creates a new issuer and mints payments
 * from it, in order to give an example of how that can be done.  This contract
 * sends new tokens to anyone who requests them.
 *
 * Offer safety is not enforced here: the expectation is that most contracts
 * that want to do something similar would use the ability to mint new payments
 * internally rather than sharing that ability widely as this one does.
 *
 * makeInstance returns an invitation that, when exercised, provides 1000 of the
 * new tokens. await E(publicAPI).makeInvite() returns an invitation that accepts an
 * empty offer and provides 1000 tokens.
 *
 * @param {ContractFacet} zcf
 */
const start = (zcf, _terms) => {
  // Create the internal token mint for a fungible digital asset
  const { issuer, mint, amountMath } = makeIssuerKit('tokens');

  // We need to tell Zoe about this issuer and add a keyword for the
  // issuer. Let's call this the 'Token' issuer.
  return zcf.saveIssuer(issuer, 'Token').then(() => {
    // We need to wait for the promise to resolve (meaning that Zoe
    // has done the work of adding a new issuer).
    const mintPayment = (extent = 1000) => seat => {
      const amount = amountMath.make(extent);
      const payment = mint.mintPayment(amount);

      // Let's use a helper function which escrows the payment with
      // Zoe, and reallocates to the recipientHandle.
      return escrowAndAllocateTo(
        zcf,
        seat,
        { Token: amount },
        { Token: payment },
      ).then(() => {
        // Exit the seat so the user gets a payout
        seat.exit();

        // Since the user is getting the payout through Zoe, we can
        // return anything here. Let's return some helpful instructions.
        return 'Offer completed. You should receive a payment from Zoe';
      });
    };

    const creatorFacet = {
      // The creator of the instance can send invitations to anyone
      // they wish to.
      makeInvitation: extent =>
        zcf.makeInvitation(mintPayment(extent), 'mint a payment'),
      getTokenIssuer: () => issuer,
    };

    const publicFacet = {
      // Make the token issuer public. Note that only the mint can
      // make new digital assets. The issuer is ok to make public.
      getTokenIssuer: () => issuer,
    };

    // Return the creatorFacet to the creator, so they can make
    // invitations for others to get payments of tokens. Publish the
    // publicFacet.
    return harden({ creatorFacet, publicFacet });
  });
};

harden(start);
export { start };
