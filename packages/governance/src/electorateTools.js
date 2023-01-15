import { E, Far } from '@endo/far';
import { deeplyFulfilled } from '@endo/marshal';

/**
 * @typedef {object} QuestionRecord
 * @property {ERef<VoteCounterCreatorFacet>} voteCap
 * @property {VoteCounterPublicFacet} publicFacet
 * @property {Timestamp} deadline
 */

/**
 * @callback StartCounter
 * @param {ZCF} zcf
 * @param {QuestionSpec} questionSpec
 * @param {unknown} quorumThreshold
 * @param {ERef<Installation>} voteCounter
 * @param {MapStore<Handle<'Question'>, QuestionRecord>} questionStore
 * @param {Publisher<unknown>} questionPublisher
 * @param {Publisher<OutcomeRecord>} outcomePublisher
 * @returns {AddQuestionReturn}
 */

/**
 * Start up a new Counter for a question
 *
 * @type {StartCounter}
 */
const startCounter = async (
  zcf,
  questionSpec,
  quorumThreshold,
  voteCounter,
  questionStore,
  questionsPublisher,
  outcomePublisher,
) => {
  const voteCounterTerms = {
    questionSpec,
    electorate: zcf.getInstance(),
    quorumThreshold,
  };

  // facets of the voteCounter. creatorInvitation and adminFacet not used
  /** @type {{ creatorFacet: VoteCounterCreatorFacet, publicFacet: VoteCounterPublicFacet, instance: Instance }} */
  const { creatorFacet, publicFacet, instance } = await E(
    zcf.getZoeService(),
  ).startInstance(voteCounter, {}, voteCounterTerms, { outcomePublisher });
  const details = await E(publicFacet).getDetails();
  const { deadline } = questionSpec.closingRule;
  questionsPublisher.publish(details);
  const questionHandle = details.questionHandle;

  const voteCounterFacets = { voteCap: creatorFacet, publicFacet, deadline };

  questionStore.init(questionHandle, voteCounterFacets);

  return { creatorFacet, publicFacet, instance, deadline, questionHandle };
};

/** @param {MapStore<Handle<'Question'>, QuestionRecord>} questionStore */
const getOpenQuestions = async questionStore => {
  const isOpenPQuestions = [...questionStore.entries()].map(
    ([key, { publicFacet }]) => {
      return [E(publicFacet).isOpen(), key];
    },
  );

  const isOpenQuestions = await deeplyFulfilled(harden(isOpenPQuestions));
  return isOpenQuestions
    .filter(([open, _key]) => open)
    .map(([_open, key]) => key);
};

/**
 * @param {ERef<Handle<'Question'>>} questionHandleP
 * @param {MapStore<Handle<'Question'>, QuestionRecord>} questionStore
 */
const getQuestion = (questionHandleP, questionStore) =>
  E.when(questionHandleP, questionHandle =>
    E(questionStore.get(questionHandle).publicFacet).getQuestion(),
  );

/**
 * @param {ZCF} zcf
 * @param {AddQuestion} addQuestion
 */
const getPoserInvitation = (zcf, addQuestion) => {
  const questionPoserHandler = () => Far(`questionPoser`, { addQuestion });
  return zcf.makeInvitation(questionPoserHandler, `questionPoser`);
};

harden(startCounter);
harden(getOpenQuestions);
harden(getQuestion);
harden(getPoserInvitation);

export { startCounter, getOpenQuestions, getQuestion, getPoserInvitation };
