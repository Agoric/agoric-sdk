// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makeNotifierKit } from '@agoric/notifier';
import { allComparable } from '@agoric/same-structure';
import { makeStore } from '@agoric/store';
import { natSafeMath } from '@agoric/zoe/src/contractSupport';

import { QuorumRule } from './ballotBuilder';

const { ceilDivide } = natSafeMath;

// Each CommitteeRegistrar represents a particular set of voters. The number of
// voters is visible in the terms.
//
// This contract creates an electorate that is not visible to observers. There
// may be uses for such a structure, but it is not appropriate for elections
// where the set of voters needs to be known, unless the contract is used in a
// way that makes the distribution of voter facees visible.

/** @type {ContractStartFn} */
const start = zcf => {
  /**
   * @typedef {Object} QuestionRecord
   * @property {ERef<VoterFacet>} voter
   * @property {BallotCounterPublicFacet} publicFacet
   */

  /** @type {Store<Handle<'Ballot'>, QuestionRecord>} */
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
    const handler = voterSeat => {
      return Far(`voter${index}`, {
        castBallot: ballotp =>
          E.when(ballotp, ballot => {
            const { voter } = allQuestions.get(ballot.handle);
            return E(voter).submitVote(voterSeat, ballot);
          }),
        castBallotFor: (handle, positions) => {
          const { publicFacet: counter, voter } = allQuestions.get(handle);
          const ballotTemplate = E(counter).getBallotTemplate();
          const ballot = E(ballotTemplate).choose(positions);
          return E(voter).submitVote(voterSeat, ballot);
        },
      });
    };

    return zcf.makeInvitation(handler, `Voter${index}`);
  };

  const { committeeName, committeeSize } = zcf.getTerms();
  for (let i = 0; i < committeeSize; i += 1) {
    invitations[i] = makeCommitteeVoterInvitation(i);
  }

  /** @type {AddQuestion} */
  const addQuestion = async (voteCounter, ballotSpec) => {
    const quorumThreshold = quorumRule => {
      switch (quorumRule) {
        case QuorumRule.HALF:
          return ceilDivide(committeeSize, 2);
        case QuorumRule.ALL:
          return committeeSize;
        case QuorumRule.NONE:
          return 0;
        default:
          throw Error(`${quorumRule} is not a recognized quorum rule`);
      }
    };

    const ballotCounterTerms = {
      ballotSpec,
      registrar: zcf.getInstance(),
      quorumThreshold: quorumThreshold(ballotSpec.quorumRule),
    };

    // facets of the ballot counter. creatorInvitation and adminFacet not used
    const { creatorFacet, publicFacet, instance } = await E(
      zcf.getZoeService(),
    ).startInstance(voteCounter, {}, ballotCounterTerms);
    const details = await E(publicFacet).getDetails();
    const facets = { voter: E(creatorFacet).getVoterFacet(), publicFacet };
    allQuestions.init(details.handle, facets);

    updater.updateState(details);
    return { creatorFacet, publicFacet, instance };
  };

  /** @type {RegistrarPublic} */
  const publicFacet = Far('publicFacet', {
    getQuestionNotifier: () => notifier,
    getOpenQuestions,
    getName: () => committeeName,
    getInstance: zcf.getInstance,
    getBallot: handleP =>
      E.when(handleP, handle =>
        E(allQuestions.get(handle).publicFacet).getBallotTemplate(),
      ),
  });

  const getPoserInvitation = () => {
    const questionPoserHandler = () => Far(`questionPoser`, { addQuestion });
    return zcf.makeInvitation(questionPoserHandler, `questionPoser`);
  };

  /** @type {RegistrarCreator} */
  const creatorFacet = Far('adminFacet', {
    getPoserInvitation,
    addQuestion,
    getVoterInvitations: () => invitations,
    getQuestionNotifier: () => notifier,
    getPublicFacet: () => publicFacet,
  });

  return { publicFacet, creatorFacet };
};

harden(start);
export { start };
