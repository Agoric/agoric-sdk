/**
 * @file Example contract that allows users to do different things with rewards
 */
import { M, mustMatch } from '@endo/patterns';

/**
 * @import {OrchestrationAccount, OrchestrationFlow, Orchestrator, StakingAccountActions} from '@agoric/orchestration';
 * @import {MakeRestakeHolderKit} from './restake.kit.js';
 */

/**
 * Create an OrchestrationAccount for a specific chain and return a continuing
 * offer with invitations makers for Delegate, WithdrawRewards, Transfer, etc.
 *
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeRestakeHolderKit: MakeRestakeHolderKit;
 * }} ctx
 * @param {ZCFSeat} seat
 * @param {{ chainName: string }} offerArgs
 */
export const makeRestakeAccount = async (
  orch,
  { makeRestakeHolderKit },
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
  // const { invitationMakers, publicSubscribers } =
  //   await orchAccount.asContinuingOffer();

  return restakeHolderKit.holder.asContinuingOffer();
  // XXX Remotables must be explicitly declared
  // return harden({
  //   invitationMakers: harden({
  //     ...invitationMakers,
  //     ...restakeHolderKit.invitationMakers,
  //   }),
  //   publicSubscribers,
  // });
};
