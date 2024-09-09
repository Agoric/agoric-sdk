/**
 * @file Example contract that allows users to do different things with rewards
 */
import { M, mustMatch } from '@endo/patterns';
import { Fail } from '@endo/errors';
import { makeTracer } from '@agoric/internal';

const trace = makeTracer('RestakeFlows');

/**
 * @import {CosmosValidatorAddress, OrchestrationAccount, OrchestrationFlow, Orchestrator, StakingAccountActions} from '@agoric/orchestration';
 * @import {TimestampRecord} from '@agoric/time';
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {ContinuingOfferResult, InvitationMakers} from '@agoric/smart-wallet/src/types.js';
 * @import {MakeCombineInvitationMakers} from '../exos/combine-invitation-makers.js';
 * @import {CosmosOrchestrationAccount} from '../exos/cosmos-orchestration-account.js';
 */

/**
 * Create an OrchestrationAccount for a specific chain and return a
 * {@link ContinuingOfferResult} that combines the invitationMakers from the orch
 * account (`Delegate`, `WithdrawRewards`, `Transfer`, etc.) with our custom
 * invitationMakers (`Restake`, `CancelRestake`) from `RestakeKit`.
 *
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeCombineInvitationMakers: MakeCombineInvitationMakers;
 *   makeRestakeKit: (
 *     account: OrchestrationAccount<any> & StakingAccountActions,
 *   ) => unknown;
 * }} ctx
 * @param {ZCFSeat} seat
 * @param {{ chainName: string }} offerArgs
 */
export const makeRestakeAccount = async (
  orch,
  { makeRestakeKit, makeCombineInvitationMakers },
  seat,
  { chainName },
) => {
  trace('MakeRestakeAccount', chainName);
  seat.exit();
  mustMatch(chainName, M.string());
  const remoteChain = await orch.getChain(chainName);
  const account =
    /** @type {OrchestrationAccount<any> & StakingAccountActions} */ (
      await remoteChain.makeAccount()
    );
  const restakeKit = /** @type {{ invitationMakers: InvitationMakers }} */ (
    makeRestakeKit(account)
  );
  const { publicSubscribers, invitationMakers } =
    await account.asContinuingOffer();

  return /** @type {ContinuingOfferResult} */ ({
    publicSubscribers,
    invitationMakers: makeCombineInvitationMakers(
      restakeKit.invitationMakers,
      invitationMakers,
    ),
  });
};
harden(makeRestakeAccount);

/**
 * A resumable async-flow that's provided to the `TimerWaker` waker handler in
 * `RestakeKit`. It withdraws rewards from a validator and delegates them.
 *
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} _orch
 * @param {object} _ctx
 * @param {GuestInterface<CosmosOrchestrationAccount>} account
 * @param {CosmosValidatorAddress} validator
 * @param {TimestampRecord} timestampRecord
 */
export const wakerHandler = async (
  _orch,
  _ctx,
  account,
  validator,
  timestampRecord,
) => {
  trace('Restake Waker Fired', timestampRecord);
  const amounts = await account.withdrawReward(validator);
  if (amounts.length !== 1) {
    throw Fail`Received ${amounts.length} amounts, only expected one.`;
  }
  if (!amounts[0].value) return;

  return account.delegate(validator, amounts[0]);
};
harden(wakerHandler);
