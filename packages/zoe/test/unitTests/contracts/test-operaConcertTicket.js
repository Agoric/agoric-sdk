// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';
import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';
import { makeZoe } from '../../../src/zoe';

const operaConcertTicketRoot = `${__dirname}/../../../src/contracts/operaConcertTicket`;

test(`__Test Scenario__

The Opera de Bordeaux plays the contract creator and the auditorium
It creates the contract for a show ("Steven Universe, the Opera", Web, March 25th 2020 at 8pm, 3 tickets)
The Opera wants 22 moolas per ticket

Alice buys ticket #1

Bob tries to buy ticket 1 and fails. He buys ticket #2 and #3

The Opera is told about the show being sold out. It gets all the moolas from the sale`, async t => {

  // Setup initial conditions
  const {
    mint: moolaMint,
    issuer: moolaIssuer,
    amountMath: { make: moola },
  } = produceIssuer('moola');

  const zoe = makeZoe({ require });
  const inviteIssuer = zoe.getInviteIssuer();
  
  // === Initial Opera de Bordeaux part ===
  const contractReadyP = bundleSource(operaConcertTicketRoot).then(({ source, moduleFormat }) => {
    console.log('Opera part')

    const expectedAmountPerTicket = moola(22);
    
    const installationHandle = zoe.install(source, moduleFormat);

    return zoe.makeInstance(
      installationHandle,
      harden({ Money: moolaIssuer }),
      {
        show: 'Steven Universe, the Opera',
        start: 'Web, March 25th 2020 at 8pm',
        count: 3,
        expectedAmountPerTicket,
      },
    ).then(({ invite: auditoriumInvite }) => {
      return inviteIssuer.getAmountOf(auditoriumInvite).then(({
        extent: [{ instanceHandle: auditoriumInstanceHandle }],
      }) => {
        const { publicAPI } = zoe.getInstance(auditoriumInstanceHandle);

        t.equal(
          typeof publicAPI.makeBuyerInvite,
          'function',
          'makeMoneyInvite should be a function',
        );
        t.equal(
          typeof publicAPI.getTicketIssuer,
          'function',
          'getTicketIssuer should be a function',
        );
        t.equal(
          typeof publicAPI.getAvailableTickets,
          'function',
          'getAvailableTickets should be a function',
        );

        // The auditorium redeems its invite.
        return zoe.redeem(auditoriumInvite, harden({})).then(({
          seat: { makePaymentsAndInvites },
        }) => {
          t.equal(
            typeof makePaymentsAndInvites,
            'function',
            'makePaymentsAndInvites should be a function',
          );
    
          const ticketsPaymentsAndInvites = makePaymentsAndInvites();
    
          return Promise.all(ticketsPaymentsAndInvites.map(({ticketAmount, payment, invite}) => {
            return zoe.redeem(invite, harden({
                want: { Money: expectedAmountPerTicket },
                give: { Ticket: ticketAmount },
              }),
              harden({ Ticket: payment })
            )
          })).then(seatsAndPayouts => {
            const _operaPayouts = seatsAndPayouts.map(({payout}) => payout)

            // The Opera makes the publicAPI function publicly available
            return {publicAPI, _operaPayouts};
          })
          .catch((err) => console.error('yo all', err))
          
        })
      })
    })
  })

  const alicePartFinished = contractReadyP.then(({publicAPI}) => {
    console.log('Alice part')
    const ticketIssuer = publicAPI.getTicketIssuer();
    const ticketAmountMath = ticketIssuer.getAmountMath();

    // === Alice part ===
    // Alice starts with 100 moolas
    const alicePurse = moolaIssuer.makeEmptyPurse();
    alicePurse.deposit(moolaMint.mintPayment(moola(100)));

    // Alice makes an invite
    const aliceInvite = inviteIssuer.claim(publicAPI.makeBuyerInvite());
    return inviteIssuer.getAmountOf(aliceInvite).then(({
      extent: [{ instanceHandle: instanceHandleOfAlice }],
    }) => {
      const { terms: termsOfAlice } = zoe.getInstance(instanceHandleOfAlice)
      // Alice checks terms
      t.equal(termsOfAlice.show, 'Steven Universe, the Opera');
      t.equal(termsOfAlice.start, 'Web, March 25th 2020 at 8pm');
      t.equal(termsOfAlice.expectedAmountPerTicket.brand, moola(22).brand);
      t.equal(termsOfAlice.expectedAmountPerTicket.extent, moola(22).extent);
  
      const availableTickets = publicAPI.getAvailableTickets()
      // and sees the currently available tickets
      t.equal(availableTickets.size, 3, 'Alice should see 3 available tickets');
      t.ok(
        [...availableTickets.keys()].includes(1),
        `availableTickets contains ticket number 1`,
      );
      t.ok(
        [...availableTickets.keys()].includes(2),
        `availableTickets contains ticket number 2`,
      );
      t.ok(
        [...availableTickets.keys()].includes(3),
        `availableTickets contains ticket number 3`,
      );
  
      // find the extent corresponding to ticket #1
      const ticket1Extent = [...availableTickets.values()].find(
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
      )
      
      return zoe.redeem(aliceInvite, aliceProposal, {
        Money: alicePaymentForTicket,
      }).then(({
        seat: { performExchange },
        payout: payoutP,
      }) => {
        return performExchange().then(() => {
          return payoutP.then(alicePayout => {
            return ticketIssuer.claim(alicePayout.Ticket).then(aliceTicketPayment => {
              return ticketIssuer.getAmountOf(
                aliceTicketPayment,
              ).then(aliceBoughtTicketAmount => {
                t.equal(
                  aliceBoughtTicketAmount.extent[0].show,
                  'Steven Universe, the Opera',
                  'Alice should have receieved the ticket for the correct show',
                );
                t.equal(
                  aliceBoughtTicketAmount.extent[0].number,
                  1,
                  'Alice should have receieved the ticket for the correct number',
                );
              })
            })
          })
        })
      })
    })
  })

  return alicePartFinished.catch(err => {
    console.error('Error in Alice part', err)
    t.fail('error in alice')
  })
  .then(() => t.end())

/*
  {
    // === Bob part ===
    // Bob starts with 100 moolas
    const bobPurse = moolaIssuer.makeEmptyPurse();
    bobPurse.deposit(moolaMint.mintPayment(moola(100)));

    // Bob makes an invite
    const bobInvite = inviteIssuer.claim(publicAPI.makeBuyerInvite());
    const {
      extent: [{ instanceHandle: instanceHandleOfBob }],
    } = await inviteIssuer.getAmountOf(bobInvite);

    const { terms: termsOfBob } = await zoe.getInstance(instanceHandleOfBob);

    const {
      expectedAmountPerTicket: expectedAmountPerTicketOfBob,
    } = termsOfBob;

    // Bob does NOT check available tickets and tries to buy the ticket number 1 (already bought by Alice, but he doesn't know)
    const ticket1Amount = ticketAmountMath.make(
      harden([
        {
          show: termsOfBob.show,
          start: termsOfBob.start,
          number: 1,
        },
      ]),
    );

    const bobProposal = harden({
      give: { Money: expectedAmountPerTicketOfBob },
      want: { Ticket: ticket1Amount },
    });
    const bobFirstPaymentForTicket = await bobPurse.withdraw(
      expectedAmountPerTicketOfBob,
    );

    const {
      seat: { performExchange },
      payout: payoutP,
    } = await zoe.redeem(bobInvite, bobProposal, {
      Money: bobFirstPaymentForTicket,
    });

    await performExchange()
      .then(() => t.fail('performExchange from Bob should throw'))
      .catch(() => {});

    const firstBobPayout = await payoutP;

    const bobFirstTicketAmount = await ticketIssuer.getAmountOf(
      firstBobPayout.Ticket,
    );
    const bobFirstRefundAmount = await moolaIssuer.getAmountOf(
      firstBobPayout.Money,
    );

    t.equal(
      bobFirstTicketAmount.extent.length,
      0,
      'Bob should not receive ticket #1',
    );
    t.equal(
      bobFirstRefundAmount.extent,
      22,
      'Bob should get a refund after trying to get ticket #1',
    );

    // deposit the refund back to the purse
    bobPurse.deposit(await firstBobPayout.Money);

    const availableTickets = await publicAPI.getAvailableTickets();

    // and sees the currently available tickets
    t.equal(availableTickets.size, 2, 'Bob should see 2 available tickets');
    t.ok(
      ![...availableTickets.keys()].includes(1),
      `availableTickets should NOT contain ticket number 1`,
    );
    t.ok(
      [...availableTickets.keys()].includes(2),
      `availableTickets should still contain ticket number 2`,
    );
    t.ok(
      [...availableTickets.keys()].includes(3),
      `availableTickets should still contain ticket number 3`,
    );

    // Second attempt: Bob buys tickets 2 and 3
    const bobInvite2 = inviteIssuer.claim(publicAPI.makeBuyerInvite());

    const ticket2and3Amount = ticketAmountMath.make(
      harden([
        {
          show: termsOfBob.show,
          start: termsOfBob.start,
          number: 2,
        },
        {
          show: termsOfBob.show,
          start: termsOfBob.start,
          number: 3,
        },
      ]),
    );

    const bobSecondProposal = harden({
      give: { Money: moola(2 * 22) },
      want: { Ticket: ticket2and3Amount },
    });
    const bobSecondPaymentForTicket = await bobPurse.withdraw(moola(2 * 22));

    const {
      seat: { performExchange: performExchange2 },
      payout: payout2P,
    } = await zoe.redeem(bobInvite2, bobSecondProposal, {
      Money: bobSecondPaymentForTicket,
    });

    performExchange2();

    const secondBobPayout = await payout2P;

    const bobSecondTicketAmount = await ticketIssuer.getAmountOf(
      secondBobPayout.Ticket,
    );

    t.equal(
      bobSecondTicketAmount.extent.length,
      2,
      'Bob should have received 2 tickets',
    );
    t.ok(
      bobSecondTicketAmount.extent.find(ticket => ticket.number === 2),
      'Bob should have received tickets #2',
    );
    t.ok(
      bobSecondTicketAmount.extent.find(ticket => ticket.number === 3),
      'Bob should have received tickets #3',
    );
  }

  {
    // === Final Opera part ===
    // getting the money back
    const availableTickets = await publicAPI.getAvailableTickets();

    t.equal(availableTickets.size, 0, 'All the tickets have been sold');

    const salesPayment = await moolaIssuer.claim(_getSalesPayment());
    const salesPaymentAmount = await moolaIssuer.getAmountOf(salesPayment);

    t.equal(
      salesPaymentAmount.extent,
      3 * 22,
      `The Opera should get ${3 * 22} moolas from ticket sales`,
    );
  }*/
});
