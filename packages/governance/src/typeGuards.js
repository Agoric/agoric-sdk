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
