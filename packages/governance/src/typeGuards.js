// @ts-check

import { M } from '@agoric/store';
import { TimestampShape } from '@agoric/swingset-vat/src/vats/timer/typeGuards.js';

export const ChoiceMethodShape = M.or('unranked', 'order');
export const QuorumRuleShape = M.or('majority', 'no_quorum', 'all');
export const ElectionTypeShape = M.or(
  'param_change',
  'election',
  'survey',
  'api_invocation',
  'offer_filter',
);

const makeHandleShape = name => M.remotable(`${name}Handle`);

export const TimerShape = makeHandleShape('timer');
export const InstanceShape = makeHandleShape('instance');

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
export const OfferFilterPositionsShape = [
  YesOfferFilterPositionShape,
  NoOfferFilterPositionShape,
];
export const OfferFilterIssueShape = harden({
  strings: M.arrayOf(M.string()),
});
export const OfferFilterQuestionSpecShape = harden({
  method: ChoiceMethodShape,
  issue: OfferFilterIssueShape,
  positions: OfferFilterPositionsShape,
  electionType: 'offer_filter',
  maxChoices: M.eq(1),
  closingRule: ClosingRuleShape,
  quorumRule: QuorumRuleShape,
  tieOutcome: NoOfferFilterPositionShape,
});
export const OfferFilterQuestionDetailsShape = harden({
  method: ChoiceMethodShape,
  issue: OfferFilterIssueShape,
  positions: OfferFilterPositionsShape,
  electionType: 'offer_filter',
  maxChoices: M.eq(1),
  closingRule: ClosingRuleShape,
  quorumRule: QuorumRuleShape,
  tieOutcome: NoOfferFilterPositionShape,
  questionHandle: makeHandleShape('Question'),
  counterInstance: InstanceShape,
});

// keys are parameter names, values are proposed values
export const ParamChangesSpecShape = M.recordOf(M.string(), M.any());
export const YesParamChangesPositionShape = ParamChangesSpecShape;
export const NoParamChangesPositionShape = harden({
  noChange: M.arrayOf(M.string()),
});
export const ParamChangesPositionsShape = [
  YesParamChangesPositionShape,
  NoParamChangesPositionShape,
];
export const ParamPathShape = harden({
  key: M.any(),
});
export const ParamChangesIssueShape = harden({
  spec: {
    paramPath: ParamPathShape,
    changes: ParamChangesSpecShape,
  },
  contract: InstanceShape,
});
export const ParamChangesQuestionSpecShape = harden({
  method: 'unranked',
  issue: ParamChangesIssueShape,
  positions: ParamChangesPositionsShape,
  electionType: 'param_change',
  maxChoices: M.eq(1),
  closingRule: ClosingRuleShape,
  quorumRule: 'majority',
  tieOutcome: NoParamChangesPositionShape,
});

export const ParamChangesQuestionDetailsShape = harden({
  method: 'unranked',
  issue: ParamChangesIssueShape,
  positions: ParamChangesPositionsShape,
  electionType: 'param_change',
  maxChoices: M.eq(1),
  closingRule: ClosingRuleShape,
  quorumRule: 'majority',
  tieOutcome: NoParamChangesPositionShape,
  questionHandle: makeHandleShape('Question'),
  counterInstance: InstanceShape,
});

const ApiInvocationSpecShape = harden({
  apiMethodName: M.string(),
  methodArgs: M.arrayOf(M.any()),
});
export const YesApiInvocationPositionShape = ApiInvocationSpecShape;
export const NoApiInvocationPositionShape = harden({
  dontInvoke: M.string(),
});
export const ApiInvocationPositionsShape = [
  YesApiInvocationPositionShape,
  NoApiInvocationPositionShape,
];
export const ApiInvocationQuestionSpecShape = harden({
  method: 'unranked',
  issue: ApiInvocationSpecShape,
  positions: ApiInvocationPositionsShape,
  electionType: 'api_invocation',
  maxChoices: M.eq(1),
  closingRule: ClosingRuleShape,
  quorumRule: QuorumRuleShape,
  tieOutcome: NoApiInvocationPositionShape,
});
export const ApiInvocationQuestionDetailsShape = harden({
  method: 'unranked',
  issue: ApiInvocationSpecShape,
  positions: ApiInvocationPositionsShape,
  electionType: 'api_invocation',
  maxChoices: M.eq(1),
  closingRule: ClosingRuleShape,
  quorumRule: QuorumRuleShape,
  tieOutcome: NoApiInvocationPositionShape,
  questionHandle: makeHandleShape('Question'),
  counterInstance: InstanceShape,
});

const SimpleSpecShape = harden({
  text: M.string(),
});
export const YesSimplePositionShape = harden({ text: M.string() });
export const NoSimplePositionShape = harden({ text: M.string() });
export const SimplePositionsShape = [
  YesSimplePositionShape,
  NoSimplePositionShape,
];
export const SimpleIssueShape = SimpleSpecShape;
export const SimpleQuestionSpecShape = harden({
  method: ChoiceMethodShape,
  issue: SimpleIssueShape,
  positions: SimplePositionsShape,
  electionType: M.or('election', 'survey'),
  maxChoices: M.gte(1),
  closingRule: ClosingRuleShape,
  quorumRule: QuorumRuleShape,
  tieOutcome: NoSimplePositionShape,
});
export const SimpleQuestionDetailsShape = harden({
  method: ChoiceMethodShape,
  issue: SimpleIssueShape,
  positions: SimplePositionsShape,
  electionType: M.or('election', 'survey'),
  maxChoices: M.gte(1),
  closingRule: ClosingRuleShape,
  quorumRule: QuorumRuleShape,
  tieOutcome: NoSimplePositionShape,
  questionHandle: makeHandleShape('Question'),
  counterInstance: InstanceShape,
});

export const SimplePositionsShapeA = [
  harden({ text: 'yes' }),
  harden({ text: 'no' }),
];

export const SimpleQuestionSpecShapeA = harden({
  positions: SimplePositionsShape,
  tieOutcome: NoSimplePositionShape,
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
export const SubscriberShape = M.remotable('Subscriber');
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

export const CommitteePublicI = M.interface('Committee PublicFacet', {
  getQuestionSubscriber: M.call().returns(SubscriberShape),
  getOpenQuestions: M.call().returns(M.promise()),
  getName: M.call().returns(M.string()),
  getInstance: M.call().returns(InstanceShape),
  getQuestion: M.call(QuestionHandleShape).returns(M.promise()),
});

export const CommitteeAdminI = M.interface('Committee AdminFacet', {
  getPoserInvitation: M.call().returns(M.promise()),
  addQuestion: M.call(InstanceShape, QuestionSpecShape).returns(M.promise()),
  getVoterInvitations: M.call().returns(M.arrayOf(M.promise())),
  getQuestionSubscriber: M.call().returns(SubscriberShape),
  getPublicFacet: M.call().returns(CommitteePublicI),
});

export const CommitteeIKit = harden({
  publicFacet: CommitteePublicI,
  creatorFacet: CommitteeAdminI,
});

export const QuestionStatsShape = harden({
  spoiled: M.nat(),
  votes: M.nat(),
  results: M.arrayOf({ position: PositionShape, total: M.nat() }),
});

export const QuestionDetailI = M.interface('Question details', {
  getVoteCounter: M.call().returns(InstanceShape),
  getDetails: M.call().returns(QuestionDetailsShape),
});

export const BinaryVoteCounterPublicI = M.interface(
  'BinaryVoteCounter PublicFacet',
  {
    // XXX I expected M.call().returns(QuestionDetailI)
    getQuestion: M.call().returns(M.remotable()),
    isOpen: M.call().returns(M.boolean()),
    getOutcome: M.call().returns(M.eref(PositionShape)),
    getStats: M.call().returns(QuestionStatsShape),
    getDetails: M.call().returns(QuestionDetailsShape),
    getInstance: M.call().returns(InstanceShape),
  },
);

export const VoterHandle = M.remotable();
export const BinaryVoteCounterAdminI = M.interface(
  'BinaryVoteCounter AdminFacet',
  {
    submitVote: M.call(VoterHandle, M.arrayOf(PositionShape))
      .optional(M.nat())
      .returns(),
  },
);

export const BinaryVoteCounterCloseI = M.interface(
  'BinaryVoteCounter CloseFacet',
  {
    closeVoting: M.call().returns(),
  },
);

export const BinaryVoteCounterIKit = harden({
  publicFacet: BinaryVoteCounterPublicI,
  creatorFacet: BinaryVoteCounterAdminI,
  closeFacet: BinaryVoteCounterCloseI,
});
