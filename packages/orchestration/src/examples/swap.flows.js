import { orcUtils } from '../utils/orc.js';

/**
 * @import {LocalTransfer} from '../utils/zoe-tools.js';
 * @import {Orchestrator, CosmosValidatorAddress, OrchestrationFlow} from '../types.js'
 */

// XXX does not actually work. An early illustration that needs to be fixed.
/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {LocalTransfer} ctx.localTransfer
 * @param {ZCFSeat} seat
 * @param {object} offerArgs
 * @param {Amount<'nat'>} offerArgs.staked
 * @param {CosmosValidatorAddress} offerArgs.validator
 */
export const stakeAndSwap = async (
  orch,
  { localTransfer },
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
  const transferMsg = orcUtils.makeOsmosisSwap({
    destChain: 'omniflixhub',
    destAddress: omniAddress,
    amountIn: give.Stable,
    brandOut: /** @type {any} */ ('FIXME'),
    slippage: 0.03,
  });

  try {
    await localAccount.transferSteps(give.Stable, transferMsg);
    await omniAccount.delegate(offerArgs.validator, offerArgs.staked);
  } catch (e) {
    console.error(e);
  }
};
harden(stakeAndSwap);
