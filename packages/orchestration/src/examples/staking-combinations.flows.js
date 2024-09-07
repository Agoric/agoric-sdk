/**
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {Orchestrator, OrchestrationFlow, AmountArg, CosmosValidatorAddress, ChainAddress} from '../types.js'
 * @import {ContinuingOfferResult, InvitationMakers} from '@agoric/smart-wallet/src/types.js';
 * @import {MakeCombineInvitationMakers} from '../exos/combine-invitation-makers.js';
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
 * @param {Orchestrator} _orch
 * @param {object} _ctx
 * @param {GuestInterface<CosmosOrchestrationAccount>} account
 * @param {ZCFSeat} seat
 * @param {CosmosValidatorAddress} validator
 * @param {AmountArg} amount
 * @returns {Promise<string>}
 */
export const depositAndDelegate = async (
  _orch,
  _ctx,
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
 * @param {Orchestrator} _orch
 * @param {object} _ctx
 * @param {GuestInterface<CosmosOrchestrationAccount>} account
 * @param {{
 *   delegations: { amount: AmountArg; validator: CosmosValidatorAddress }[];
 *   destination: ChainAddress;
 * }} offerArgs
 * @returns {Promise<string>}
 */
export const undelegateAndTransfer = async (
  _orch,
  _ctx,
  account,
  { delegations, destination },
) => {
  await account.undelegate(delegations);
  for (const { amount } of delegations) {
    await account.transfer(amount, destination);
  }
  return 'guest undelegateAndTransfer complete';
};
harden(undelegateAndTransfer);
