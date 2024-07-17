import { M, mustMatch } from '@endo/patterns';

/**
 * @import {GuestOf} from '@agoric/async-flow';
 * @import {VBankAssetDetail} from '@agoric/vats/tools/board-utils.js';
 * @import {ZoeTools} from '../utils/zoe-tools.js';
 * @import {Orchestrator, LocalAccountMethods, OrchestrationAccountI, OrchestrationFlow} from '../types.js';
 */

const { entries } = Object;

// in guest file (the orchestration functions)
// the second argument is all the endowments provided

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {{ account?: OrchestrationAccountI & LocalAccountMethods }} ctx.contractState
 * @param {GuestOf<ZoeTools['localTransfer']>} ctx.localTransfer
 * @param {(brand: Brand) => Promise<VBankAssetDetail>} ctx.findBrandInVBank
 * @param {ZCFSeat} seat
 * @param {{ chainName: string; destAddr: string }} offerArgs
 */
export async function sendIt(
  orch,
  { contractState, localTransfer, findBrandInVBank },
  seat,
  offerArgs,
) {
  mustMatch(offerArgs, harden({ chainName: M.scalar(), destAddr: M.string() }));
  const { chainName, destAddr } = offerArgs;
  // NOTE the proposal shape ensures that the `give` is a single asset
  const { give } = seat.getProposal();
  const [[_kw, amt]] = entries(give);
  const { denom } = await findBrandInVBank(amt.brand);
  const chain = await orch.getChain(chainName);

  if (!contractState.account) {
    const agoricChain = await orch.getChain('agoric');
    contractState.account = await agoricChain.makeAccount();
  }

  const info = await chain.getChainInfo();
  const { chainId } = info;
  assert(typeof chainId === 'string', 'bad chainId');

  await localTransfer(seat, contractState.account, give);

  await contractState.account.transfer(
    { denom, value: amt.value },
    {
      value: destAddr,
      encoding: 'bech32',
      chainId,
    },
  );
}
harden(sendIt);
