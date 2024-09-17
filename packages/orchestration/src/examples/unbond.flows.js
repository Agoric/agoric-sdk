import { makeTracer } from '@agoric/internal';

const trace = makeTracer('UnbondAndTransfer');

/**
 * @import {Orchestrator, OrchestrationFlow, CosmosDelegationResponse} from '../types.js'
 * @import {DelegationResponse} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/staking.js';
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {ZCF} ctx.zcf
 */
export const unbondAndTransfer = async (orch, { zcf }) => {
  console.log('zcf within the membrane', zcf);
  // Osmosis is one of the few chains with icqEnabled
  const osmosis = await orch.getChain('osmosis');
  // In a real world scenario, accounts would be re-used across invokations of the handler
  const osmoAccount = await osmosis.makeAccount();

  /** @type {CosmosDelegationResponse[]} Cosmos */
  const delegations = await osmoAccount.getDelegations();
  trace('delegations', delegations);
  // wait for the undelegations to be complete (may take weeks)
  await osmoAccount.undelegate(delegations);

  // ??? should this be synchronous? depends on how names are resolved.
  const stride = await orch.getChain('stride');
  const strideAccount = await stride.makeAccount();

  // TODO the `TIA` string actually needs to be the Brand from AgoricNames
  // const tiaAmt = await celestiaAccount.getBalance('TIA');
  // await celestiaAccount.transfer(tiaAmt, strideAccount.getAddress());
  // TODO https://github.com/Agoric/agoric-sdk/issues/10017
  // await strideAccount.liquidStake(tiaAmt);
  console.log(osmoAccount, strideAccount);
};
harden(unbondAndTransfer);
