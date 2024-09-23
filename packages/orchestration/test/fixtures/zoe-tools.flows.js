/**
 * @file Testing fixture that takes shortcuts to ensure we hit error paths
 *   around `zoeTools.localTransfer` and `zoeTools.withdrawToSeat`.
 */

import { makeError, q } from '@endo/errors';
import { mustMatch } from '@endo/patterns';
import { ChainAddressShape } from '../../src/typeGuards.js';

const { values } = Object;

/**
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {Orchestrator, LocalAccountMethods, OrchestrationAccountI, OrchestrationFlow, ChainAddress} from '@agoric/orchestration';
 * @import {ZoeTools} from '../../src/utils/zoe-tools.js';
 */

/**
 * Accept one or more deposits and send them to an account on the local chain
 * using MsgSend. Intentionally skips a check to ensure an asset is in vbank to
 * facilitate failure path testing of ZoeTools.
 *
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {{ localAccount?: OrchestrationAccountI & LocalAccountMethods }} ctx.contractState
 * @param {GuestInterface<ZoeTools>} ctx.zoeTools
 * @param {ZCFSeat} seat
 * @param {{ destAddr: ChainAddress }} offerArgs
 */
export const depositSend = async (
  orch,
  { contractState, zoeTools: { localTransfer, withdrawToSeat } },
  seat,
  offerArgs,
) => {
  mustMatch(offerArgs, harden({ destAddr: ChainAddressShape }));
  const { destAddr } = offerArgs;
  assert(destAddr.value.startsWith('agoric1'), 'must send to a local address');

  const { give } = seat.getProposal();

  await null;
  if (!contractState.localAccount) {
    const agoricChain = await orch.getChain('agoric');
    contractState.localAccount = await agoricChain.makeAccount();
  }

  await localTransfer(seat, contractState.localAccount, give);

  try {
    await contractState.localAccount.sendAll(destAddr, values(give));
  } catch (error) {
    await withdrawToSeat(contractState.localAccount, seat, give);
    const errMsg = makeError(`SendAll failed ${q(error)}`);
    seat.exit(errMsg);
    throw errMsg;
  }
  seat.exit();
};
harden(depositSend);

/**
 * Accept one or more deposits and transfer them to the contract's local
 * account.
 *
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {{ localAccount?: OrchestrationAccountI & LocalAccountMethods }} ctx.contractState
 * @param {GuestInterface<ZoeTools>} ctx.zoeTools
 * @param {ZCFSeat} seat
 */
export const deposit = async (
  orch,
  { contractState, zoeTools: { localTransfer } },
  seat,
) => {
  const { give } = seat.getProposal();

  await null;
  if (!contractState.localAccount) {
    const agoricChain = await orch.getChain('agoric');
    contractState.localAccount = await agoricChain.makeAccount();
  }

  try {
    await localTransfer(seat, contractState.localAccount, give);
  } catch (e) {
    seat.exit(e);
    throw e;
  }
  seat.exit();
};
harden(deposit);

/**
 * Withdraw funds from the contract's local account to the offer's seat.
 *
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {{ localAccount?: OrchestrationAccountI & LocalAccountMethods }} ctx.contractState
 * @param {GuestInterface<ZoeTools>} ctx.zoeTools
 * @param {ZCFSeat} seat
 */
export const withdraw = async (
  orch,
  { contractState, zoeTools: { withdrawToSeat } },
  seat,
) => {
  const { want } = seat.getProposal();

  await null;
  if (!contractState.localAccount) {
    const agoricChain = await orch.getChain('agoric');
    contractState.localAccount = await agoricChain.makeAccount();
  }

  try {
    await withdrawToSeat(contractState.localAccount, seat, want);
  } catch (e) {
    seat.exit(e);
    throw e;
  }
  seat.exit();
};
harden(withdraw);
