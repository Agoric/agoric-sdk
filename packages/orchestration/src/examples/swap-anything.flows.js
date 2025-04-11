/**
 * @import {GuestInterface, GuestOf} from '@agoric/async-flow';
 * @import {Invitation, ZCF, ZCFSeat} from '@agoric/zoe';
 * @import {Brand} from '@agoric/ertp';
 * @import {Vow} from '@agoric/vow';
 * @import {LocalOrchestrationAccountKit} from '../exos/local-orchestration-account.js';
 * @import {ZoeTools} from '../utils/zoe-tools.js';
 * @import {Orchestrator, OrchestrationFlow, LocalAccountMethods, ChainHub, ChainInfo} from '../types.js';
 * @import {AccountIdArg} from '../orchestration-api.ts';
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {GuestInterface<ChainHub>} ctx.chainHub
 * @param {Promise<GuestInterface<LocalOrchestrationAccountKit['holder']>>} ctx.sharedLocalAccountP
 * @param {Promise<
 *   GuestInterface<
 *     import('../exos/cosmos-orchestration-account.js').CosmosOrchestrationAccountKit['holder']
 *   >
 * >} ctx.nobleAccountP
 * @param {GuestInterface<ZoeTools>} ctx.zoeTools
 * @param {GuestOf<(msg: string) => Vow<void>>} ctx.log
 * @param {Brand} ctx.USDC
 * @param {ZCFSeat} seat
 * @param {{
 *   destAddr: AccountIdArg;
 *   destDenom: Denom;
 *   slippage: { slippageRatio: Ratio; windowSeconds: Nat };
 *   onFailedDelivery: string;
 *   nextMemo: string;
 * }} offerArgs
 */

// Given USDC, swap to desired token with slippage
// Ref: https://github.com/osmosis-labs/osmosis/tree/main/cosmwasm/contracts/crosschain-swaps#via-ibc
export const swapIt = async (
  orch,
  {
    chainHub,
    sharedLocalAccountP,
    log,
    nobleAccountP,
    USDC,
    zoeTools: { localTransfer, withdrawToSeat },
  },
  seat,
  offerArgs,
) => {};
harden(swapIt);
