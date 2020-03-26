// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import harden from '@agoric/harden';

import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';

const operaConcertTicketRoot = `${__dirname}/../../../src/contracts/operaConcertTicket`;

test(`__Test Scenario__

The Opera de Bordeaux plays the contract creator and the auditorium
It creates the contract for a show ("Steven Universe, the Opera", Web, March 25th 2020 at 8pm, 3 tickets)
The Opera wants 22 moolas per ticket

Alice buys ticket #1

Bob tries to buy ticket 1 and fails. He buys ticket #2 and #3

Christine asks the contract for an invite and the contract answers that there are no tickets left to buy

The Opera is told about the show being sold out. It gets all the moolas from the sale`, async t => {

  // Setup initial conditions
  const { mints, issuers: defaultIssuers, moola } = setup();
  const [moolaIssuer] = defaultIssuers;
  const [moolaMint] = mints;

  const zoe = makeZoe({ require });
  const inviteIssuer = zoe.getInviteIssuer();

  // == Initial Opera de Bordeaux part == 
  const { source, moduleFormat } = await bundleSource(operaConcertTicketRoot);

  const installationHandle = zoe.install(source, moduleFormat);
  const auditoriumInvite = await zoe.makeInstance(installationHandle, {Buyer: moolaIssuer}, {
    show: "Steven Universe, the Opera",
    start: "Web, March 25th 2020 at 8pm",
    count: 3,
    expectedAmountPerTicket: moola(22)
  });

  console.log('auditoriumInvite', auditoriumInvite)

  const {
    extent: [{ instanceHandle }],
  } = await inviteIssuer.getAmountOf(auditoriumInvite);
  const { publicAPI } = zoe.getInstance(instanceHandle);

  // The auditorium redeems its invite. It contains a function to get all the moolas accumulated by the contract
  // as part of the ticket sales
  const {
    seat: {getSalesMoney}
  } = await zoe.redeem(auditoriumInvite, harden({}), undefined);

  t.equal(typeof getSalesMoney, 'function', 'getSalesMoney should be a function')

  // The Opera makes the makeInvite function publicly available
  const {makeBuyerInvite} = publicAPI;

  t.equal(typeof makeBuyerInvite, 'function', 'makeBuyerInvite should be a function')


  // == Alice part ==
  // Alice starts with 100 moolas

  // she gets an invite

  // and sees the currently available tickets

  

  t.end()
});