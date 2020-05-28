/* eslint-disable no-use-before-define */
// @ts-check

import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';
import { makeGetInstanceHandle } from '../clientSupport';

// This contract mints non-fungible tokens and creates an instance of
// a selling contract to sell the tokens in exchange for some sort of money.

/** @typedef {import('../zoe').ContractFacet} ContractFacet */

// zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
export const makeContract = harden(
  /** @param {ContractFacet} zcf */ zcf => {
    const { terms } = zcf.getInstanceRecord();
    const { tokenName = 'token' } = terms;

    // Create the internal token mint
    const { issuer, mint, amountMath: tokenAmountMath } = produceIssuer(
      tokenName,
      'set',
    );

    const zoeService = zcf.getZoeService();

    const sellTokens = ({
      customExtentProperties,
      count,
      moneyIssuer,
      sellItemsInstallationHandle,
      pricePerItem,
    }) => {
      const tokenAmount = tokenAmountMath.make(
        harden(
          Array(count)
            // @ts-ignore
            .fill()
            .map((_, i) => {
              const tokenNumber = i + 1;
              return {
                ...customExtentProperties,
                number: tokenNumber,
              };
            }),
        ),
      );
      const tokenPayment = mint.mintPayment(harden(tokenAmount));
      // Note that the proposal `want` is empty
      // This is due to a current limitation in proposal
      // expressiveness:
      // https://github.com/Agoric/agoric-sdk/issues/855
      // It's impossible to know in advance how many token will be
      // sold, so it's not possible
      // to say `want: moola(3*22)`
      // in a future version of Zoe, it will be possible to express:
      // "i want n times moolas where n is the number of sold tokens"
      const proposal = harden({
        give: { Items: tokenAmount },
      });
      const paymentKeywordRecord = harden({ Items: tokenPayment });

      const issuerKeywordRecord = harden({
        Items: issuer,
        Money: moneyIssuer,
      });

      const sellItemsTerms = harden({
        pricePerItem,
      });
      return zoeService
        .makeInstance(
          sellItemsInstallationHandle,
          issuerKeywordRecord,
          sellItemsTerms,
        )
        .then(invite => {
          const getInstanceHandle = makeGetInstanceHandle(
            zoeService.getInviteIssuer(),
          );
          return getInstanceHandle(invite).then(instanceHandle => {
            return zoeService
              .offer(invite, proposal, paymentKeywordRecord)
              .then(offerResult => {
                return harden({
                  ...offerResult,
                  sellItemsInstanceHandle: instanceHandle,
                });
              });
          });
        });
    };

    const mintTokensHook = _offerHandle => {
      // outcome is an object with a sellTokens method
      return harden({ sellTokens });
    };

    return harden({
      invite: zcf.makeInvitation(mintTokensHook, 'mint tokens'),
      publicAPI: {
        getTokenIssuer: () => issuer,
      },
    });
  },
);
