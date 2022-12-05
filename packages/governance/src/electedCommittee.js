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

  /** @type {StoredPublishKit<QuestionDetails>} */
  const { subscriber: questionsSubscriber, publisher: questionsPublisher } =
    makeStoredPublishKit(questionNode, privateArgs.marshaller);

  const committee = makeStore('committee');
  /** @type {Store<Handle<'Question'>, import('./electorateTools.js').QuestionRecord>} */
  const allQuestions = makeStore('Question');

  /** @type {AddQuestionReturn} */
  let committeeVoteCounter;

  const makeCommitteeVoterInvitation = index => {
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

      // CRUCIAL: voteCap carries the ability to cast votes for any voter at
      // any weight. It's wrapped here and given to the voter.
      //
      // Ensure that the voter can't get access to the unwrapped voteCap, and
      // has no control over the voteHandle or weight
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

    // https://github.com/Agoric/agoric-sdk/pull/3448/files#r704003612
    // This will produce unique descriptions because
    // makeCommitteeVoterInvitation() is only called within the following loop,
    // which is only called once per Electorate.
    return zcf.makeInvitation(offerHandler, `Voter${index}`);
  };

  const makeCommitteeElectorInvitation = index => {
    const offerHandler = seat => {
      const voterHandle = makeHandle('Voter');
      seat.exit();

      const VoterI = M.interface('voter', {
        castBallotFor: M.call(
          QuestionHandleShape,
          M.arrayOf(PositionShape),
        ).returns(M.promise()),
      });
      return harden({
        voter: makeHeapFarInstance(`voter${index}`, VoterI, {
          castBallotFor(questionHandle, positions) {
            const { voteCap } = allQuestions.get(questionHandle);
            return E(voteCap).submitVote(voterHandle, positions, 1n);
          },
        }),
      });
    };

    return zcf.makeInvitation(offerHandler, `Voter${index}`);
  };

  const { committeeName, committeeSize } = zcf.getTerms();

  const committeeVoterInvitations = harden(
    committee.get('members').map((_, i) => makeCommitteeVoterInvitation(i)),
  );

  const committeeElectorInvitations = harden(
    [...Array(committeeSize).keys()].map(makeCommitteeElectorInvitation),
  );

  const publicFacet = makeHeapFarInstance(
    'Committee publicFacet',
    ElectoratePublicI,
    {
      getCommitteeMembers() {
        return committee.get('members');
      },
      getQuestionSubscriber() {
        return questionsSubscriber;
      },
      getOpenQuestions() {
        return getOpenQuestions(allQuestions);
      },
      getName() {
        return committeeName;
      },
      getInstance() {
        return zcf.getInstance();
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
      addCommitteeVoters(voteCounter, questionSpec) {
        const outcomeNode = E(privateArgs.storageNode).makeChildNode(
          'latestOutcome',
        );

        /** @type {StoredPublishKit<OutcomeRecord>} */
        const { publisher: outcomePublisher } = makeStoredPublishKit(
          outcomeNode,
          privateArgs.marshaller,
        );

        const counter = startCounter(
          zcf,
          questionSpec,
          quorumThreshold(questionSpec.quorumRule),
          voteCounter,
          allQuestions,
          questionsPublisher,
          outcomePublisher,
        );

        committeeVoteCounter = counter;

        return counter;
      },
      async verifyCommitteeVote() {
        assert(
          !committeeVoteCounter.publicFacet.isOpen(),
          'Committee vote is still open',
        );

        const outcome = await committeeVoteCounter.publicFacet.getOutcome();

        committee.set('members', [outcome]);
      },
      getCommitteeVoterInvitations() {
        return committeeVoterInvitations;
      },
      getCommitteeElectorInvitations() {
        return committeeElectorInvitations;
      },
      getQuestionSubscriber() {
        return questionsSubscriber;
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
