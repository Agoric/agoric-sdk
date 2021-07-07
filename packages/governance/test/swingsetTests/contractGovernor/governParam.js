// @ts-check

import { Far } from '@agoric/marshal';
import { E } from '@agoric/eventual-send';
import { q, details as X } from '@agoric/assert';

import { ChoiceMethod } from '../../../src/ballotBuilder';

const setupGovernance = (paramManager, registrar) => {
  const params = E(paramManager).getParams();
  const validNames = Object.keys(params);

  /**
   * @param {string} name
   * @param {ParamValue} proposedValue
   * @param {ClosingRule} closingRule
   */
  const setParamByVoting = async (name, proposedValue, closingRule) => {
    assert(
      validNames.includes(name),
      X`Name ${name} was not a governable parameter`,
    );
    /** @type {ParamDescription["type"]} */
    // TODO: use paramDescription.type to actually enforce the type
    // const paramType = params[name].type;

    const positivePosition = {
      text: `Change ${name} to ${q(proposedValue)}.`,
      proposedValue,
    };
    const negativePosition = {
      text: `Leave ${name} unchanged.`,
    };

    const binaryBallotDetails = {
      type: ElectionType.BINARY,
      method: ChoiceMethod.CHOOSE_N,
      questions: `Change ${name} in ${q(governedInstance)}?`,
      positions: [positivePosition, negativePosition],
      maxChoices: 1,
      quorumThreshold: QuorumRule.HALF,
      tieOutcome: negativePosition,
      closingRule,
    };

    const outcomeP = E(registrar).askQuestion(binaryBallotDetails);

    outcomeP
      .then(outcome => {
        if (outcome === positivePosition) {
          E(paramManager)
            [`update${name}`](proposedValue)
            .catch(e => {
              assert.note(e, X`Unable to update ${name} to ${proposedValue}`);
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
  };
  harden(setParamByVoting);
  return setParamByVoting;
};
harden(setupGovernance);
export { setupGovernance };
