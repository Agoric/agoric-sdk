/**
 * @file Example contract that allows users to do different things with rewards
 */
import { M, mustMatch } from '@endo/patterns';
import { Fail } from '@endo/errors';
import { ChainAddressShape } from '../typeGuards.js';
import { RepeaterOptsShape } from './restake.kit.js';

/**
 * @import {CosmosValidatorAddress, OrchestrationAccount, OrchestrationFlow, Orchestrator, StakingAccountActions} from '@agoric/orchestration';
 * @import {MakeRestakeHolderKit, MakeRestakeWaker, RestakeParams, RepeaterOpts} from './restake.kit.js';
 * @import {MakeCombineInvitationMakers} from '../exos/combine-invitation-makers.js';
 * @import {TimerRepeater, TimestampRecord, TimerService} from '@agoric/time';
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

/**
 * Placeholder for an (per continuing) Exo that's part of ctx.
 *
 * Since some values are not available during initialization, we need some sort
 * of pattern for setting and getting state.
 *
 * XXX consider a more simple `getState/setState`
 *
 * XXX for this exo, need a mechanism to invoke asyncFlows for Restake and
 * CancelRestake
 *
 * @typedef {{
 *   getAccount: () => Promise<
 *     OrchestrationAccount<any> & StakingAccountActions
 *   >;
 *   setAccount: (
 *     account: OrchestrationAccount<any> & StakingAccountActions,
 *   ) => Promise<void>;
 *   getRepeater: () => Promise<TimerRepeater>;
 *   setRepeater: (repeater: TimerRepeater) => Promise<void>;
 *   getValidator: () => Promise<CosmosValidatorAddress>;
 *   setValidator: (validator: CosmosValidatorAddress) => Promise<void>;
 * }} PersistentState
 */

/**
 * NOT CURRENTLY USED
 *
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} _orch
 * @param {{
 *   makeRestakeWaker: MakeRestakeWaker;
 *   timerService: TimerService;
 *   opts: RestakeParams;
 *   state: PersistentState;
 * }} ctx
 * @param {ZCFSeat} seat
 * @param {{ validator: CosmosValidatorAddress; opts: RepeaterOpts }} offerArgs
 */
export const makeRestakeHandler = async (
  _orch,
  {
    state,
    makeRestakeWaker,
    timerService,
    opts: { minimumDelay, minimumInterval },
  },
  seat,
  { validator, opts },
) => {
  seat.exit(); // no funds exchanged
  mustMatch(validator, ChainAddressShape, 'invalid validator address');
  mustMatch(opts, RepeaterOptsShape, 'invalid repeater options');

  const { delay, interval } = opts;
  delay >= minimumDelay || Fail`delay must be at least ${minimumDelay}`;
  interval >= minimumInterval ||
    Fail`interval must be at least ${minimumInterval}`;

  // XXX make stateKit real
  const activeRepeater = await state.getRepeater();

  // only one repeater at a time
  // XXX consider logic to allow one per validator
  if (activeRepeater) {
    await activeRepeater.disable();
  }
  // XXX make stateKit real
  const orchAccount = await state.getAccount();
  // XXX can we put the waker logic in an async-flow? And have something that turns this into TimerWaker exo
  const restakeWaker = makeRestakeWaker(orchAccount, validator);
  const repeater = await timerService.makeRepeater(delay, interval);
  await repeater.schedule(restakeWaker);
  return state.setRepeater(repeater);
};

/**
 * NOT CURRENTLY USED
 *
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} _orch
 * @param {{ state: PersistentState }} ctx
 * @param {ZCFSeat} seat
 */
export const makeCancelRestakeHandler = async (_orch, { state }, seat) => {
  seat.exit(); // no funds exchanged
  // XXX make stateKit real
  const repeater = await state.getRepeater();
  repeater || Fail`No active restake to cancel.`;
  return repeater.disable();
};

/**
 * NOT CURRENTLY USED
 *
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} _orch
 * @param {{ state: PersistentState }} ctx
 * @param {TimestampRecord} timestampRecord
 */
export const makeWakerHandler = async (_orch, { state }, timestampRecord) => {
  console.log('Wake Received', timestampRecord);
  const orchAccount = await state.getAccount();
  const validator = await state.getValidator();

  const amounts = await orchAccount.withdrawReward(validator);
  if (amounts.length !== 1) {
    throw Fail`Received ${amounts.length} amounts, only expected one.`;
  }
  if (!amounts[0].value) return;

  return orchAccount.delegate(validator, amounts[0]);
};
