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

export const ClosingRuleShape = {
  timer: M.eref(TimerShape),
  deadline: TimestampShape,
};
harden(ClosingRuleShape);

// all the strings that will be in the filter after passing
export const YesOfferFilterPositionShape = {
  strings: M.arrayOf(M.string()),
};
harden(YesOfferFilterPositionShape);

export const NoOfferFilterPositionShape = { dontUpdate: M.arrayOf(M.string()) };
harden(NoOfferFilterPositionShape);

export const OfferFilterPositionsShape = [
  YesOfferFilterPositionShape,
  NoOfferFilterPositionShape,
];
harden(OfferFilterPositionsShape);

export const OfferFilterIssueShape = { strings: M.arrayOf(M.string()) };
harden(OfferFilterIssueShape);

export const OfferFilterQuestionSpecShape = {
  method: ChoiceMethodShape,
  issue: OfferFilterIssueShape,
  positions: OfferFilterPositionsShape,
  electionType: 'offer_filter',
  maxChoices: 1,
  maxWinners: 1,
  closingRule: ClosingRuleShape,
  quorumRule: QuorumRuleShape,
  tieOutcome: NoOfferFilterPositionShape,
};
harden(OfferFilterQuestionSpecShape);

export const OfferFilterQuestionDetailsShape = {
  ...OfferFilterQuestionSpecShape,
  questionHandle: makeHandleShape('Question'),
  counterInstance: InstanceHandleShape,
};
harden(OfferFilterQuestionDetailsShape);

// keys are parameter names, values are proposed values
export const ParamChangesSpecShape = M.recordOf(M.string(), M.any());
export const YesParamChangesPositionShape = ParamChangesSpecShape;
export const NoParamChangesPositionShape = { noChange: M.arrayOf(M.string()) };
harden(NoParamChangesPositionShape);

export const ParamChangesPositionsShape = [
  YesParamChangesPositionShape,
  NoParamChangesPositionShape,
];
harden(ParamChangesPositionsShape);

export const ParamPathShape = { key: M.any() };
harden(ParamPathShape);

export const ParamChangesIssueShape = {
  spec: {
    paramPath: ParamPathShape,
    changes: ParamChangesSpecShape,
  },
  contract: InstanceHandleShape,
};
harden(ParamChangesIssueShape);

export const ParamChangesQuestionSpecShape = {
  method: 'unranked',
  issue: ParamChangesIssueShape,
  positions: ParamChangesPositionsShape,
  electionType: 'param_change',
  maxChoices: 1,
  maxWinners: 1,
  closingRule: ClosingRuleShape,
  quorumRule: 'majority',
  tieOutcome: NoParamChangesPositionShape,
};
harden(ParamChangesQuestionSpecShape);

export const ParamChangesQuestionDetailsShape = {
  ...ParamChangesQuestionSpecShape,
  questionHandle: makeHandleShape('Question'),
  counterInstance: InstanceHandleShape,
};
harden(ParamChangesQuestionDetailsShape);

const ApiInvocationSpecShape = {
  apiMethodName: M.string(),
  methodArgs: M.arrayOf(M.any()),
};
harden(ApiInvocationSpecShape);

export const YesApiInvocationPositionShape = ApiInvocationSpecShape;
export const NoApiInvocationPositionShape = { dontInvoke: M.string() };
harden(NoApiInvocationPositionShape);

export const ApiInvocationPositionsShape = [
  YesApiInvocationPositionShape,
  NoApiInvocationPositionShape,
];
harden(ApiInvocationPositionsShape);

export const ApiInvocationQuestionSpecShape = {
  method: 'unranked',
  issue: ApiInvocationSpecShape,
  positions: ApiInvocationPositionsShape,
  electionType: 'api_invocation',
  maxChoices: 1,
  maxWinners: 1,
  closingRule: ClosingRuleShape,
  quorumRule: QuorumRuleShape,
  tieOutcome: NoApiInvocationPositionShape,
};
harden(ApiInvocationQuestionSpecShape);

export const ApiInvocationQuestionDetailsShape = {
  ...ApiInvocationQuestionSpecShape,
  questionHandle: makeHandleShape('Question'),
  counterInstance: InstanceHandleShape,
};
harden(ApiInvocationQuestionDetailsShape);

const SimpleSpecShape = { text: M.string() };
harden(SimpleSpecShape);

export const YesSimplePositionShape = { text: M.string() };
harden(YesSimplePositionShape);

export const NoSimplePositionShape = { text: M.string() };
harden(NoSimplePositionShape);

export const SimplePositionsShape = [
  YesSimplePositionShape,
  NoSimplePositionShape,
];
harden(SimplePositionsShape);

export const SimpleIssueShape = SimpleSpecShape;
harden(SimpleIssueShape);

export const SimpleQuestionSpecShape = {
  method: ChoiceMethodShape,
  issue: SimpleIssueShape,
  positions: M.arrayOf({ text: M.string() }),
  electionType: M.or('election', 'survey'),
  maxChoices: M.gte(1),
  maxWinners: M.gte(1),
  closingRule: ClosingRuleShape,
  quorumRule: QuorumRuleShape,
  tieOutcome: NoSimplePositionShape,
};
harden(SimpleQuestionSpecShape);

export const SimpleQuestionDetailsShape = {
  ...SimpleQuestionSpecShape,
  questionHandle: makeHandleShape('Question'),
  counterInstance: InstanceHandleShape,
};
harden(SimpleQuestionDetailsShape);

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

export const QuestionStatsShape = {
  spoiled: M.nat(),
  votes: M.nat(),
  results: M.arrayOf({ position: PositionShape, total: M.nat() }),
};
harden(QuestionStatsShape);

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
