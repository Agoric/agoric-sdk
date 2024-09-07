/**
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {Orchestrator, OrchestrationFlow, AmountArg, CosmosValidatorAddress, ChainAddress, LocalAccountMethods, OrchestrationAccountI} from '../types.js'
 * @import {ContinuingOfferResult, InvitationMakers} from '@agoric/smart-wallet/src/types.js';
 * @import {MakeCombineInvitationMakers} from '../exos/combine-invitation-makers.js';
 * @import {CosmosOrchestrationAccount} from '../exos/cosmos-orchestration-account.js';
 * @import {ZoeTools} from '../utils/zoe-tools.js';
 */

import { mustMatch } from '@endo/patterns';
import { makeError } from '@endo/errors';
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
 * @param {{ localAccount?: OrchestrationAccountI & LocalAccountMethods }} ctx.contractState
 * @param {GuestInterface<ZoeTools>} ctx.zoeTools
 * @param {GuestInterface<CosmosOrchestrationAccount>} account
 * @param {ZCFSeat} seat
 * @param {CosmosValidatorAddress} validator
 * @returns {Promise<void>}
 */
export const depositAndDelegate = async (
  orch,
  { contractState, zoeTools },
  account,
  seat,
  validator,
) => {
  await null;
  trace('depositAndDelegate', account, seat, validator);
  mustMatch(validator, ChainAddressShape);
  if (!contractState.localAccount) {
    const agoricChain = await orch.getChain('agoric');
    contractState.localAccount = await agoricChain.makeAccount();
  }
  const { give } = seat.getProposal();
  await zoeTools.localTransfer(seat, contractState.localAccount, give);

  const address = account.getAddress();
  try {
    await contractState.localAccount.transfer(give.Stake, address);
  } catch (cause) {
    // TODO, put funds back on user seat and exit
    // https://github.com/Agoric/agoric-sdk/issues/9925
    throw makeError('ibc transfer failed', undefined, { cause });
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
    await account.transfer(amount, destination);
  }
};
harden(undelegateAndTransfer);
