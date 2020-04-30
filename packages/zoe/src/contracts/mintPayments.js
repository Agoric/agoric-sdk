/* eslint-disable no-use-before-define */
// @ts-check

import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';
import { makeZoeHelpers } from '../contractSupport';

/*
This is the simplest contract to mint payments and send them to users
who request them. No offer safety is being enforced here.
*/

/** @typedef {import('../zoe').ContractFacet} ContractFacet */

// zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
export const makeContract = harden(
  /** @param {ContractFacet} zcf */ zcf => {
    // Create the internal token mint for a fungible digital asset
    const { issuer, mint, amountMath } = produceIssuer('tokens');

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

      return harden({
        // return an invite to the creator of the contract instance
        // through Zoe
        invite: makeInvite(),
        publicAPI: {
          // provide a way for anyone who knows the instanceHandle of
          // the contract to make their own invite.
          makeInvite,
          // make the token issuer public. Note that only the mint can
          // make new digital assets. The issuer is ok to make public.
          getTokenIssuer: () => issuer,
        },
      });
    });
  },
);
