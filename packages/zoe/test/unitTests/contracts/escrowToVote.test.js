import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import path from 'path';

import bundleSource from '@endo/bundle-source';
import { E } from '@endo/eventual-send';

import { makeZoeForTest } from '../../../tools/setup-zoe.js';
import { setup } from '../setupBasicMints.js';
import { makeFakeVatAdmin } from '../../../tools/fakeVatAdmin.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractRoot = `${dirname}/escrowToVote.js`;

test('zoe - escrowToVote', async t => {
  t.plan(14);
  const { moolaIssuer, moolaMint, moola } = setup();
  const { admin: fakeVatAdmin, vatAdminState } = makeFakeVatAdmin();
  const zoe = makeZoeForTest(fakeVatAdmin);

  // pack the contract
  const bundle = await bundleSource(contractRoot);
  // install the contract
  vatAdminState.installBundle('b1-escrowtovote', bundle);
  const installation = await E(zoe).installBundleID('b1-escrowtovote');

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
      give: { Assets: moola(3n) },
    });
    const payments = harden({
      Assets: moolaMint.mintPayment(moola(3n)),
    });
    const seat = await E(zoe).offer(invitation, proposal, payments);

    const voter = await E(seat).getOfferResult();
    const result = await E(voter).vote('YES');

    t.is(result, `Successfully voted 'YES'`, `voter1 votes YES`);
    return { voter, seat };
  };

  const voter1CollectsPayout = async ({ voter, seat }) => {
    const moolaPayment = await seat.getPayout('Assets');
    t.deepEqual(
      await moolaIssuer.getAmountOf(moolaPayment),
      moola(3n),
      `voter1 gets everything she escrowed back`,
    );

    t.throws(
      () => voter.vote('NO'),
      { message: /the voter seat has exited/ },
      `voter1 voting fails once offer is withdrawn or amounts are reallocated`,
    );
  };

  const voter1Result = await voter1Votes(voterInvitation1);
  const voter1DoneP = voter1CollectsPayout(voter1Result);

  // Voter 2 makes badly formed vote, then votes YES, then changes
  // vote to NO. Vote will be weighted by 5 (5 moola escrowed).
  const voter2Votes = async invitation => {
    const proposal = harden({
      give: { Assets: moola(5n) },
    });
    const payments = harden({
      Assets: moolaMint.mintPayment(moola(5n)),
    });
    const seat = await E(zoe).offer(invitation, proposal, payments);

    const voter = await E(seat).getOfferResult();
    await t.throwsAsync(
      () => E(voter).vote('NOT A VALID ANSWER'),
      {
        message:
          // Should be able to use more informative error once SES double
          // disclosure bug is fixed. See
          // https://github.com/endojs/endo/pull/640
          //
          // /the answer "NOT A VALID ANSWER" was not 'YES' or 'NO'/
          /the answer .* was not 'YES' or 'NO'/,
      },
      `A vote with an invalid answer throws`,
    );

    const result1 = await E(voter).vote('YES');
    t.is(result1, `Successfully voted 'YES'`, `voter2 votes YES`);

    // Votes can be recast at any time
    const result2 = await E(voter).vote('NO');
    t.is(result2, `Successfully voted 'NO'`, `voter 2 recast vote for NO`);
    return { voter, seat };
  };

  const voter2CollectsPayout = async ({ voter, seat }) => {
    const moolaPayment = await seat.getPayout('Assets');
    t.deepEqual(
      await moolaIssuer.getAmountOf(moolaPayment),
      moola(5n),
      `voter2 gets everything she escrowed back`,
    );

    t.throws(
      () => voter.vote('NO'),
      { message: /the voter seat has exited/ },
      `voter2 voting fails once offer is withdrawn or amounts are reallocated`,
    );
  };

  const voter2Result = await voter2Votes(voterInvitation2);
  const voter2DoneP = voter2CollectsPayout(voter2Result);

  // Voter 3 votes NO and then exits the seat, retrieving their
  // assets, meaning that their vote should not be counted. They get
  // their full moola (1 moola) back as a payout.
  const voter3Votes = async invitation => {
    const proposal = harden({
      give: { Assets: moola(1n) },
    });
    const payments = harden({
      Assets: moolaMint.mintPayment(moola(1n)),
    });
    const seat = await E(zoe).offer(invitation, proposal, payments);

    const voter = await E(seat).getOfferResult();
    const result = await E(voter).vote('NO');
    t.is(result, `Successfully voted 'NO'`, `voter3 votes NOT`);

    // Voter3 exits before the election is closed. Voter3's vote will
    // not be counted.
    assert(seat.tryExit);
    seat.tryExit();

    return { voter, seat };
  };

  const voter3CollectsPayout = async ({ voter, seat }) => {
    const moolaPayment = await seat.getPayout('Assets');

    t.deepEqual(
      await moolaIssuer.getAmountOf(moolaPayment),
      moola(1n),
      `voter3 gets everything she escrowed back`,
    );

    t.throws(
      () => voter.vote('NO'),
      { message: /the voter seat has exited/ },
      `voter3 voting fails once offer is withdrawn or amounts are reallocated`,
    );
  };

  const voter3Result = await voter3Votes(voterInvitation3);
  const voter3DoneP = voter3CollectsPayout(voter3Result);

  // Voter4 votes YES with a weight of 4
  const voter4Votes = async invitation => {
    const proposal = harden({
      give: { Assets: moola(4n) },
    });
    const payments = harden({
      Assets: moolaMint.mintPayment(moola(4n)),
    });
    const seat = await E(zoe).offer(invitation, proposal, payments);

    const voter = await E(seat).getOfferResult();
    const result = await E(voter).vote('YES');

    t.is(result, `Successfully voted 'YES'`, `voter1 votes YES`);

    return seat;
  };

  const voter4CollectsPayout = async seat => {
    const moolaPayment = seat.getPayout('Assets');
    t.deepEqual(
      await moolaIssuer.getAmountOf(moolaPayment),
      moola(4n),
      `voter4 gets everything she escrowed back`,
    );
  };

  const voter4Seat = await voter4Votes(voterInvitation4);
  const voter4DoneP = voter4CollectsPayout(voter4Seat);

  // Secretary closes election and tallies the votes.
  const electionResults = await E(secretary).closeElection();
  t.deepEqual(electionResults, { YES: moola(7n), NO: moola(5n) });

  // Once the election is closed, the voters get their escrowed funds
  // back and can no longer vote.
  await Promise.all([voter1DoneP, voter2DoneP, voter3DoneP, voter4DoneP]);
});
