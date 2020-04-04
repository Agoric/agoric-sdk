/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';
import { makeZoeHelpers } from './helpers/zoeHelpers';

/*
  Roles in the arrangement:
  - Contract creator: describes the contract with:
    - number of seats, show, date/time of start
    - expected (ERTP) amount per ticket (we assume all tickets cost the same)
  - Smart Contract: 
    - mints the tickets
    - provides the seats
  - Auditorium (unique contract seat, usually taken by the contract creator): the person hosting 
  the Opera show, selling the tickets and getting the payment back
  - Ticket buyers (contract seat created on demand): 
    - can see the available opera show seats
    - can consult the terms
    - can redeem the zoe invite with the proper payment to get the ticket back

  ERTP and Zoe are considered to be the most highly trusted pieces of code by everyone
  They are more trusted than the code of this contract
  As a consequence, they are going to be leveraged as much as possible by this contract
  to increase its trustworthiness and by the contract users
  
*/

export const makeContract = harden(zoe => {
  // Create the internal ticket mint
  const { issuer, mint, amountMath: ticketAmountMath } = produceIssuer(
    'Opera tickets',
    'set',
  );

  const {
    terms: { show, start, count },
    issuerKeywordRecord: { Money: moneyIssuer },
  } = zoe.getInstanceRecord();

  const { amountMath: moneyAmountMath } = zoe.getIssuerRecord(moneyIssuer);

  return zoe.addNewIssuer(issuer, 'Ticket').then(() => {
    // create Zoe helpers after zoe.addNewIssuer because of https://github.com/Agoric/agoric-sdk/issues/802
    const { rejectOffer } = makeZoeHelpers(zoe);

    // Mint tickets inside the contract
    // In a more realistic contract, the Auditorium would certainly mint the tickets themselves
    // but because of a current technical limitation when running the Agoric stack on a blockchain,
    // minting has to happen inside a Zoe contract https://github.com/Agoric/agoric-sdk/issues/821

    // Mint the contract ahead-of-time (instead of on-demand)
    // This way, they can be passed to Zoe + ERTP who will be doing the bookkeeping
    // of which tickets have been sold and which tickets are still for sale
    const ticketsAmount = ticketAmountMath.make(
      harden(
        Array(count)
          .fill()
          .map((_, i) => {
            const ticketNumber = i + 1;
            return harden({
              show,
              start,
              number: ticketNumber,
            });
          }),
      ),
    );
    const ticketsPayment = mint.mintPayment(ticketsAmount);

    const {
      invite: contractSelfInvite,
      inviteHandle: contractOfferHandle,
    } = zoe.makeInvite();
    // the contract creates an offer {give: tickets, want: nothing} with the tickets
    return zoe
      .getZoeService()
      .redeem(
        contractSelfInvite,
        harden({ give: { Ticket: ticketsAmount } }),
        harden({ Ticket: ticketsPayment }),
      )
      .then(() => {
        const auditoriumSeat = harden({
          // this is meant to be called right after redeem
          // eventually, it might be done automatically: https://github.com/Agoric/agoric-sdk/issues/717
          afterRedeem() {
            // the contract transfers tickets to the auditorium leveraging Zoe offer safety
            zoe.reallocate(
              [contractOfferHandle, auditoriumOfferHandle],
              [
                zoe.getOffer(auditoriumOfferHandle).amounts,
                zoe.getOffer(contractOfferHandle).amounts,
              ],
            );
            zoe.complete([contractOfferHandle]);
            // if both calls succeeded (did not throw), the auditoriumOfferHandle is now
            // associated with the tickets and the contract offer is gone from the contract
          },
          getCurrentAllocation() {
            // This call may change to zoe.getCurrentAllocation: https://github.com/Agoric/agoric-sdk/issues/800#issuecomment-608022618
            return zoe.getOffer(auditoriumOfferHandle).amounts;
          },
        });
        const {
          invite: auditoriumInvite,
          inviteHandle: auditoriumOfferHandle,
        } = zoe.makeInvite(auditoriumSeat);

        const makeBuyerInvite = () => {
          const seat = harden({
            performExchange: () => {
              const buyerOffer = zoe.getOffer(buyerOfferHandle);

              const currentAuditoriumAllocation = zoe.getOffer(
                auditoriumOfferHandle,
              ).amounts;
              const currentBuyerAllocation = zoe.getOffer(buyerOfferHandle)
                .amounts;

              try {
                const wantedAuditoriumAllocation = {
                  Money: moneyAmountMath.add(
                    currentAuditoriumAllocation.Money,
                    currentBuyerAllocation.Money,
                  ),
                  Ticket: ticketAmountMath.subtract(
                    currentAuditoriumAllocation.Ticket,
                    buyerOffer.proposal.want.Ticket,
                  ),
                };

                const wantedBuyerAllocation = {
                  Money: moneyAmountMath.getEmpty(),
                  Ticket: ticketAmountMath.add(
                    currentBuyerAllocation.Ticket,
                    buyerOffer.proposal.want.Ticket,
                  ),
                };

                zoe.reallocate(
                  [auditoriumOfferHandle, buyerOfferHandle],
                  [wantedAuditoriumAllocation, wantedBuyerAllocation],
                );
                zoe.complete([buyerOfferHandle]);
              } catch (err) {
                console.error('error while performing exchange', err);
                // amounts don't match or reallocate certainly failed
                rejectOffer(buyerOfferHandle);
              }
            },
          });
          const { invite, inviteHandle: buyerOfferHandle } = zoe.makeInvite(
            seat,
          );
          return invite;
        };

        return harden({
          invite: auditoriumInvite,
          publicAPI: {
            makeBuyerInvite,
            getTicketIssuer() {
              return issuer;
            },
            getAvailableTickets() {
              // Because of a technical limitation in @agoric/marshal, an array of extents
              // is better than a Map https://github.com/Agoric/agoric-sdk/issues/838
              return zoe.getOffer(auditoriumOfferHandle).amounts.Ticket.extent;
            },
          },
        });
      });
  });
});
