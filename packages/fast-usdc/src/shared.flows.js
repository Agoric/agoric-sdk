/**
 * @file Flows from orchestration examples
 */
/**
 * @import {Orchestrator, OrchestrationFlow, LocalAccountMethods} from '@agoric/orchestration';
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @returns {Promise<LocalAccountMethods>}
 */
export const makeLocalAccount = async orch => {
  const agoricChain = await orch.getChain('agoric');
  return agoricChain.makeAccount();
};
harden(makeLocalAccount);
