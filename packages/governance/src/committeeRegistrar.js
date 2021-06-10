// @ts-check

import { Far } from '@agoric/marshal';
import { makeNotifierKit } from '@agoric/notifier';
import { E } from '@agoric/eventual-send';
import { makeStore } from '@agoric/store';

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
      };
      E(clock).setWakeup(deadline, Far('waker', { wake }));

      updater.updateState(questionDetails.question);
      allQuestions.init(
        questionDetails.question,
        E(creatorFacet).getVoterFacet(),
      );
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
