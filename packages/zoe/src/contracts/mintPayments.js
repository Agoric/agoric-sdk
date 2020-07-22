/* eslint-disable no-use-before-define */
// @ts-check

import makeIssuerKit from '@agoric/ertp';
import { makeZoeHelpers } from '../contractSupport';

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
const makeContract = zcf => {
  // Create the internal token mint for a fungible digital asset
  const { issuer, mint, amountMath } = makeIssuerKit('tokens');

  const zoeHelpers = makeZoeHelpers(zcf);

  // We need to tell Zoe about this issuer and add a keyword for the
  // issuer. Let's call this the 'Token' issuer.
  return zcf.addNewIssuer(issuer, 'Token').then(() => {
    // We need to wait for the promise to resolve (meaning that Zoe
    // has done the work of adding a new issuer).
    const offerHook = offerHandle => {
      // We will send everyone who makes an offer 1000 tokens

      const tokens1000 = amountMath.make(1000);
      const payment = mint.mintPayment(tokens1000);

      // Let's use a helper function which escrows the payment with
      // Zoe, and reallocates to the recipientHandle.
      return zoeHelpers
        .escrowAndAllocateTo({
          amount: tokens1000,
          payment,
          keyword: 'Token',
          recipientHandle: offerHandle,
        })
        .then(() => {
          // Complete the user's offer so that the user gets a payout
          zcf.complete(harden([offerHandle]));

          // Since the user is getting the payout through Zoe, we can
          // return anything here. Let's return some helpful instructions.
          return 'Offer completed. You should receive a payment from Zoe';
        });
    };

    // A function for making invites to this contract
    const makeInvite = () => zcf.makeInvitation(offerHook, 'mint a payment');

    zcf.initPublicAPI(
      harden({
        // provide a way for anyone who knows the instanceHandle of
        // the contract to make their own invite.
        makeInvite,
        // make the token issuer public. Note that only the mint can
        // make new digital assets. The issuer is ok to make public.
        getTokenIssuer: () => issuer,
      }),
    );

    // return an invite to the creator of the contract instance
    // through Zoe
    return makeInvite();
  });
};

harden(makeContract);
export { makeContract };
