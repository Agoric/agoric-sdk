import { NonNullish } from '@agoric/internal';
import { Fail, q } from '@endo/errors';
import { M, mustMatch } from '@endo/patterns';

/**
 * @import {GuestInterface} from '@agoric/async-flow';
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
 * @param {{ localAccount?: OrchestrationAccountI & LocalAccountMethods }} ctx.contractState
 * @param {GuestInterface<ZoeTools>} ctx.zoeTools
 * @param {ZCFSeat} seat
 * @param {{ chainName: string; destAddr: string }} offerArgs
 */
export const sendIt = async (
  orch,
  { contractState, zoeTools: { localTransfer, withdrawToSeat } },
  seat,
  offerArgs,
) => {
  mustMatch(offerArgs, harden({ chainName: M.scalar(), destAddr: M.string() }));
  const { chainName, destAddr } = offerArgs;
  // NOTE the proposal shape ensures that the `give` is a single asset
  const { give } = seat.getProposal();
  const [[_kw, amt]] = entries(give);
  const agoric = await orch.getChain('agoric');
  const assets = await agoric.getVBankAssetInfo();
  const { denom } = NonNullish(
    assets.find(a => a.brand === amt.brand),
    `${amt.brand} not registered in vbank`,
  );
  const chain = await orch.getChain(chainName);

  if (!contractState.localAccount) {
    const agoricChain = await orch.getChain('agoric');
    contractState.localAccount = await agoricChain.makeAccount();
  }

  const info = await chain.getChainInfo();
  const { chainId } = info;
  assert(typeof chainId === 'string', 'bad chainId');

  await localTransfer(seat, contractState.localAccount, give);

  try {
    await contractState.localAccount.transfer(
      { denom, value: amt.value },
      {
        value: destAddr,
        encoding: 'bech32',
        chainId,
      },
    );
  } catch (e) {
    await withdrawToSeat(contractState.localAccount, seat, give);
    throw seat.fail(Fail`IBC Transfer failed ${q(e)}`);
  }

  seat.exit();
};
harden(sendIt);
