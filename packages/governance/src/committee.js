import { makeStoredPublishKit } from '@agoric/notifier';
import { M } from '@agoric/store';
import { natSafeMath } from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/eventual-send';

import { StorageNodeShape } from '@agoric/internal';
import { prepareExo, provideDurableMapStore } from '@agoric/vat-data';
import { EmptyProposalShape } from '@agoric/zoe/src/typeGuards.js';
import {
  getOpenQuestions,
  getPoserInvitation,
  getQuestion,
  startCounter,
} from './electorateTools.js';
import { QuorumRule } from './question.js';
import { ElectorateCreatorI, ElectoratePublicI } from './typeGuards.js';
import { prepareVoterKit } from './voterKit.js';

/**
 * @import {ElectorateCreatorFacet, CommitteeElectoratePublic, QuestionDetails, OutcomeRecord, AddQuestion} from './types.js';
 */

const { ceilDivide } = natSafeMath;

/**
 * @typedef { ElectorateCreatorFacet & {
 *   getVoterInvitations: () => Promise<Invitation<{ voter: { castBallotFor(handle: any, choice?: any, ): void}}>>[]
 * }} CommitteeElectorateCreatorFacet
 */

/** @type {ContractMeta<typeof start>} */
export const meta = {
  privateArgsShape: {
    storageNode: StorageNodeShape,
    marshaller: M.remotable('Marshaller'),
    customId: M.opt(M.number()),
  },
  upgradability: 'canUpgrade',
};
harden(meta);

/**
 * Each Committee (an Electorate) represents a particular set of voters. The
 * number of voters is visible in the terms.
 *
 * This contract creates an electorate whose membership is not visible to
 * observers. There may be uses for such a structure, but it is not appropriate
 * for elections where the set of voters needs to be known, unless the contract
 * is used in a way that makes the distribution of voter facets visible.
 *
 * @param {ZCF<{
 *   committeeName: string,
 *   committeeSize: number,
 * }>} zcf
 * @param {{ storageNode: ERef<StorageNode>, marshaller: ERef<Marshaller>, customId: number }} privateArgs
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @returns {{creatorFacet: CommitteeElectorateCreatorFacet, publicFacet: CommitteeElectoratePublic}}
 */
export const start = (zcf, privateArgs, baggage) => {
  /** @type {MapStore<Handle<'Question'>, import('./electorateTools.js').QuestionRecord>} */
  const allQuestions = provideDurableMapStore(baggage, 'Question');
  const id = privateArgs?.customId || 0;
  const printId = () => console.log('fraz', 'id: committee', id);

  // CRUCIAL: voteCap carries the ability to cast votes for any voter at
  // any weight. It's wrapped here and given to the voter.
  //
  // Ensure that the voter can't get access to the unwrapped voteCap, and
  // has no control over the voteHandle or weight
  /** @type {Parameters<typeof prepareVoterKit>[1]['submitVote']} */
  const submitVote = (questionHandle, voterHandle, positions, weight) => {
    console.log(
      'fraz',
      'submitVote',
      questionHandle,
      voterHandle,
      positions,
      weight,
    );
    printId();
    const { voteCap } = allQuestions.get(questionHandle);
    return E(voteCap).submitVote(voterHandle, positions, weight);
  };

  const makeVoterKit = prepareVoterKit(baggage, printId, { zcf, submitVote });

  const questionNode = E(privateArgs.storageNode).makeChildNode(
    'latestQuestion',
  );
  /** @type {StoredPublishKit<QuestionDetails>} */
  const { subscriber: questionsSubscriber, publisher: questionsPublisher } =
    makeStoredPublishKit(questionNode, privateArgs.marshaller);

  const makeCommitteeVoterInvitation = index => {
    // https://github.com/Agoric/agoric-sdk/pull/3448/files#r704003612
    // This will produce unique descriptions because
    // makeCommitteeVoterInvitation() is only called within the following loop,
    // which is only called once per Electorate.

    console.log('fraz', 'makeCommitteeVoterInvitation', index);
    printId();
    return zcf.makeInvitation(
      seat => {
        seat.exit();
        return makeVoterKit(index);
      },
      `Voter${index}`,
      undefined,
      EmptyProposalShape,
    );
  };

  const { committeeName, committeeSize } = zcf.getTerms();

  const invitations = harden(
    [...Array(committeeSize).keys()].map(makeCommitteeVoterInvitation),
  );

  const publicFacet = prepareExo(
    baggage,
    'Committee publicFacet',
    ElectoratePublicI,
    {
      getQuestionSubscriber() {
        console.log('fraz', 'getQuestionSubscriber', questionsSubscriber);
        printId();
        return questionsSubscriber;
      },
      getOpenQuestions() {
        console.log('fraz', 'getOpenQuestions', getOpenQuestions(allQuestions));
        printId();
        return getOpenQuestions(allQuestions);
      },
      getName() {
        console.log('fraz', 'getName', committeeName);
        printId();
        return committeeName;
      },
      getInstance() {
        console.log('fraz', 'getInstance', zcf.getInstance());
        printId();
        return zcf.getInstance();
      },
      getQuestion(handleP) {
        console.log('fraz', 'getQuestion', getQuestion(handleP, allQuestions));
        printId();
        return getQuestion(handleP, allQuestions);
      },
      printId,
    },
  );

  const creatorFacet = prepareExo(
    baggage,
    'Committee creatorFacet',
    ElectorateCreatorI,
    {
      getPoserInvitation() {
        console.log('fraz', 'getPoserInvitation main');
        printId();
        return getPoserInvitation(zcf, async (voteCounter, questionSpec) => {
          console.log('fraz', 'getPoserInvitation inside');
          printId();
          return creatorFacet.addQuestion(voteCounter, questionSpec);
        });
      },
      /** @type {AddQuestion} */
      async addQuestion(voteCounter, questionSpec) {
        console.log('fraz', 'addQuestion', questionSpec, voteCounter);
        printId();
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

        const outcomeNode = E(privateArgs.storageNode).makeChildNode(
          'latestOutcome',
        );

        /** @type {StoredPublishKit<OutcomeRecord>} */
        const { publisher: outcomePublisher } = makeStoredPublishKit(
          outcomeNode,
          privateArgs.marshaller,
        );

        return startCounter(
          zcf,
          questionSpec,
          quorumThreshold(questionSpec.quorumRule),
          voteCounter,
          allQuestions,
          questionsPublisher,
          outcomePublisher,
        );
      },
      getVoterInvitations() {
        console.log('fraz', 'getVoterInvitations');
        printId();
        return invitations;
      },
      getQuestionSubscriber() {
        console.log('fraz', 'getQuestionSubscriber');
        printId();
        return questionsSubscriber;
      },

      getPublicFacet() {
        console.log('fraz', 'getPublicFacet');
        printId();
        return publicFacet;
      },

      printId,
    },
  );

  return { publicFacet, creatorFacet };
};
harden(start);
