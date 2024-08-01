/**
 * @file Example contract that allows users to do different things with rewards
 */
import { M, mustMatch } from '@endo/patterns';

/**
 * @import {OrchestrationAccount, OrchestrationFlow, Orchestrator, StakingAccountActions} from '@agoric/orchestration';
 * @import {MakeRestakeHolderKit} from './restake.kit.js';
 * @import {MakeCombineInvitationMakers} from '../exos/combine-invitation-makers.js';
 */

/**
 * Create an OrchestrationAccount for a specific chain and return a continuing
 * offer with invitations makers for Delegate, WithdrawRewards, Transfer, etc.
 *
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeRestakeHolderKit: MakeRestakeHolderKit;
 *   makeCombineInvitationMakers: MakeCombineInvitationMakers;
 * }} ctx
 * @param {ZCFSeat} seat
 * @param {{ chainName: string }} offerArgs
 */
export const makeRestakeAccount = async (
  orch,
  { makeRestakeHolderKit, makeCombineInvitationMakers },
  seat,
  { chainName },
) => {
  seat.exit(); // no funds exchanged
  mustMatch(chainName, M.string());
  const remoteChain = await orch.getChain(chainName);
  const orchAccount =
    /** @type {OrchestrationAccount<any> & StakingAccountActions} */ (
      await remoteChain.makeAccount()
    );
  const restakeHolderKit = makeRestakeHolderKit(orchAccount);
  const { invitationMakers: orchInvitationMakers, publicSubscribers } =
    await orchAccount.asContinuingOffer();

  const combinedInvitationMakers = makeCombineInvitationMakers(
    // `orchInvitationMakers` currently lying about its type
    orchInvitationMakers,
    // @ts-expect-error update `makeCombineInvitationMakers` to accept Guarded...
    restakeHolderKit.invitationMakers,
  );

  return harden({
    invitationMakers: combinedInvitationMakers,
    publicSubscribers,
  });
};
