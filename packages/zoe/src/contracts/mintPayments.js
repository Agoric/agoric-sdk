/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';

/*
This is the simplest contract to mint payments and send them to users
who request them. No offer safety is being enforced here.
*/

// zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
export const makeContract = harden(zcf => {
  // Create the internal token mint for a fungible digital asset
  const { issuer, mint, amountMath } = produceIssuer('tokens');

  // We need to tell Zoe about this issuer and add a keyword for the
  // issuer. Let's call this the 'Token' issuer.
  return zcf.addNewIssuer(issuer, 'Token').then(() => {
    // We need to wait for the promise to resolve (meaning that Zoe
    // has done the work of adding a new issuer).
    const offerHook = userOfferHandle => {
      // We will send everyone who makes an offer 1000 tokens

      // make the description of 1000 tokens
      const tokenAmount = amountMath.make(1000);

      // actually mint the new value of 1000 tokens
      const tokenPayment = mint.mintPayment(tokenAmount);

      // Now we must escrow the tokens with Zoe.
      let tempContractHandle;

      // We need to make an invite and store the offerHandle of that
      // invite for future use.
      const contractSelfInvite = zcf.makeInvitation(
        offerHandle => (tempContractHandle = offerHandle),
      );
      // To escrow the tokens, we must get the Zoe Service facet and
      // make an offer
      zcf
        .getZoeService()
        .offer(
          contractSelfInvite,
          harden({ give: { Token: tokenAmount } }),
          // escrow the actual tokens
          harden({ Token: tokenPayment }),
        )
        .then(() => {
          // Now that the tokens have been escrowed, the temporary
          // contract offer is currently allocated the tokens. We
          // should swap the allocations for the temporary contract
          // offer and the user's offer, so that the user eventually gets a
          // payout of the tokens
          zcf.reallocate(
            [tempContractHandle, userOfferHandle],
            [
              zcf.getCurrentAllocation(userOfferHandle),
              zcf.getCurrentAllocation(tempContractHandle),
            ],
          );
          // Let's complete both offers so the user gets a payout of
          // the tokens through Zoe.
          zcf.complete([tempContractHandle, userOfferHandle]);

          // Since the user is getting the payout through Zoe, we can
          // return anything here. Let's return some helpful instructions.
          return 'Offer completed. You should receive a payment from Zoe';
        });
    };

    // A function for making invites to this contract
    const makeInvite = () => zcf.makeInvitation(offerHook);

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
});
