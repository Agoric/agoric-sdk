/**
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {Orchestrator, OrchestrationFlow, AmountArg, CosmosValidatorAddress, ChainAddress, LocalAccountMethods, OrchestrationAccountI} from '../types.js'
 * @import {ContinuingOfferResult, InvitationMakers} from '@agoric/smart-wallet/src/types.js';
 * @import {LocalOrchestrationAccountKit} from '../exos/local-orchestration-account.js';
 * @import {MakeCombineInvitationMakers} from '../exos/combine-invitation-makers.js';
 * @import {CosmosOrchestrationAccount} from '../exos/cosmos-orchestration-account.js';
 * @import {ResolvedContinuingOfferResult, ZoeTools} from '../utils/zoe-tools.js';
 */

import { mustMatch } from '@endo/patterns';
import { makeError, q } from '@endo/errors';
import { makeTracer } from '@agoric/internal';
import { ChainAddressShape } from '../typeGuards.js';

const trace = makeTracer('StakingCombinationsFlows');

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeCombineInvitationMakers: MakeCombineInvitationMakers;
 *   makeExtraInvitationMaker: (account: any) => InvitationMakers;
 * }} ctx
 * @param {ZCFSeat} _seat
 * @param {{ chainName: string }} offerArgs
 * @returns {Promise<ResolvedContinuingOfferResult>}
 */
export const makeAccount = async (orch, ctx, _seat, { chainName }) => {
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
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {Promise<GuestInterface<LocalOrchestrationAccountKit['holder']>>} ctx.sharedLocalAccountP
 * @param {GuestInterface<ZoeTools>} ctx.zoeTools
 * @param {GuestInterface<CosmosOrchestrationAccount>} account
 * @param {ZCFSeat} seat
 * @param {CosmosValidatorAddress} validator
 * @returns {Promise<void>}
 */
export const depositAndDelegate = async (
  orch,
  { sharedLocalAccountP, zoeTools },
  account,
  seat,
  validator,
) => {
  await null;
  trace('depositAndDelegate', account, seat, validator);
  mustMatch(validator, ChainAddressShape);

  const { give } = seat.getProposal();
  /**
   * @type {any} XXX methods returning vows
   *   https://github.com/Agoric/agoric-sdk/issues/9822
   */
  const sharedLocalAccount = await sharedLocalAccountP;
  await zoeTools.localTransfer(seat, sharedLocalAccount, give);

  const address = account.getAddress();
  try {
    await sharedLocalAccount.transfer(address, give.Stake);
  } catch (cause) {
    await zoeTools.withdrawToSeat(sharedLocalAccount, seat, give);
    const errMsg = makeError(`ibc transfer failed ${q(cause)}`);
    seat.exit(errMsg);
    throw errMsg;
  }
  seat.exit();
  await account.delegate(validator, give.Stake);
};
harden(depositAndDelegate);

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {GuestInterface<CosmosOrchestrationAccount>} account
 * @param {{
 *   delegations: { amount: AmountArg; validator: CosmosValidatorAddress }[];
 *   destination: ChainAddress;
 * }} offerArgs
 * @returns {Promise<void>}
 */
export const undelegateAndTransfer = async (
  orch,
  ctx,
  account,
  { delegations, destination },
) => {
  await account.undelegate(delegations);
  for (const { amount } of delegations) {
    await account.transfer(destination, amount);
  }
};
harden(undelegateAndTransfer);
