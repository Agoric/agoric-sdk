// @ts-check

import { Far } from '@agoric/marshal';
import { makeNotifierKit } from '@agoric/notifier';
import { E } from '@agoric/eventual-send';
import { makeStore } from '@agoric/store';
import { allComparable } from '@agoric/same-structure';

// Each CommitteeRegistrar represents a particular set of voters. The number of
// voters is visible in the terms.
const start = zcf => {
  // Question => { voter, publicFacet }
  const allQuestions = makeStore('Question');
  const { notifier, updater } = makeNotifierKit();
  const invitations = [];

  const getOpenQuestions = async () => {
    const isOpenPQuestions = allQuestions.keys().map(key => {
      const { publicFacet } = allQuestions.get(key);
      return [E(publicFacet).isOpen(), key];
    });
    const isOpenQuestions = await allComparable(harden(isOpenPQuestions));
    return isOpenQuestions
      .filter(([open, _key]) => open)
      .map(([_open, key]) => key);
  };

  const makeCommitteeVoterInvitation = index => {
    const handler = Far('handler', voterSeat => {
      return Far(`voter${index}`, {
        castBallot: ballotp => {
          E.when(ballotp, ballot => {
            const { voter } = allQuestions.get(ballot.question);
            return E(voter).submitVote(voterSeat, ballot);
          });
        },
        castBallotFor: (question, positions) => {
          const { publicFacet: counter, voter } = allQuestions.get(question);
          const ballotTemplate = E(counter).getBallotTemplate();
          const ballot = E(ballotTemplate).choose(positions);
          return E(voter).submitVote(voterSeat, ballot);
        },
      });
    });

    return zcf.makeInvitation(handler, `Voter${index}`);
  };

  const { committeeName, committeeSize } = zcf.getTerms();
  for (let i = 0; i < committeeSize; i += 1) {
    invitations[i] = makeCommitteeVoterInvitation(i);
  }

  /** @type {AddQuestion} */
  const addQuestion = async (voteCounter, questionDetailsShort) => {
    const questionDetails = {
      ...questionDetailsShort,
      registrar: zcf.getInstance(),
    };
    // facets of the ballot counter. Suppress creatorInvitation and adminFacet.
    const { creatorFacet, publicFacet, instance } = await E(
      zcf.getZoeService(),
    ).startInstance(voteCounter, {}, questionDetails);
    const facets = { voter: E(creatorFacet).getVoterFacet(), publicFacet };

    updater.updateState(questionDetails.question);
    allQuestions.init(questionDetails.question, facets);
    return { creatorFacet, publicFacet, instance };
  };

  const creatorFacet = Far('adminFacet', {
    addQuestion,
    getVoterInvitations: () => invitations,
    getQuestionNotifier: () => notifier,
  });

  const publicFacet = Far('publicFacet', {
    getQuestionNotifier: () => notifier,
    getOpenQuestions,
    getName: () => committeeName,
    getInstance: zcf.getInstance,
    getDetails: name =>
      E(E(allQuestions.get(name).publicFacet).getBallotTemplate()).getDetails(),
    getBallot: name =>
      E(allQuestions.get(name).publicFacet).getBallotTemplate(),
  });

  return { publicFacet, creatorFacet };
};

harden(start);
export { start };
