import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';
import { E } from '@agoric/eventual-send';

import { makeZoe } from '../../../src/zoeService/zoe';
import { setup } from '../setupBasicMints';
import fakeVatAdmin from './fakeVatAdmin';

const contractRoot = `${__dirname}/escrowToVote`;

test('zoe - escrowToVote', async t => {
  t.plan(14);
  const { moolaIssuer, moolaMint, moola } = setup();
  const zoe = makeZoe(fakeVatAdmin);

  // pack the contract
  const bundle = await bundleSource(contractRoot);
  // install the contract
  const installation = await zoe.install(bundle);

  // Alice creates an instance and acts as the Secretary
  const issuerKeywordRecord = harden({
    Assets: moolaIssuer,
  });

  // She sets the question to be voted on, in the terms of the contract.
  const QUESTION = 'Should we upgrade?';
  const terms = { question: QUESTION };

  // She makes a running contract instance using the installation, and
  // receives a special, secretary facet back which has the special
  // authority to close elections.
  const { creatorFacet: secretary } = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord,
    terms,
  );

  // The secretary has the unique power to make voter invitations.
  const voterInvitation1 = E(secretary).makeVoterInvitation();
  const voterInvitation2 = E(secretary).makeVoterInvitation();
  const voterInvitation3 = E(secretary).makeVoterInvitation();
  const voterInvitation4 = E(secretary).makeVoterInvitation();

  // Let's imagine that we send the voterInvitations to various parties
  // who use them to make an offer with Zoe in which they escrow moola.

  // Voter 1 votes YES. Vote will be weighted by 3 (3 moola escrowed).
  const voter1Votes = async invitation => {
    const proposal = harden({
      give: { Assets: moola(3) },
    });
    const payments = harden({
      Assets: moolaMint.mintPayment(moola(3)),
    });
    const seat = await E(zoe).offer(invitation, proposal, payments);

    const voter = await E(seat).getOfferResult();
    const result = await E(voter).vote('YES');

    t.equals(result, `Successfully voted 'YES'`, `voter1 votes YES`);

    seat.getPayout('Assets').then(async moolaPayment => {
      t.deepEquals(
        await moolaIssuer.getAmountOf(moolaPayment),
        moola(3),
        `voter1 gets everything she escrowed back`,
      );

      console.log('EXPECTED ERROR ->>>');
      t.throws(
        () => voter.vote('NO'),
        /the voter seat has exited/,
        `voter1 voting fails once offer is withdrawn or amounts are reallocated`,
      );
    });
  };

  await voter1Votes(voterInvitation1);

  // Voter 2 makes badly formed vote, then votes YES, then changes
  // vote to NO. Vote will be weighted by 5 (5 moola escrowed).
  const voter2Votes = async invitation => {
    const proposal = harden({
      give: { Assets: moola(5) },
    });
    const payments = harden({
      Assets: moolaMint.mintPayment(moola(5)),
    });
    const seat = await E(zoe).offer(invitation, proposal, payments);

    const voter = await E(seat).getOfferResult();
    console.log('EXPECTED ERROR ->>>');
    t.rejects(
      () => E(voter).vote('NOT A VALID ANSWER'),
      /the answer "NOT A VALID ANSWER" was not 'YES' or 'NO'/,
      `A vote with an invalid answer throws`,
    );

    const result1 = await E(voter).vote('YES');
    t.equals(result1, `Successfully voted 'YES'`, `voter2 votes YES`);

    // Votes can be recast at any time
    const result2 = await E(voter).vote('NO');
    t.equals(result2, `Successfully voted 'NO'`, `voter 2 recast vote for NO`);

    seat.getPayout('Assets').then(async moolaPayment => {
      t.deepEquals(
        await moolaIssuer.getAmountOf(moolaPayment),
        moola(5),
        `voter2 gets everything she escrowed back`,
      );

      console.log('EXPECTED ERROR ->>>');
      t.throws(
        () => voter.vote('NO'),
        /the voter seat has exited/,
        `voter2 voting fails once offer is withdrawn or amounts are reallocated`,
      );
    });
  };

  await voter2Votes(voterInvitation2);

  // Voter 3 votes NO and then exits the seat, retrieving their
  // assets, meaning that their vote should not be counted. They get
  // their full moola (1 moola) back as a payout.
  const voter3Votes = async invitation => {
    const proposal = harden({
      give: { Assets: moola(1) },
    });
    const payments = harden({
      Assets: moolaMint.mintPayment(moola(1)),
    });
    const seat = await E(zoe).offer(invitation, proposal, payments);

    const voter = await E(seat).getOfferResult();
    const result = await E(voter).vote('NO');
    t.equals(result, `Successfully voted 'NO'`, `voter3 votes NOT`);

    // Voter3 exits before the election is closed. Voter3's vote will
    // not be counted.
    seat.tryExit();

    const moolaPayment = await seat.getPayout('Assets');

    t.deepEquals(
      await moolaIssuer.getAmountOf(moolaPayment),
      moola(1),
      `voter3 gets everything she escrowed back`,
    );

    console.log('EXPECTED ERROR ->>>');
    t.throws(
      () => voter.vote('NO'),
      /the voter seat has exited/,
      `voter3 voting fails once offer is withdrawn or amounts are reallocated`,
    );
  };

  await voter3Votes(voterInvitation3);

  // Voter4 votes YES with a weight of 4
  const voter4Votes = async invitation => {
    const proposal = harden({
      give: { Assets: moola(4) },
    });
    const payments = harden({
      Assets: moolaMint.mintPayment(moola(4)),
    });
    const seat = await E(zoe).offer(invitation, proposal, payments);

    const voter = await E(seat).getOfferResult();
    const result = await E(voter).vote('YES');

    t.equals(result, `Successfully voted 'YES'`, `voter1 votes YES`);

    seat.getPayout('Assets').then(async moolaPayment => {
      t.deepEquals(
        await moolaIssuer.getAmountOf(moolaPayment),
        moola(4),
        `voter4 gets everything she escrowed back`,
      );
    });
  };

  await voter4Votes(voterInvitation4);

  // Secretary closes election and tallies the votes.
  const electionResults = await E(secretary).closeElection();
  t.deepEquals(electionResults, { YES: moola(7), NO: moola(5) });

  // Once the election is closed, the voters get their escrowed funds
  // back and can no longer vote. See the voter functions for the
  // resolution of the payout promises for each voter.
});
