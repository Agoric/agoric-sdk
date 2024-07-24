/**
 * @import {Orchestrator, OrchestrationFlow} from '../types.js'
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {ZCF} ctx.zcf
 * @param {ZCFSeat} _seat
 * @param {undefined} _offerArgs
 */
export const unbondAndLiquidStake = async (
  orch,
  { zcf },
  _seat,
  _offerArgs,
) => {
  console.log('zcf within the membrane', zcf);
  // We would actually alreaady have the account from the orchestrator
  // ??? could these be passed in? It would reduce the size of this handler,
  // keeping it focused on long-running operations.
  const omni = await orch.getChain('omniflixhub');
  const omniAccount = await omni.makeAccount();

  // TODO implement these
  // const delegations = await celestiaAccount.getDelegations();
  // // wait for the undelegations to be complete (may take weeks)
  // await celestiaAccount.undelegate(delegations);
  // ??? should this be synchronous? depends on how names are resolved.
  const stride = await orch.getChain('stride');
  const strideAccount = await stride.makeAccount();

  // TODO the `TIA` string actually needs to be the Brand from AgoricNames
  // const tiaAmt = await celestiaAccount.getBalance('TIA');
  // await celestiaAccount.transfer(tiaAmt, strideAccount.getAddress());
  // await strideAccount.liquidStake(tiaAmt);
  console.log(omniAccount, strideAccount);
};
