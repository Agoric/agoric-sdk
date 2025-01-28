/**
 * @import {Orchestrator, OrchestrationFlow} from '@agoric/orchestration'
 * @import {TargetApp} from '@agoric/vats/src/bridge-target'
 * @import {Passable} from '@endo/pass-style'
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {unknown} _ctx
 * @param {TargetApp & Passable} tap
 */
export const makeHookAccount = async (orch, _ctx, tap) => {
  const agoricChain = await orch.getChain('agoric');
  const hookAccount = await agoricChain.makeAccount();

  const registration = hookAccount.monitorTransfers(tap);
  console.warn('TODO: keep registration', registration);

  return hookAccount;
};
harden(makeHookAccount);
