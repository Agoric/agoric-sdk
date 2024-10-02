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
 * @import {AtomicProvider} from '@agoric/store/src/stores/store-utils.js';
 * @import {LocalOrchestrationAccountKit} from '../../src/exos/local-orchestration-account.js';
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
 * @param {Promise<GuestInterface<LocalOrchestrationAccountKit['holder']>>} ctx.sharedLocalAccountP
 * @param {GuestInterface<ZoeTools>} ctx.zoeTools
 * @param {ZCFSeat} seat
 * @param {{ destAddr: ChainAddress }} offerArgs
 */
export const depositSend = async (
  orch,
  { sharedLocalAccountP, zoeTools: { localTransfer, withdrawToSeat } },
  seat,
  offerArgs,
) => {
  mustMatch(offerArgs, harden({ destAddr: ChainAddressShape }));
  const { destAddr } = offerArgs;
  assert(destAddr.value.startsWith('agoric1'), 'must send to a local address');

  const { give } = seat.getProposal();

  /**
   * @type {any} XXX methods returning vows
   *   https://github.com/Agoric/agoric-sdk/issues/9822
   */
  const sharedLocalAccount = await sharedLocalAccountP;
  await localTransfer(seat, sharedLocalAccount, give);

  try {
    await sharedLocalAccount.sendAll(destAddr, values(give));
  } catch (error) {
    await withdrawToSeat(sharedLocalAccount, seat, give);
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
 * @param {Promise<GuestInterface<LocalOrchestrationAccountKit['holder']>>} ctx.sharedLocalAccountP
 * @param {GuestInterface<ZoeTools>} ctx.zoeTools
 * @param {ZCFSeat} seat
 */
export const deposit = async (
  orch,
  { sharedLocalAccountP, zoeTools: { localTransfer } },
  seat,
) => {
  const { give } = seat.getProposal();

  /**
   * @type {any} XXX methods returning vows
   *   https://github.com/Agoric/agoric-sdk/issues/9822
   */
  const sharedLocalAccount = await sharedLocalAccountP;
  try {
    await localTransfer(seat, sharedLocalAccount, give);
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
 * @param {Promise<GuestInterface<LocalOrchestrationAccountKit['holder']>>} ctx.sharedLocalAccountP
 * @param {GuestInterface<ZoeTools>} ctx.zoeTools
 * @param {ZCFSeat} seat
 */
export const withdraw = async (
  orch,
  { sharedLocalAccountP, zoeTools: { withdrawToSeat } },
  seat,
) => {
  const { want } = seat.getProposal();

  /**
   * @type {any} XXX methods returning vows
   *   https://github.com/Agoric/agoric-sdk/issues/9822
   */
  const sharedLocalAccount = await sharedLocalAccountP;

  try {
    await withdrawToSeat(sharedLocalAccount, seat, want);
  } catch (e) {
    seat.exit(e);
    throw e;
  }
  seat.exit();
};
harden(withdraw);
