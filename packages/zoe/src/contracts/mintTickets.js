/* eslint-disable no-use-before-define */
// @ts-check

import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';
import { makeGetInstanceHandle } from '../clientSupport';

/** @typedef {import('../zoe').ContractFacet} ContractFacet */

// zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
export const makeContract = harden(
  /** @param {ContractFacet} zcf */ zcf => {
    // Create the internal ticket mint
    const { issuer, mint, amountMath: ticketAmountMath } = produceIssuer(
      'operaTickets',
      'set',
    );

    const zoeService = zcf.getZoeService();

    const mintAndSellTickets = ({
      show,
      start,
      count,
      moneyIssuer,
      sellItemsInstallationHandle,
      pricePerItem,
    }) => {
      const ticketsAmount = ticketAmountMath.make(
        harden(
          Array(count)
            // @ts-ignore
            .fill()
            .map((_, i) => {
              const ticketNumber = i + 1;
              return {
                show,
                start,
                number: ticketNumber,
              };
            }),
        ),
      );
      const ticketsPayment = mint.mintPayment(harden(ticketsAmount));
      // Note that the proposal `want` is empty
      // This is due to a current limitation in proposal
      // expressiveness:
      // https://github.com/Agoric/agoric-sdk/issues/855
      // It's impossible to know in advance how many tickets will be
      // sold, so it's not possible
      // to say `want: moola(3*22)`
      // in a future version of Zoe, it will be possible to express:
      // "i want n times moolas where n is the number of sold tickets"
      const proposal = harden({
        give: { Items: ticketsAmount },
      });
      const paymentKeywordRecord = harden({ Items: ticketsPayment });

      const issuerKeywordRecord = harden({
        Items: issuer,
        Money: moneyIssuer,
      });

      const terms = harden({
        pricePerItem,
      });
      return zoeService
        .makeInstance(sellItemsInstallationHandle, issuerKeywordRecord, terms)
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

    const mintTicketsForShowHook = _offerHandle => {
      // outcome is an object with a mintTickets method
      return harden({ mintAndSellTickets });
    };

    return harden({
      invite: zcf.makeInvitation(mintTicketsForShowHook, 'venue'),
      publicAPI: {
        getTicketIssuer: () => issuer,
      },
    });
  },
);
