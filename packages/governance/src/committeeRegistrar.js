// @ts-check

import { Far } from '@agoric/marshal';
import { makeNotifierKit } from '@agoric/notifier';
import { E } from '@agoric/eventual-send';
import { makeStore } from '@agoric/store';
import { natSafeMath } from '@agoric/zoe/src/contractSupport';

const { add, multiply } = natSafeMath;

const start = zcf => {
  const allQuestions = makeStore('Question');

  const makeCommitteeVoterInvitation = index => {
    const handler = voterSeat => {
      return Far(`voter${index}`, {
        castBallot: ballot =>
          E(allQuestions.get(ballot.question)).submitVote(voterSeat, ballot),
      });
    };

    return zcf.makeInvitation(handler, `Voter${index}`);
  };

  const createRegistrar = (name, count) => {
    const { notifier, updater } = makeNotifierKit();

    const invitations = [];
    for (let i = 0; i < count; i += 1) {
      invitations[i] = makeCommitteeVoterInvitation(i);
    }

    // This could be parameterized. For now, we check that at least half voted.
    const quorumChecker = Far('checker', {
      check: stats => {
        const votes = stats.results.reduce((runningTotal, n) => {
          const { total } = n;
          return add(runningTotal, total);
        }, 0n);
        return multiply(2, votes) >= count;
      },
    });

    /**
     * @param {Installation} voteCounter
     * @param {BallotDetails} questionDetails
     */
    const addQuestion = async (voteCounter, questionDetails) => {
      const { creatorFacet, publicFacet, instance } = await E(
        zcf.getZoeService(),
      ).startInstance(voteCounter, {}, questionDetails);

      const { clock, deadline } = questionDetails;
      const wake = async _timestamp => {
        E(creatorFacet).closeVoting();
        E(creatorFacet).countVotes(quorumChecker);
      };
      E(clock).setWakeup(deadline, Far('waker', { wake }));

      updater.updateState(questionDetails.question);
      allQuestions.init(questionDetails.question, creatorFacet);
      return { creatorFacet, publicFacet, instance };
    };

    return Far(`CommitteeRegistrar: ${name}`, {
      addQuestion,
      getVoterInvitations: () => invitations,
      getQuestionNotifier: () => notifier,
    });
  };

  const creatorFacet = Far('adminFacet', {
    createRegistrar,
  });
  const publicFacet = Far('publicFacet', {});

  return { publicFacet, creatorFacet };
};

harden(start);
export { start };
