/**
 * @file Flows shared by multiple examples
 *
 *   A module with flows can be used be reused across multiple contracts. They are
 *   bound to a particular contract's context via orchestrateAll. See
 *   ./send-anywhere.contract.js for example usage.
 */
/**
 * @import {Orchestrator, OrchestrationFlow, LocalAccountMethods} from '../types.js';
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
