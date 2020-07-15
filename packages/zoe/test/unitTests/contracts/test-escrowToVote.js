/* global harden */

import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';
import { E } from '@agoric/eventual-send';

import { makeZoe } from '../../../src/zoe';
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
  const installationHandle = await zoe.install(bundle);

  // Alice creates an instance and acts as the Secretary
  const issuerKeywordRecord = harden({
    Assets: moolaIssuer,
  });

  // She sets the question to be voted on, in the terms of the contract.
  const QUESTION = 'Should we upgrade?';
  const terms = { question: QUESTION };

  // She makes a running contract instance using the installation, and
  // receives a special, secretary invite back which has the special
  // authority to close elections.
  const { invite: secretaryInvite } = await E(zoe).makeInstance(
    installationHandle,
    issuerKeywordRecord,
    terms,
  );

  // Alice makes an offer to use the secretary invite and gets a
  // secretary use object back.
  const { outcome: secretaryUseObjP } = await E(zoe).offer(secretaryInvite);

  const secretary = await secretaryUseObjP;

  // The secretary has the unique power to make voter invites.
  const voterInvite1 = E(secretary).makeVoterInvite();
  const voterInvite2 = E(secretary).makeVoterInvite();
  const voterInvite3 = E(secretary).makeVoterInvite();
  const voterInvite4 = E(secretary).makeVoterInvite();

  // Let's imagine that we send the voterInvites to various parties
  // who use them to make an offer with Zoe in which they escrow moola.

  // Voter 1 votes YES. Vote will be weighted by 3 (3 moola escrowed).
  const voter1Votes = async invite => {
    const proposal = harden({
      give: { Assets: moola(3) },
    });
    const payments = harden({
      Assets: moolaMint.mintPayment(moola(3)),
    });
    const { payout: payoutP, outcome: voterP } = await E(zoe).offer(
      invite,
      proposal,
      payments,
    );

    const voter = await voterP;
    const result = await E(voter).vote('YES');

    t.equals(result, `Successfully voted 'YES'`, `voter1 votes YES`);

    payoutP.then(async payout => {
      const moolaPayment = await payout.Assets;

      t.deepEquals(
        await moolaIssuer.getAmountOf(moolaPayment),
        moola(3),
        `voter1 gets everything she escrowed back`,
      );

      console.log('EXPECTED ERROR ->>>');
      t.throws(
        () => voter.vote('NO'),
        /the escrowing offer is no longer active/,
        `voter1 voting fails once offer is withdrawn or amounts are reallocated`,
      );
    });
  };

  await voter1Votes(voterInvite1);

  // Voter 2 makes badly formed votes, then votes YES, then changes
  // vote to NO. Vote will be weighted by 5 (5 moola escrowed).
  const voter2Votes = async invite => {
    const proposal = harden({
      give: { Assets: moola(5) },
    });
    const payments = harden({
      Assets: moolaMint.mintPayment(moola(5)),
    });
    const { payout: payoutP, outcome: voterP } = await E(zoe).offer(
      invite,
      proposal,
      payments,
    );

    const voter = await voterP;
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

    payoutP.then(async payout => {
      const moolaPayment = await payout.Assets;

      t.deepEquals(
        await moolaIssuer.getAmountOf(moolaPayment),
        moola(5),
        `voter2 gets everything she escrowed back`,
      );

      console.log('EXPECTED ERROR ->>>');
      t.throws(
        () => voter.vote('NO'),
        /the escrowing offer is no longer active/,
        `voter2 voting fails once offer is withdrawn or amounts are reallocated`,
      );
    });
  };

  await voter2Votes(voterInvite2);

  // Voter 3 votes NO and then completes their offer, meaning that
  // their vote should not be counted. They get their full moola (1
  // moola) back as a payout.
  const voter3Votes = async invite => {
    const proposal = harden({
      give: { Assets: moola(1) },
    });
    const payments = harden({
      Assets: moolaMint.mintPayment(moola(1)),
    });
    const { payout: payoutP, outcome: voterP, completeObj } = await E(
      zoe,
    ).offer(invite, proposal, payments);

    const voter = await voterP;
    const result = await E(voter).vote('NO');
    t.equals(result, `Successfully voted 'NO'`, `voter3 votes NOT`);

    // Voter3 completes their offer and exits before the election is
    // closed. Voter3's vote will not be counted.
    completeObj.complete();

    const payout = await payoutP;

    const moolaPayment = await payout.Assets;

    t.deepEquals(
      await moolaIssuer.getAmountOf(moolaPayment),
      moola(1),
      `voter3 gets everything she escrowed back`,
    );

    console.log('EXPECTED ERROR ->>>');
    t.throws(
      () => voter.vote('NO'),
      /the escrowing offer is no longer active/,
      `voter3 voting fails once offer is withdrawn or amounts are reallocated`,
    );
  };

  await voter3Votes(voterInvite3);

  // Voter4 votes YES with a weight of 4
  const voter4Votes = async invite => {
    const proposal = harden({
      give: { Assets: moola(4) },
    });
    const payments = harden({
      Assets: moolaMint.mintPayment(moola(4)),
    });
    const { payout: payoutP, outcome: voterP } = await E(zoe).offer(
      invite,
      proposal,
      payments,
    );

    const voter = await voterP;
    const result = await E(voter).vote('YES');

    t.equals(result, `Successfully voted 'YES'`, `voter1 votes YES`);

    payoutP.then(async payout => {
      const moolaPayment = await payout.Assets;

      t.deepEquals(
        await moolaIssuer.getAmountOf(moolaPayment),
        moola(4),
        `voter4 gets everything she escrowed back`,
      );
    });
  };

  await voter4Votes(voterInvite4);

  // Secretary closes election and tallies the votes.
  const electionResults = await E(secretary).closeElection();
  t.deepEquals(electionResults, { YES: moola(7), NO: moola(5) });

  // Once the election is closed, the voters get their escrowed funds
  // back and can no longer vote. See the voter functions for the
  // resolution of the payout promises for each voter.
});
