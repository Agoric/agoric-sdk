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
    const osmo = await orch.getChain('osmosis');
    const osmoAccount = await osmo.makeAccount();
    contractState.account = osmoAccount;
  }

  const osmoAccount = NonNullish(contractState.account);
  const delegations = await osmoAccount.getDelegations();

  // wait for the undelegations to be complete (may take weeks)
  await osmoAccount.undelegate(delegations);

  const stride = await orch.getChain('stride');
  const strideAccount = await stride.makeAccount();

  const denom = 'uosmo';
  const osmoAmt = await osmoAccount.getBalance(denom);
  await osmoAccount.transfer(osmoAmt, strideAccount.getAddress());
  await strideAccount.liquidStake(osmoAmt);
  console.log(osmoAccount, strideAccount);
};
