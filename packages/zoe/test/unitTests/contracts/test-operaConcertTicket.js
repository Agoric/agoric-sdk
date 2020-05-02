// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';
import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';
import { E } from '@agoric/eventual-send';

import { makeZoe } from '../../../src/zoe';

const operaConcertTicketRoot = `${__dirname}/../../../src/contracts/operaConcertTicket`;

// __Test Scenario__

// The Opera de Bordeaux plays the contract creator and the auditorium
// It creates the contract for a show ("Steven Universe, the Opera", Web, March
// 25th 2020 at 8pm, 3 tickets)
// The Opera wants 22 moolas per ticket

// Alice buys ticket #1

// Then, the Joker tries malicious things:
// - they try to buy again ticket #1 (and will fail)
// - they try to buy to buy ticket #2 for 1 moola (and will fail)

// Then, Bob tries to buy ticket 1 and fails. He buys ticket #2 and #3

// The Opera is told about the show being sold out. It gets all the moolas from
// the sale

test(`Zoe opera ticket contract`, async t => {
  // Setup initial conditions
  const {
    mint: moolaMint,
    issuer: moolaIssuer,
    amountMath: { make: moola },
  } = produceIssuer('moola');

  const zoe = makeZoe({ require });
  const inviteIssuer = zoe.getInviteIssuer();

  // === Initial Opera de Bordeaux part ===
  const contractReadyP = bundleSource(operaConcertTicketRoot).then(
    ({ source, moduleFormat }) => {
      const expectedAmountPerTicket = moola(22);

      const installationHandle = zoe.install(source, moduleFormat);

      return zoe
        .makeInstance(installationHandle, harden({ Money: moolaIssuer }), {
          show: 'Steven Universe, the Opera',
          start: 'Web, March 25th 2020 at 8pm',
          count: 3,
          expectedAmountPerTicket,
        })
        .then(auditoriumInvite => {
          return inviteIssuer
            .getAmountOf(auditoriumInvite)
            .then(({ extent: [{ instanceHandle: auditoriumHandle }] }) => {
              const { publicAPI } = zoe.getInstanceRecord(auditoriumHandle);

              t.equal(
                typeof publicAPI.makeBuyerInvite,
                'function',
                'publicAPI.makeBuyerInvite should be a function',
              );
              t.equal(
                typeof publicAPI.getTicketIssuer,
                'function',
                'publicAPI.getTicketIssuer should be a function',
              );
              t.equal(
                typeof publicAPI.getAvailableTickets,
                'function',
                'publicAPI.getAvailableTickets should be a function',
              );

              // The auditorium makes an offer.
              return (
                // Note that the proposal here is empty
                // This is due to a current limitation in proposal
                // expressiveness:
                // https://github.com/Agoric/agoric-sdk/issues/855
                // It's impossible to know in advance how many tickets will be
                // sold, so it's not possible
                // to say `want: moola(3*22)`
                // in a future version of Zoe, it will be possible to express:
                // "i want n times moolas where n is the number of sold tickets"
                zoe
                  .offer(auditoriumInvite, harden({}))
                  // completeObj exists because of a current limitation in @agoric/marshal : https://github.com/Agoric/agoric-sdk/issues/818
                  .then(
                    async ({
                      outcome: auditoriumOutcomeP,
                      payout,
                      completeObj: { complete },
                      offerHandle,
                    }) => {
                      t.equal(
                        await auditoriumOutcomeP,
                        `The offer has been accepted. Once the contract has been completed, please check your payout`,
                        `default acceptance message`,
                      );
                      t.equal(
                        typeof complete,
                        'function',
                        'complete should be a function',
                      );

                      const currentAllocation = await E(
                        zoe,
                      ).getCurrentAllocation(await offerHandle);

                      t.equal(
                        currentAllocation.Ticket.extent.length,
                        3,
                        `the auditorium offerHandle should be associated with the 3 tickets`,
                      );

                      return {
                        publicAPI,
                        operaPayout: payout,
                        complete,
                      };
                    },
                  )
              );
            });
        });
    },
  );

  const alicePartFinished = contractReadyP.then(({ publicAPI }) => {
    const ticketIssuer = publicAPI.getTicketIssuer();
    const ticketAmountMath = ticketIssuer.getAmountMath();

    // === Alice part ===
    // Alice starts with 100 moolas
    const alicePurse = moolaIssuer.makeEmptyPurse();
    alicePurse.deposit(moolaMint.mintPayment(moola(100)));

    // Alice makes an invite
    const aliceInvite = inviteIssuer.claim(publicAPI.makeBuyerInvite());
    return inviteIssuer
      .getAmountOf(aliceInvite)
      .then(({ extent: [{ instanceHandle: aliceHandle }] }) => {
        const { terms: termsOfAlice } = zoe.getInstanceRecord(aliceHandle);
        // Alice checks terms
        t.equal(termsOfAlice.show, 'Steven Universe, the Opera');
        t.equal(termsOfAlice.start, 'Web, March 25th 2020 at 8pm');
        t.equal(termsOfAlice.expectedAmountPerTicket.brand, moola(22).brand);
        t.equal(termsOfAlice.expectedAmountPerTicket.extent, moola(22).extent);

        const availableTickets = publicAPI.getAvailableTickets();
        // and sees the currently available tickets
        t.equal(
          availableTickets.length,
          3,
          'Alice should see 3 available tickets',
        );
        t.ok(
          availableTickets.find(ticket => ticket.number === 1),
          `availableTickets contains ticket number 1`,
        );
        t.ok(
          availableTickets.find(ticket => ticket.number === 2),
          `availableTickets contains ticket number 2`,
        );
        t.ok(
          availableTickets.find(ticket => ticket.number === 3),
          `availableTickets contains ticket number 3`,
        );

        // find the extent corresponding to ticket #1
        const ticket1Extent = availableTickets.find(
          ticket => ticket.number === 1,
        );
        // make the corresponding amount
        const ticket1Amount = ticketAmountMath.make(harden([ticket1Extent]));

        const aliceProposal = harden({
          give: { Money: termsOfAlice.expectedAmountPerTicket },
          want: { Ticket: ticket1Amount },
        });

        const alicePaymentForTicket = alicePurse.withdraw(
          termsOfAlice.expectedAmountPerTicket,
        );

        return zoe
          .offer(aliceInvite, aliceProposal, {
            Money: alicePaymentForTicket,
          })
          .then(({ payout: payoutP }) => {
            return payoutP.then(alicePayout => {
              return ticketIssuer
                .claim(alicePayout.Ticket)
                .then(aliceTicketPayment => {
                  return ticketIssuer
                    .getAmountOf(aliceTicketPayment)
                    .then(aliceBoughtTicketAmount => {
                      t.equal(
                        aliceBoughtTicketAmount.extent[0].show,
                        'Steven Universe, the Opera',
                        'Alice should have receieved the ticket for the correct show',
                      );
                      t.equal(
                        aliceBoughtTicketAmount.extent[0].number,
                        1,
                        'Alice should have received the ticket for the correct number',
                      );
                    });
                });
            });
          });
      });
  });

  const jokerPartFinished = Promise.all([
    contractReadyP,
    alicePartFinished,
  ]).then(([{ publicAPI }]) => {
    // === Joker part ===
    const ticketIssuer = publicAPI.getTicketIssuer();
    const ticketAmountMath = ticketIssuer.getAmountMath();

    // Joker starts with 100 moolas
    const jokerPurse = moolaIssuer.makeEmptyPurse();
    jokerPurse.deposit(moolaMint.mintPayment(moola(100)));

    // Joker attempts to buy ticket 1 (and should fail)
    const buyTicket1Attempt = Promise.resolve().then(() => {
      const jokerInvite = inviteIssuer.claim(publicAPI.makeBuyerInvite());

      return inviteIssuer
        .getAmountOf(jokerInvite)
        .then(({ extent: [{ instanceHandle: instanceHandleOfJoker }] }) => {
          const { terms } = zoe.getInstanceRecord(instanceHandleOfJoker);

          const {
            expectedAmountPerTicket: expectedAmountPerTicketOfJoker,
          } = terms;

          // Joker does NOT check available tickets and tries to buy the ticket
          // number 1(already bought by Alice, but he doesn't know)
          const ticket1Amount = ticketAmountMath.make(
            harden([
              {
                show: terms.show,
                start: terms.start,
                number: 1,
              },
            ]),
          );

          const jokerProposal = harden({
            give: { Money: expectedAmountPerTicketOfJoker },
            want: { Ticket: ticket1Amount },
          });

          const jokerPaymentForTicket = jokerPurse.withdraw(
            expectedAmountPerTicketOfJoker,
          );

          return zoe
            .offer(jokerInvite, jokerProposal, {
              Money: jokerPaymentForTicket,
            })
            .then(({ outcome, payout: payoutP }) => {
              t.rejects(
                outcome,
                'performExchange from Joker should throw when trying to buy ticket 1',
              );

              return payoutP.then(({ Ticket, Money }) => {
                return Promise.all([
                  ticketIssuer.getAmountOf(Ticket),
                  moolaIssuer.getAmountOf(Money),
                ]).then(([jokerRefundTicketAmount, jokerRefundMoneyAmount]) => {
                  t.ok(
                    ticketAmountMath.isEmpty(jokerRefundTicketAmount),
                    'Joker should not receive ticket #1',
                  );
                  t.equal(
                    jokerRefundMoneyAmount.extent,
                    22,
                    'Joker should get a refund after trying to get ticket #1',
                  );
                });
              });
            });
        });
    });

    // Joker attempts to buy ticket 2 for 1 moola (and should fail)
    return buyTicket1Attempt.then(() => {
      const jokerInvite = inviteIssuer.claim(publicAPI.makeBuyerInvite());

      return inviteIssuer
        .getAmountOf(jokerInvite)
        .then(({ extent: [{ instanceHandle: instanceHandleOfJoker }] }) => {
          const { terms } = zoe.getInstanceRecord(instanceHandleOfJoker);

          const ticket2Amount = ticketAmountMath.make(
            harden([
              {
                show: terms.show,
                start: terms.start,
                number: 2,
              },
            ]),
          );

          const jokerInsuffisantAmount = moola(1);

          const jokerProposal = harden({
            give: { Money: jokerInsuffisantAmount },
            want: { Ticket: ticket2Amount },
          });

          const jokerInsufficientPaymentForTicket = jokerPurse.withdraw(
            jokerInsuffisantAmount,
          );

          return zoe
            .offer(jokerInvite, jokerProposal, {
              Money: jokerInsufficientPaymentForTicket,
            })
            .then(({ outcome, payout }) => {
              t.rejects(
                outcome,
                'outcome from Joker should throw when trying to buy a ticket for 1 moola',
              );

              return payout.then(({ Ticket, Money }) => {
                return Promise.all([
                  ticketIssuer.getAmountOf(Ticket),
                  moolaIssuer.getAmountOf(Money),
                ]).then(([jokerRefundTicketAmount, jokerRefundMoneyAmount]) => {
                  t.ok(
                    ticketAmountMath.isEmpty(jokerRefundTicketAmount),
                    'Joker should not receive ticket #2',
                  );
                  t.equal(
                    jokerRefundMoneyAmount.extent,
                    1,
                    'Joker should get a refund after trying to get ticket #2 for 1 moola',
                  );
                });
              });
            });
        });
    });
  });

  const bobPartFinished = Promise.all([contractReadyP, jokerPartFinished]).then(
    ([{ publicAPI }]) => {
      // === Bob part ===
      const ticketIssuer = publicAPI.getTicketIssuer();
      const ticketAmountMath = ticketIssuer.getAmountMath();

      // Bob starts with 100 moolas
      const bobPurse = moolaIssuer.makeEmptyPurse();
      bobPurse.deposit(moolaMint.mintPayment(moola(100)));

      const availableTickets = publicAPI.getAvailableTickets();

      // and sees the currently available tickets
      t.equal(availableTickets.length, 2, 'Bob should see 2 available tickets');
      t.ok(
        !availableTickets.find(ticket => ticket.number === 1),
        `availableTickets should NOT contain ticket number 1`,
      );
      t.ok(
        availableTickets.find(ticket => ticket.number === 2),
        `availableTickets should still contain ticket number 2`,
      );
      t.ok(
        availableTickets.find(ticket => ticket.number === 3),
        `availableTickets should still contain ticket number 3`,
      );

      // Bob buys tickets 2 and 3
      const bobInvite = inviteIssuer.claim(publicAPI.makeBuyerInvite());

      const ticket2and3Amount = ticketAmountMath.make(
        harden([
          availableTickets.find(ticket => ticket.number === 2),
          availableTickets.find(ticket => ticket.number === 3),
        ]),
      );

      const bobProposal = harden({
        give: { Money: moola(2 * 22) },
        want: { Ticket: ticket2and3Amount },
      });
      const bobPaymentForTicket = bobPurse.withdraw(moola(2 * 22));

      return zoe
        .offer(bobInvite, bobProposal, {
          Money: bobPaymentForTicket,
        })
        .then(({ payout: payoutP }) => {
          return payoutP.then(bobPayout => {
            return ticketIssuer
              .getAmountOf(bobPayout.Ticket)
              .then(bobTicketAmount => {
                t.equal(
                  bobTicketAmount.extent.length,
                  2,
                  'Bob should have received 2 tickets',
                );
                t.ok(
                  bobTicketAmount.extent.find(ticket => ticket.number === 2),
                  'Bob should have received tickets #2',
                );
                t.ok(
                  bobTicketAmount.extent.find(ticket => ticket.number === 3),
                  'Bob should have received tickets #3',
                );
              });
          });
        });
    },
  );

  return Promise.all([contractReadyP, bobPartFinished])
    .then(([{ publicAPI, operaPayout, complete }]) => {
      // === Final Opera part ===
      // getting the money back
      const availableTickets = publicAPI.getAvailableTickets();

      t.equal(availableTickets.length, 0, 'All the tickets have been sold');

      const operaPurse = moolaIssuer.makeEmptyPurse();

      const done = operaPayout.then(payout => {
        return payout.Money.then(moneyPayment => {
          return operaPurse.deposit(moneyPayment);
        }).then(() => {
          t.equal(
            operaPurse.getCurrentAmount().extent,
            3 * 22,
            `The Opera should get ${3 * 22} moolas from ticket sales`,
          );
        });
      });

      complete();

      return done;
    })
    .catch(err => {
      console.error('Error in last Opera part', err);
      t.fail('error');
    })
    .then(() => t.end());
});
