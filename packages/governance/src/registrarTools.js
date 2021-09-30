// @ts-check

import { E } from '@agoric/eventual-send';
import { allComparable } from '@agoric/same-structure';
import { Far } from '@agoric/marshal';

const startCounter = async (
  zcf,
  questionSpec,
  quorumThreshold,
  voteCounter,
  questionStore,
  publication,
) => {
  const ballotCounterTerms = {
    questionSpec,
    electorate: zcf.getInstance(),
    quorumThreshold,
  };

  // facets of the voteCounter. creatorInvitation and adminFacet not used
  const { creatorFacet, publicFacet, instance } = await E(
    zcf.getZoeService(),
  ).startInstance(voteCounter, {}, ballotCounterTerms);
  const details = await E(publicFacet).getDetails();
  const { deadline } = questionSpec.closingRule;
  publication.updateState(details);
  const questionHandle = details.questionHandle;

  const voteCounterFacets = { voteCap: creatorFacet, publicFacet, deadline };

  questionStore.init(questionHandle, voteCounterFacets);

  return { creatorFacet, publicFacet, instance, deadline, questionHandle };
};

const getOpenQuestions = async questionStore => {
  const isOpenPQuestions = questionStore.keys().map(key => {
    const { publicFacet } = questionStore.get(key);
    return [E(publicFacet).isOpen(), key];
  });

  const isOpenQuestions = await allComparable(harden(isOpenPQuestions));
  return isOpenQuestions
    .filter(([open, _key]) => open)
    .map(([_open, key]) => key);
};

const getQuestion = (questionHandleP, questionStore) =>
  E.when(questionHandleP, questionHandle =>
    E(questionStore.get(questionHandle).publicFacet).getQuestion(),
  );

const getPoserInvitation = (zcf, addQuestion) => {
  const questionPoserHandler = () => Far(`questionPoser`, { addQuestion });
  return zcf.makeInvitation(questionPoserHandler, `questionPoser`);
};

harden(startCounter);
harden(getOpenQuestions);
harden(getQuestion);
harden(getPoserInvitation);

export { startCounter, getOpenQuestions, getQuestion, getPoserInvitation };
