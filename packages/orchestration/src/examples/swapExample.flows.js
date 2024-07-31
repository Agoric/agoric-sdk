import { orcUtils } from '../utils/orc.js';

/**
 * @import {LocalTransfer} from '../utils/zoe-tools.js';
 * @import {Orchestrator, CosmosValidatorAddress, OrchestrationFlow} from '../types.js'
 */
/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {LocalTransfer} ctx.localTransfer
 * @param {Brand} ctx.brandOut
 * @param {ZCFSeat} seat
 * @param {object} offerArgs
 * @param {Amount<'nat'>} offerArgs.staked
 * @param {CosmosValidatorAddress} offerArgs.validator
 */
export const swapAndStake = async (
  orch,
  { localTransfer, brandOut },
  seat,
  offerArgs,
) => {
  const { give } = seat.getProposal();

  const omni = await orch.getChain('omniflixhub');
  const agoric = await orch.getChain('agoric');

  const [omniAccount, localAccount] = await Promise.all([
    omni.makeAccount(),
    agoric.makeAccount(),
  ]);

  const omniAddress = omniAccount.getAddress();

  // deposit funds from user seat to LocalChainAccount
  await localTransfer(seat, localAccount, give);
  seat.exit();

  // build swap instructions with orcUtils library
  const transferMsg = await orcUtils.makeOsmosisSwap(
    {
      destChain: 'omniflixhub',
      destAddress: omniAddress,
      amountIn: give.Stable,
      brandOut,
      slippage: 0.03,
    },
    orch,
  );

  try {
    await localAccount.transferSteps(give.Stable, transferMsg);
    await omniAccount.delegate(offerArgs.validator, offerArgs.staked);
  } catch (e) {
    console.error(e);
  }
};
