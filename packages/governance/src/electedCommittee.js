import { makeStoredPublishKit } from '@agoric/notifier';
import { M, makeHeapFarInstance, makeStore } from '@agoric/store';
import { natSafeMath } from '@agoric/zoe/src/contractSupport/index.js';
import { makeHandle } from '@agoric/zoe/src/makeHandle';
import { E } from '@endo/eventual-send';
import {
  startCounter,
  getPoserInvitation,
  getOpenQuestions,
  getQuestion,
} from './electorateTools';
import { QuorumRule } from './question';
import {
  ElectorateCreatorI,
  ElectoratePublicI,
  PositionShape,
  QuestionHandleShape,
} from './typeGuards';

const { ceilDivide } = natSafeMath;

const quorumThreshold = (quorumRule, committeeSize) => {
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

/**
 *
 * @param {*} zcf
 * @param {*} privateArgs
 */
const start = (zcf, privateArgs) => {
  assert(privateArgs?.storageNode, 'Missing storageNode');
  assert(privateArgs?.marshaller, 'Missing marshaller');

  const questionNode = E(privateArgs.storageNode).makeChildNode(
    'latestQuestion',
  );

  const electionQuestionNode = E(privateArgs.storageNode).makeChildNode(
    'latestElectionQuestion',
  );

  /** @type {StoredPublishKit<QuestionDetails>} */
  const { subscriber: questionsSubscriber, publisher: questionsPublisher } =
    makeStoredPublishKit(questionNode, privateArgs.marshaller);

  /** @type {StoredPublishKit<QuestionDetails>} */
  const {
    subscriber: electionQuestionsSubscriber,
    publisher: electionQuestionsPublisher,
  } = makeStoredPublishKit(electionQuestionNode, privateArgs.marshaller);

  /** @type {Store<Handle<'Question'>, import('./electorateTools.js').QuestionRecord>} */
  const allQuestions = makeStore('Question');

  /** @type {Store<Handle<'Question'>, import('./electorateTools.js').QuestionRecord>} */
  const allElectionQuestions = makeStore('ElectionQuestion');

  const makeElectorInvitation = index => {
    /** @type {OfferHandler} */
    const offerHandler = seat => {
      const voterHandle = makeHandle('Voter');
      seat.exit();

      const VoterI = M.interface('voter', {
        castBallotFor: M.call(
          QuestionHandleShape,
          M.arrayOf(PositionShape),
        ).returns(M.promise()),
      });
      const InvitationMakerI = M.interface('invitationMaker', {
        makeVoteInvitation: M.call(
          M.arrayOf(PositionShape),
          QuestionHandleShape,
        ).returns(M.promise()),
      });

      return harden({
        voter: makeHeapFarInstance(`voter${index}`, VoterI, {
          castBallotFor(questionHandle, positions) {
            const { voteCap } = allQuestions.get(questionHandle);
            return E(voteCap).submitVote(voterHandle, positions, 1n);
          },
        }),
        invitationMakers: makeHeapFarInstance(
          'invitation makers',
          InvitationMakerI,
          {
            makeVoteInvitation(positions, questionHandle) {
              const continuingVoteHandler = cSeat => {
                cSeat.exit();
                const { voteCap } = allQuestions.get(questionHandle);
                return E(voteCap).submitVote(voterHandle, positions, 1n);
              };

              return zcf.makeInvitation(continuingVoteHandler, 'vote');
            },
          },
        ),
      });
    };

    return zcf.makeInvitation(offerHandler, `Voter${index}`);
  };

  const { committeeName, committeeSize } = zcf.getTerms();

  const electorateInvitations = harden(
    [...Array(committeeSize).keys()].map(makeElectorInvitation),
  );

  const publicFacet = makeHeapFarInstance(
    'Committee publicFacet',
    ElectoratePublicI,
    {
      getQuestionSubscriber() {
        return questionsSubscriber;
      },
      getElectionQuestionSubscriber() {
        return electionQuestionsSubscriber;
      },
      getOpenQuestions() {
        return getOpenQuestions(allQuestions);
      },
      getElectionQuestions() {
        return getOpenQuestions(allElectionQuestions);
      },
      getName() {
        return committeeName;
      },
      getInstance() {
        return zcf.getInstance();
      },
      getElectionQuestion(handleP) {
        return getQuestion(handleP, allElectionQuestions);
      },
      getQuestion(handleP) {
        return getQuestion(handleP, allQuestions);
      },
    },
  );

  const creatorFacet = makeHeapFarInstance(
    'Committee creatorFacet',
    ElectorateCreatorI,
    {
      getPoserInvitation() {
        return getPoserInvitation(zcf, async (voteCounter, questionSpec) =>
          creatorFacet.addQuestion(voteCounter, questionSpec),
        );
      },
      startCommitteeElection(voteCounter, questionSpec) {
        const outcomeNode = E(privateArgs.storageNode).makeChildNode(
          'latestElectionOutcome',
        );

        /** @type {StoredPublishKit<OutcomeRecord>} */
        const { publisher: outcomePublisher } = makeStoredPublishKit(
          outcomeNode,
          privateArgs.marshaller,
        );

        return startCounter(
          zcf,
          questionSpec,
          quorumThreshold(questionSpec.quorumRule, committeeSize),
          voteCounter,
          allElectionQuestions,
          electionQuestionsPublisher,
          outcomePublisher,
        );
      },
      /** @type {AddQuestion} */
      async addQuestion(voteCounter, questionSpec) {
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
        return electorateInvitations;
      },
      getQuestionSubscriber() {
        return questionsSubscriber;
      },
      getElectionQuestionSubscriber() {
        return electionQuestionsSubscriber;
      },
      getPublicFacet() {
        return publicFacet;
      },
    },
  );

  return { publicFacet, creatorFacet };
};

harden(start);
export { start };
