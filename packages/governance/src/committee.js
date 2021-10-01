// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makeSubscriptionKit } from '@agoric/notifier';
import { allComparable } from '@agoric/same-structure';
import { makeStore } from '@agoric/store';
import { natSafeMath } from '@agoric/zoe/src/contractSupport/index.js';

import { makeHandle } from '@agoric/zoe/src/makeHandle';
import { QuorumRule } from './question.js';

const { ceilDivide } = natSafeMath;

/**
 * Each Committee (an Electorate) represents a particular set of voters. The
 * number of voters is visible in the terms.
 *
 * This contract creates an electorate whose membership is not visible to
 * observers. There may be uses for such a structure, but it is not appropriate
 * for elections where the set of voters needs to be known, unless the contract
 * is used in a way that makes the distribution of voter facets visible.
 *
 *  @type {ContractStartFn}
 */
const start = zcf => {
  /**
   * @typedef {Object} QuestionRecord
   * @property {ERef<VoteCounterCreatorFacet>} voteCap
   * @property {VoteCounterPublicFacet} publicFacet
   */

  /** @type {Store<Handle<'Question'>, QuestionRecord>} */
  const allQuestions = makeStore('Question');
  const { subscription, publication } = makeSubscriptionKit();

  const getOpenQuestions = async () => {
    const isOpenPQuestions = allQuestions.keys().map(key => {
      const { publicFacet } = allQuestions.get(key);
      return [E(publicFacet).isOpen(), key];
    });

    /** @type {[boolean, Handle<'Question'>][]} */
    const isOpenQuestions = await allComparable(harden(isOpenPQuestions));
    return isOpenQuestions
      .filter(([open, _key]) => open)
      .map(([_open, key]) => key);
  };

  const makeCommitteeVoterInvitation = index => {
    /** @type {OfferHandler} */
    const offerHandler = Far('voter offerHandler', () => {
      const voterHandle = makeHandle('Voter');
      return Far(`voter${index}`, {
        // CRUCIAL: voteCap carries the ability to cast votes for any voter at
        // any weight. It's wrapped here and given to the voter.
        //
        // Ensure that the voter can't get access to the unwrapped voteCap, and
        // has no control over the voteHandle or weight
        castBallotFor: (questionHandle, positions) => {
          const { voteCap } = allQuestions.get(questionHandle);
          return E(voteCap).submitVote(voterHandle, positions, 1n);
        },
      });
    });

    // https://github.com/Agoric/agoric-sdk/pull/3448/files#r704003612
    // This will produce unique descriptions because
    // makeCommitteeVoterInvitation() is only called within the following loop,
    // which is only called once per Electorate.
    return zcf.makeInvitation(offerHandler, `Voter${index}`);
  };

  const { committeeName, committeeSize } = zcf.getTerms();

  const invitations = harden(
    [...Array(committeeSize).keys()].map(makeCommitteeVoterInvitation),
  );

  /** @type {AddQuestion} */
  const addQuestion = async (voteCounter, questionSpec) => {
    const quorumThreshold = quorumRule => {
      switch (quorumRule) {
        case QuorumRule.MAJORITY:
          return ceilDivide(committeeSize, 2);
        case QuorumRule.ALL:
          return committeeSize;
        case QuorumRule.NO_QUORUM:
          return 0;
        default:
          throw Error(`${quorumRule} is not a recognized quorum rule`);
      }
    };

    /** @type {QuestionTerms} */
    const voteCounterTerms = {
      questionSpec,
      electorate: zcf.getInstance(),
      quorumThreshold: quorumThreshold(questionSpec.quorumRule),
    };

    // facets of the vote counter. creatorInvitation and adminFacet not used
    const { creatorFacet, publicFacet, instance } = await E(
      zcf.getZoeService(),
    ).startInstance(voteCounter, {}, voteCounterTerms);
    const details = await E(publicFacet).getDetails();
    const voteCounterFacets = { voteCap: creatorFacet, publicFacet };
    allQuestions.init(details.questionHandle, voteCounterFacets);

    publication.updateState(details);
    return { creatorFacet, publicFacet, instance };
  };

  /** @type {ElectoratePublic} */
  const publicFacet = Far('publicFacet', {
    getQuestionSubscription: () => subscription,
    getOpenQuestions,
    getName: () => committeeName,
    getInstance: zcf.getInstance,
    getQuestion: questionHandleP =>
      E.when(questionHandleP, questionHandle =>
        E(allQuestions.get(questionHandle).publicFacet).getQuestion(),
      ),
  });

  const getPoserInvitation = () => {
    const questionPoserHandler = () => Far(`questionPoser`, { addQuestion });
    return zcf.makeInvitation(questionPoserHandler, `questionPoser`);
  };

  /** @type {ElectorateCreatorFacet} */
  const creatorFacet = Far('adminFacet', {
    getPoserInvitation,
    addQuestion,
    getVoterInvitations: () => invitations,
    getQuestionSubscription: () => subscription,
    getPublicFacet: () => publicFacet,
  });

  return { publicFacet, creatorFacet };
};

harden(start);
export { start };
