// @ts-check

import { E } from '@agoric/eventual-send';
import { allComparable } from '@agoric/same-structure';
import { Far } from '@agoric/marshal';

/**
 * @param {ContractFacet} zcf
 * @param {QuestionSpec} questionSpec
 * @param {unknown} quorumThreshold
 * @param {Installation} voteCounter
 * @param {Store<Handle<'Question'>, QuestionRecord>} questionStore
 * @param {IterationObserver<unknown>} publication
 */
const startCounter = async (
  zcf,
  questionSpec,
  quorumThreshold,
  voteCounter,
  questionStore,
  publication,
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
  ).startInstance(voteCounter, {}, voteCounterTerms);
  const details = await E(publicFacet).getDetails();
  const { deadline } = questionSpec.closingRule;
  publication.updateState(details);
  const questionHandle = details.questionHandle;

  const voteCounterFacets = { voteCap: creatorFacet, publicFacet, deadline };

  questionStore.init(questionHandle, voteCounterFacets);

  return { creatorFacet, publicFacet, instance, deadline, questionHandle };
};

/**
 * @param {Store<Handle<'Question'>, QuestionRecord>} questionStore
 */
const getOpenQuestions = async questionStore => {
  const isOpenPQuestions = questionStore.keys().map(key => {
    const { publicFacet } = questionStore.get(key);
    return [E(publicFacet).isOpen(), key];
  });

  /** @type {[boolean, Handle<'Question'>][]} */
  const isOpenQuestions = await allComparable(harden(isOpenPQuestions));
  return isOpenQuestions
    .filter(([open, _key]) => open)
    .map(([_open, key]) => key);
};

/**
 * @param {ERef<Handle<'Question'>>} questionHandleP
 * @param {Store<Handle<'Question'>, QuestionRecord>} questionStore
 */
const getQuestion = (questionHandleP, questionStore) =>
  E.when(questionHandleP, questionHandle =>
    E(questionStore.get(questionHandle).publicFacet).getQuestion(),
  );

/**
 * @param {ContractFacet} zcf
 * @param {unknown} addQuestion
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
