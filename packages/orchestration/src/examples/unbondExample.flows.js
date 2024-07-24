/**
 * @import {Orchestrator, OrchestrationFlow, OrchestrationAccountI, LocalAccountMethods, StakingAccountQueries} from '../types.js'
 */

import { NonNullish } from '@agoric/internal';

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {ZCF} ctx.zcf
 * @param {{ account?: OrchestrationAccountI & StakingAccountQueries }} ctx.contractState
 * @param {ZCFSeat} _seat
 * @param {undefined} _offerArgs
 */
export const unbondAndLiquidStake = async (
  orch,
  { zcf, contractState },
  _seat,
  _offerArgs,
) => {
  console.log('zcf within the membrane', zcf);

  await null;
  if (!contractState.account) {
    const omni = await orch.getChain('omniflixhub');
    const omniAccount = await omni.makeAccount();
    contractState.account = omniAccount;
  }

  const omniAccount = NonNullish(contractState.account);
  const delegations = await omniAccount.getDelegations();

  // wait for the undelegations to be complete (may take weeks)
  await omniAccount.undelegate(delegations);

  const stride = await orch.getChain('stride');
  const strideAccount = await stride.makeAccount();

  const denom = 'uflix';
  const flixAmt = await omniAccount.getBalance(denom);
  await omniAccount.transfer(flixAmt, strideAccount.getAddress());
  await strideAccount.liquidStake(flixAmt);
  console.log(omniAccount, strideAccount);
};
