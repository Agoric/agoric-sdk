// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import { makeSubscriptionKit } from '@agoric/notifier';
import { makeStore } from '@agoric/store';
import { natSafeMath } from '@agoric/zoe/src/contractSupport/index.js';

import { makeHandle } from '@agoric/zoe/src/makeHandle';
import { QuorumRule } from './question.js';
import {
  startCounter,
  getOpenQuestions,
  getQuestion,
  getPoserInvitation,
} from './electorateTools.js';

const { ceilDivide } = natSafeMath;
const { details: X, quote: q } = assert;

/** @type { <X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
export const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);

/**
 * Each Committee (an Electorate) represents a particular set of voters. The
 * number of voters is visible in the terms.
 *
 * This contract creates an electorate whose membership is not visible to
 * observers. There may be uses for such a structure, but it is not appropriate
 * for elections where the set of voters needs to be known, unless the contract
 * is used in a way that makes the distribution of voter facets visible.
 *
 * @typedef {{
 *   committeeName: string,
 *   committeeSize: number,
 *   addresses?: string[],
 *   namesByAddress?: ERef<NameHub>,
 * }} CommitteeTerms
 *
 *  @type {ContractStartFn}
 */
const start = async zcf => {
  /** @type {Store<Handle<'Question'>, QuestionRecord>} */
  const allQuestions = makeStore('Question');
  const { subscription, publication } = makeSubscriptionKit();

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

  const { committeeName, committeeSize, addresses, namesByAddress } =
    /** @type { CommitteeTerms & Terms } */ (zcf.getTerms());

  const invitations = harden(
    [...Array(committeeSize).keys()].map(makeCommitteeVoterInvitation),
  );

  const distributeInvitations = async (keys, nameHub) => {
    const DEPOSIT_FACET = 'depositFacet';

    if (!(Array.isArray(keys) && nameHub)) {
      return;
    }
    assert(
      keys.length === committeeSize,
      X`committeeSize ${q(committeeSize)} does not match addresses ${q(keys)}`,
    );

    zip(invitations, keys).forEach(async ([invitationP, addr]) => {
      const [invitation, depositFacet] = await Promise.all([
        invitationP,
        E(nameHub).lookup(addr, DEPOSIT_FACET),
      ]);

      return E(depositFacet)
        .receive(invitation)
        .catch(reason => {
          // If something went wrong, somebody will have to
          // use the creator facet to get more invitations.
          // TODO: perhaps there should be a bootstrap error collector?
          // TODO: add API to get results of these promises?
          console.warn(`cannot send:`, { addr, invitation, reason });
        });
    });
  };
  await distributeInvitations(addresses, namesByAddress);

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

    return startCounter(
      zcf,
      questionSpec,
      quorumThreshold(questionSpec.quorumRule),
      voteCounter,
      allQuestions,
      publication,
    );
  };

  /** @type {CommitteeElectoratePublic} */
  const publicFacet = Far('publicFacet', {
    getQuestionSubscription: () => subscription,
    getOpenQuestions: () => getOpenQuestions(allQuestions),
    getName: () => committeeName,
    getInstance: zcf.getInstance,
    getQuestion: handleP => getQuestion(handleP, allQuestions),
  });

  /** @type {CommitteeElectorateCreatorFacet} */
  const creatorFacet = Far('adminFacet', {
    getPoserInvitation: () => getPoserInvitation(zcf, addQuestion),
    addQuestion,
    getVoterInvitations: () => invitations,
    getQuestionSubscription: () => subscription,
    getPublicFacet: () => publicFacet,
  });

  return { publicFacet, creatorFacet };
};

harden(start);
export { start };
