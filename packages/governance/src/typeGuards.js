import { M } from '@agoric/store';
import { TimestampShape } from '@agoric/time';
import {
  InstanceHandleShape,
  TimerShape,
  makeHandleShape,
} from '@agoric/zoe/src/typeGuards.js';
import { SubscriberShape } from '@agoric/notifier';

export const ChoiceMethodShape = M.or('unranked', 'order', 'plurality');
export const QuorumRuleShape = M.or('majority', 'no_quorum', 'all');
export const ElectionTypeShape = M.or(
  'param_change',
  'election',
  'survey',
  'api_invocation',
  'offer_filter',
);

export const ClosingRuleShape = harden({
  timer: M.eref(TimerShape),
  deadline: TimestampShape,
});

// all the strings that will be in the filter after passing
export const YesOfferFilterPositionShape = harden({
  strings: M.arrayOf(M.string()),
});
export const NoOfferFilterPositionShape = harden({
  dontUpdate: M.arrayOf(M.string()),
});
export const OfferFilterPositionsShape = harden([
  YesOfferFilterPositionShape,
  NoOfferFilterPositionShape,
]);
export const OfferFilterIssueShape = harden({
  strings: M.arrayOf(M.string()),
});
export const OfferFilterQuestionSpecShape = harden({
  method: ChoiceMethodShape,
  issue: OfferFilterIssueShape,
  positions: OfferFilterPositionsShape,
  electionType: 'offer_filter',
  maxChoices: 1,
  maxWinners: 1,
  closingRule: ClosingRuleShape,
  quorumRule: QuorumRuleShape,
  tieOutcome: NoOfferFilterPositionShape,
});
export const OfferFilterQuestionDetailsShape = harden({
  ...OfferFilterQuestionSpecShape,
  questionHandle: makeHandleShape('Question'),
  counterInstance: InstanceHandleShape,
});

// keys are parameter names, values are proposed values
export const ParamChangesSpecShape = M.recordOf(M.string(), M.any());
export const YesParamChangesPositionShape = ParamChangesSpecShape;
export const NoParamChangesPositionShape = harden({
  noChange: M.arrayOf(M.string()),
});
export const ParamChangesPositionsShape = harden([
  YesParamChangesPositionShape,
  NoParamChangesPositionShape,
]);
export const ParamPathShape = harden({
  key: M.any(),
});
export const ParamChangesIssueShape = harden({
  spec: {
    paramPath: ParamPathShape,
    changes: ParamChangesSpecShape,
  },
  contract: InstanceHandleShape,
});
export const ParamChangesQuestionSpecShape = harden({
  method: 'unranked',
  issue: ParamChangesIssueShape,
  positions: ParamChangesPositionsShape,
  electionType: 'param_change',
  maxChoices: 1,
  maxWinners: 1,
  closingRule: ClosingRuleShape,
  quorumRule: 'majority',
  tieOutcome: NoParamChangesPositionShape,
});

export const ParamChangesQuestionDetailsShape = harden({
  ...ParamChangesQuestionSpecShape,
  questionHandle: makeHandleShape('Question'),
  counterInstance: InstanceHandleShape,
});

const ApiInvocationSpecShape = harden({
  apiMethodName: M.string(),
  methodArgs: M.arrayOf(M.any()),
});
export const YesApiInvocationPositionShape = ApiInvocationSpecShape;
export const NoApiInvocationPositionShape = harden({
  dontInvoke: M.string(),
});
export const ApiInvocationPositionsShape = harden([
  YesApiInvocationPositionShape,
  NoApiInvocationPositionShape,
]);
export const ApiInvocationQuestionSpecShape = harden({
  method: 'unranked',
  issue: ApiInvocationSpecShape,
  positions: ApiInvocationPositionsShape,
  electionType: 'api_invocation',
  maxChoices: 1,
  maxWinners: 1,
  closingRule: ClosingRuleShape,
  quorumRule: QuorumRuleShape,
  tieOutcome: NoApiInvocationPositionShape,
});
export const ApiInvocationQuestionDetailsShape = harden({
  ...ApiInvocationQuestionSpecShape,
  questionHandle: makeHandleShape('Question'),
  counterInstance: InstanceHandleShape,
});

const SimpleSpecShape = harden({
  text: M.string(),
});
export const YesSimplePositionShape = harden({ text: M.string() });
export const NoSimplePositionShape = harden({ text: M.string() });
export const SimplePositionsShape = harden([
  YesSimplePositionShape,
  NoSimplePositionShape,
]);
export const SimpleIssueShape = SimpleSpecShape;
export const SimpleQuestionSpecShape = harden({
  method: ChoiceMethodShape,
  issue: SimpleIssueShape,
  positions: M.arrayOf(harden({ text: M.string() })),
  electionType: M.or('election', 'survey'),
  maxChoices: M.gte(1),
  maxWinners: M.gte(1),
  closingRule: ClosingRuleShape,
  quorumRule: QuorumRuleShape,
  tieOutcome: NoSimplePositionShape,
});
export const SimpleQuestionDetailsShape = harden({
  ...SimpleQuestionSpecShape,
  questionHandle: makeHandleShape('Question'),
  counterInstance: InstanceHandleShape,
});

export const QuestionSpecShape = M.or(
  ApiInvocationQuestionSpecShape,
  OfferFilterQuestionSpecShape,
  ParamChangesQuestionSpecShape,
  SimpleQuestionSpecShape,
);

export const PositionShape = M.or(
  YesApiInvocationPositionShape,
  NoApiInvocationPositionShape,
  YesOfferFilterPositionShape,
  NoOfferFilterPositionShape,
  YesSimplePositionShape,
  NoSimplePositionShape,
  YesParamChangesPositionShape,
  NoParamChangesPositionShape,
);

export const QuestionHandleShape = makeHandleShape('question');

// TODO(hibbert): add details; move to a more appropriate location
export const InvitationShape = M.remotable('Invitation');

// XXX I want to add questionHandle and counterInstance to
// ParamChangesQuestionSpecShape. I don't see any alternative to adding the
// methods to each member separately
export const QuestionDetailsShape = M.or(
  ParamChangesQuestionDetailsShape,
  ApiInvocationQuestionDetailsShape,
  OfferFilterQuestionDetailsShape,
  SimpleQuestionDetailsShape,
);

export const ElectoratePublicI = M.interface('Committee PublicFacet', {
  getQuestionSubscriber: M.call().returns(SubscriberShape),
  getOpenQuestions: M.call().returns(M.promise()),
  getName: M.call().returns(M.string()),
  getInstance: M.call().returns(InstanceHandleShape),
  getQuestion: M.call(QuestionHandleShape).returns(M.promise()),
});
const ElectoratePublicShape = M.remotable('ElectoratePublic');

export const ElectorateCreatorI = M.interface('Committee AdminFacet', {
  getPoserInvitation: M.call().returns(M.promise()),
  addQuestion: M.call(InstanceHandleShape, QuestionSpecShape).returns(
    M.promise(),
  ),
  getVoterInvitations: M.call().returns(M.arrayOf(M.promise())),
  getQuestionSubscriber: M.call().returns(SubscriberShape),
  getPublicFacet: M.call().returns(ElectoratePublicShape),
});

export const QuestionStatsShape = harden({
  spoiled: M.nat(),
  votes: M.nat(),
  results: M.arrayOf({ position: PositionShape, total: M.nat() }),
});

export const QuestionI = M.interface('Question', {
  getVoteCounter: M.call().returns(InstanceHandleShape),
  getDetails: M.call().returns(QuestionDetailsShape),
});
const QuestionShape = M.remotable('Question');

export const BinaryVoteCounterPublicI = M.interface(
  'BinaryVoteCounter PublicFacet',
  {
    getQuestion: M.call().returns(QuestionShape),
    isOpen: M.call().returns(M.boolean()),
    getOutcome: M.call().returns(M.eref(M.promise())),
    getStats: M.call().returns(M.promise()),
    getDetails: M.call().returns(QuestionDetailsShape),
    getInstance: M.call().returns(InstanceHandleShape),
  },
);

export const VoterHandle = M.remotable();
export const BinaryVoteCounterAdminI = M.interface(
  'BinaryVoteCounter AdminFacet',
  {
    submitVote: M.call(VoterHandle, M.arrayOf(PositionShape))
      .optional(M.nat())
      .returns({ chosen: PositionShape, shares: M.nat() }),
  },
);

export const BinaryVoteCounterCloseI = M.interface(
  'BinaryVoteCounter CloseFacet',
  {
    closeVoting: M.call().returns(),
  },
);

export const VoteCounterPublicI = M.interface('VoteCounter PublicFacet', {
  getQuestion: M.call().returns(QuestionShape),
  isOpen: M.call().returns(M.boolean()),
  getOutcome: M.call().returns(M.eref(M.promise())),
  getStats: M.call().returns(M.promise()),
  getDetails: M.call().returns(QuestionDetailsShape),
  getInstance: M.call().returns(InstanceHandleShape),
});

export const VoteCounterAdminI = M.interface('VoteCounter AdminFacet', {
  submitVote: M.call(VoterHandle, M.arrayOf(PositionShape))
    .optional(M.nat())
    .returns({ chosen: M.arrayOf(PositionShape), shares: M.nat() }),
});

export const VoteCounterCloseI = M.interface('VoteCounter CloseFacet', {
  closeVoting: M.call().returns(),
});

export const GovernorFacetShape = {
  getParamMgrRetriever: M.call().returns(M.remotable('paramRetriever')),
  getInvitation: M.call().returns(InvitationShape),
  getLimitedCreatorFacet: M.call().returns(M.remotable()),
  getGovernedApis: M.call().returns(M.remotable('governedAPIs')),
  getGovernedApiNames: M.call().returns(M.arrayOf(M.string())),
  setOfferFilter: M.call(M.arrayOf(M.string())).returns(M.promise()),
};
harden(GovernorFacetShape);
