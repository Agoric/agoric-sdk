import { makeTracer } from '@agoric/internal';
import { MsgSend } from '@agoric/cosmic-proto/cosmos/bank/v1beta1/tx.js';
import { Fail } from '@endo/errors';
import { coerceCoin } from '../utils/amounts.js';

const trace = makeTracer('AuthzExampleFlows');

/**
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {InvitationMakers} from '@agoric/smart-wallet/src/types.js';
 * @import {Orchestrator, OrchestrationFlow, AmountArg, ChainAddress, ChainHub} from '@agoric/orchestration';
 * @import {MakeCombineInvitationMakers} from '../exos/combine-invitation-makers.js';
 * @import {CosmosOrchestrationAccount} from '../exos/cosmos-orchestration-account.js';
 * @import {ResolvedContinuingOfferResult} from '../utils/zoe-tools.js';
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeCombineInvitationMakers: MakeCombineInvitationMakers;
 *   makeExtraInvitationMaker: (account: any) => InvitationMakers;
 * }} ctx
 * @param {ZCFSeat} seat
 * @param {{ chainName: string }} offerArgs
 * @returns {Promise<ResolvedContinuingOfferResult>}
 */
export const makeAccount = async (orch, ctx, seat, { chainName }) => {
  seat.exit(); // no exchange of funds

  const chain = await orch.getChain(chainName);
  const account = await chain.makeAccount();

  const extraMakers = ctx.makeExtraInvitationMaker(account);

  const result = await account.asContinuingOffer();

  return {
    ...result,
    invitationMakers: ctx.makeCombineInvitationMakers(
      extraMakers,
      result.invitationMakers,
    ),
  };
};
harden(makeAccount);

/**
 * Performs a MsgSend (bank/send) via MsgExec assuming an authorization from the
 * `grantee` was posted via `MsgGrant`.
 *
 * Can we combined with a `timerService` waker to support scheduling in the
 * future, like after an unbonding request.
 *
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{ chainHub: GuestInterface<ChainHub> }} ctx
 * @param {GuestInterface<CosmosOrchestrationAccount>} account
 * @param {ZCFSeat} seat
 * @param {{
 *   amounts: AmountArg[];
 *   destination: ChainAddress;
 *   grantee: ChainAddress;
 * }} offerArgs
 * @returns {Promise<void>}
 */
export const execSend = async (
  orch,
  { chainHub },
  account,
  seat,
  { amounts, destination, grantee },
) => {
  await null;
  trace('execSend', amounts, destination, grantee);

  // todo, support MsgTransfer using chainHub.getTransferRoute()
  destination.chainId === grantee.chainId ||
    Fail`destination must be the same chain`;

  const msgs = [
    MsgSend.toProtoMsg({
      fromAddress: grantee.value,
      toAddress: destination.value,
      amount: amounts.map(a =>
        coerceCoin(
          // @ts-expect-error HostInterface vs GuestInterface
          chainHub,
          a,
        ),
      ),
    }),
  ];
  try {
    await account.exec(msgs, grantee);
    seat.exit();
  } catch (e) {
    console.error(e);
    seat.fail(e);
  }
};
harden(execSend);
