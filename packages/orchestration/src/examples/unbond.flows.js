import { makeTracer } from '@agoric/internal';

const trace = makeTracer('UnbondAndTransfer');

/**
 * @import {Orchestrator, OrchestrationFlow, CosmosDelegationResponse, ZcfTools} from '../types.js'
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {ZcfTools} ctx.zcfTools
 */
export const unbondAndTransfer = async (orch, { zcfTools }) => {
  trace('zcfTools within the membrane', zcfTools);
  // Osmosis is one of the few chains with icqEnabled
  const osmosis = await orch.getChain('osmosis');
  const osmoDenom = (await osmosis.getChainInfo()).stakingTokens[0].denom;

  // In a real world scenario, accounts would be reused across invokations of the handler.
  // See the staking-combinations contract for an example of how to reuse an account.
  const osmoAccount = await osmosis.makeAccount();

  /** @type {CosmosDelegationResponse[]} Cosmos */
  const delegations = await osmoAccount.getDelegations();
  trace('delegations', delegations);
  const osmoDelegations = delegations.filter(d => d.amount.denom === osmoDenom);

  // wait for the undelegations to be complete (may take weeks)
  await osmoAccount.undelegate(osmoDelegations);

  const stride = await orch.getChain('stride');
  const strideAccount = await stride.makeAccount();

  const balance = await osmoAccount.getBalance(osmoDenom);
  await osmoAccount.transfer(strideAccount.getAddress(), balance);
};
harden(unbondAndTransfer);
