/**
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {Orchestrator, OrchestrationFlow, OrchestrationAccount, OrchestrationAccountI, StakingAccountActions, AmountArg, CosmosValidatorAddress} from '../types.js'
 * @import {ContinuingOfferResult, InvitationMakers} from '@agoric/smart-wallet/src/types.js';
 * @import {MakeCombineInvitationMakers} from '../exos/combine-invitation-makers.js';
 * @import {Delegation} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/staking.js';
 * @import {CosmosOrchestrationAccount} from '../exos/cosmos-orchestration-account.js';
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeCombineInvitationMakers: MakeCombineInvitationMakers;
 *   makeExtraInvitationMaker: (account: any) => InvitationMakers;
 * }} ctx
 * @param {ZCFSeat} _seat
 * @param {{ chainName: string }} offerArgs
 * @returns {Promise<ContinuingOfferResult>}
 */
export const makeAccount = async (orch, ctx, _seat, { chainName }) => {
  const chain = await orch.getChain(chainName);
  const account = await chain.makeAccount();

  const extraMakers = ctx.makeExtraInvitationMaker(account);

  /** @type {ContinuingOfferResult} */
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
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {GuestInterface<CosmosOrchestrationAccount>} account
 * @param {ZCFSeat} seat
 * @param {CosmosValidatorAddress} validator
 * @param {AmountArg} amount
 * @returns {Promise<string>}
 */
export const depositAndDelegate = async (
  orch,
  ctx,
  account,
  seat,
  validator,
  amount,
) => {
  console.log('depositAndDelegate', account, seat, validator, amount);
  // TODO deposit the amount
  await account.delegate(validator, amount);
  return 'guest depositAndDelegate complete';
};
harden(depositAndDelegate);

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {GuestInterface<CosmosOrchestrationAccount>} account
 * @param {Omit<Delegation, 'delegatorAddress'>[]} delegations
 * @returns {Promise<string>}
 */
export const undelegateAndTransfer = async (
  orch,
  ctx,
  account,
  delegations,
) => {
  await account.undelegate(delegations);
  // TODO transfer something
  return 'guest undelegateAndTransfer complete';
};
harden(undelegateAndTransfer);