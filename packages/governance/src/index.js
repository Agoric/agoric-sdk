// XXX ambient types runtime imports until https://github.com/Agoric/agoric-sdk/issues/6512
import '@agoric/ertp/exported.js';
import '@agoric/zoe/src/contractFacet/types-ambient.js';
import '@agoric/zoe/tools/types-ambient.js';
import '@agoric/zoe/src/types.js';

/// <reference path="./types-ambient.js" />

export {
  ChoiceMethod,
  ElectionType,
  QuorumRule,
  coerceQuestionSpec,
  positionIncluded,
  buildQuestion,
} from './question.js';

export {
  validateQuestionDetails,
  validateQuestionFromCounter,
} from './contractGovernor.js';

export { handleParamGovernance, publicMixinAPI } from './contractHelper.js';

export {
  assertBallotConcernsParam,
  makeParamChangePositions,
  setupParamGovernance,
  CONTRACT_ELECTORATE,
} from './contractGovernance/governParam.js';

export {
  assertElectorateMatches,
  makeParamManagerBuilder,
} from './contractGovernance/paramManager.js';

export {
  makeParamManager,
  makeParamManagerSync,
} from './contractGovernance/typedParamManager.js';

export {
  assertContractGovernance,
  assertContractElectorate,
} from './validators.js';

export { ParamTypes } from './constants.js';
