/**
 * @import {Orchestrator, OrchestrationFlow} from '@agoric/orchestration';
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 */
export const makeLocalAccount = async orch => {
  const agoricChain = await orch.getChain('agoric');
  return agoricChain.makeAccount();
};
harden(makeLocalAccount);

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 */
export const makeNobleAccount = async orch => {
  const nobleChain = await orch.getChain('noble');
  return nobleChain.makeAccount();
};
harden(makeNobleAccount);
