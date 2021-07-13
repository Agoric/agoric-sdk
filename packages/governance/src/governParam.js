// @ts-check

import { details as X, q } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';

import {
  makeBallotSpec,
  ChoiceMethod,
  QuorumRule,
  ElectionType,
} from './ballotBuilder';
import { assertType } from './paramManager';

const paramChangePositions = (paramName, proposedValue) => {
  const positive = `change ${paramName} to ${q(proposedValue)}.`;
  const negative = `leave ${paramName} unchanged.`;
  return { positive, negative };
};

/** @type {SetupGovernance} */
const setupGovernance = async (
  paramManagerAccessor,
  registrarInstance,
  contractInstance,
) => {
  const voteOnParamChange = async (
    paramName,
    proposedValue,
    ballotCounterInstallation,
    closingRule,
    paramDesc,
  ) => {
    const paramMgr = E(paramManagerAccessor).get(paramDesc);
    const param = await E(paramMgr).getParam(paramName);
    assertType(param.type, proposedValue, paramName);

    const { positive, negative } = paramChangePositions(
      paramName,
      proposedValue,
    );
    const ballotSpec = makeBallotSpec(
      ChoiceMethod.CHOOSE_N,
      {
        param: paramName,
        contract: contractInstance,
        proposedValue,
      },
      [positive, negative],
      ElectionType.PARAM_CHANGE,
      1,
    );
    /** @type {BinaryBallotDetails} */
    const binaryBallotDetails = harden({
      ballotSpec,
      quorumRule: QuorumRule.HALF,
      tieOutcome: negative,
      closingRule,
    });

    const {
      publicFacet: counterPublicFacet,
      instance: ballotCounter,
    } = await E(registrarInstance).addQuestion(
      ballotCounterInstallation,
      binaryBallotDetails,
    );

    E(counterPublicFacet)
      .getOutcome()
      .then(outcome => {
        if (outcome === positive) {
          E(paramMgr)
            [`update${paramName}`](proposedValue)
            .catch(e => {
              assert.note(
                e,
                X`Unable to update ${paramName} to ${proposedValue}`,
              );
              throw e;
            });
        }
        return outcome;
      })
      .catch(e => {
        assert.note(
          e,
          X`There was an error in computing the vote with details: ${binaryBallotDetails}`,
        );
        throw e;
      });

    const details = await E(counterPublicFacet).getDetails();

    return {
      ...binaryBallotDetails,
      instance: ballotCounter,
      details,
    };
  };

  return Far('paramGovernor', { voteOnParamChange });
};

harden(setupGovernance);
harden(paramChangePositions);
export { setupGovernance, paramChangePositions };
