/**
 * @file Example contract that allows users to do different things with rewards
 */
import { Far } from '@endo/far';
import { M, mustMatch } from '@endo/patterns';
import { Fail } from '@endo/errors';
import { ChainAddressShape } from '../typeGuards.js';
import { RepeaterOptsShape } from './restake.kit.js';

/**
 * @import {CosmosValidatorAddress, OrchestrationAccount, OrchestrationFlow, Orchestrator, StakingAccountActions} from '@agoric/orchestration';
 * @import {MakeRestakeHolderKit, MakeRestakeWaker, RepeaterOpts, RestakeParams} from './restake.kit.js';
 * @import {TimerRepeater, TimestampRecord, TimerService} from '@agoric/time';
 * @import {MakeCombineInvitationMakers} from '../exos/combine-invitation-makers.js';
 */

/**
 * Create an OrchestrationAccount for a specific chain and return a continuing
 * offer with invitations makers for Delegate, WithdrawRewards, Transfer, etc.
 *
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeRestakeHandler: ReturnType<typeof prepareRestakeHandler>;
 *   makeCombineInvitationMakers: MakeCombineInvitationMakers;
 * }} ctx
 * @param {ZCFSeat} seat
 * @param {{ chainName: string }} offerArgs
 */
export const makeAccountHandler = async (
  orch,
  { makeRestakeHandler, makeCombineInvitationMakers },
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
  // const restakeHolderKit = makeRestakeHolderKit(orchAccount);
  const { invitationMakers: orchInvitationMakers, publicSubscribers } =
    await orchAccount.asContinuingOffer();

  const restakeHandler = makeRestakeHandler(orchAccount);

  const combinedInvitationMakers = makeCombineInvitationMakers(
    // `orchInvitationMakers` currently lying about its type
    orchInvitationMakers,
    { Restake: restakeHandler },
  );

  return harden({
    // invitationMakers: combinedInvitationMakers,
    invitationMakers: orchInvitationMakers,
    publicSubscribers,
  });
};

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} _orch
 * @param {{
 *   makeRestakeWaker: MakeRestakeWaker;
 *   timerService: TimerService;
 *   opts: RestakeParams;
 * }} ctx
 * @param {OrchestrationAccount<any> & StakingAccountActions} orchAccount
 */
export const prepareRestakeHandler =
  (
    _orch,
    { makeRestakeWaker, timerService, opts: { minimumDelay, minimumInterval } },
    // XXX can we get orchAccount from context? stateRecord?
    orchAccount,
  ) =>
  /**
   * @param {ZCFSeat} seat
   * @param {{ validator: CosmosValidatorAddress; opts: RepeaterOpts }} offerArgs
   */
  async (seat, { validator, opts }) => {
    seat.exit(); // no funds exchanged
    mustMatch(validator, ChainAddressShape, 'invalid validator address');
    mustMatch(opts, RepeaterOptsShape, 'invalid repeater options');

    const { delay, interval } = opts;
    delay >= minimumDelay || Fail`delay must be at least ${minimumDelay}`;
    interval >= minimumInterval ||
      Fail`interval must be at least ${minimumInterval}`;

    // XXX detect if that has already been called - only one repeater at a time
    // if (this.state.restakeRepeater) {
    //   await E(this.state.restakeRepeater.disable());
    // }
    // XXX can we put the waker logic in an async-flow? And have something that turns this into TimerWaker exo
    const restakeWaker = makeRestakeWaker(orchAccount, validator);
    const repeater = await timerService.makeRepeater(delay, interval);
    return repeater.schedule(restakeWaker);
  };

/**
 * XXX we won't have a repeater until `Restake` is called
 *
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} _orch
 * @param {undefined} _ctx
 * @param {TimerRepeater} repeater
 * @returns {(seat: ZCFSeat) => Promise<void>}
 */
export const prepareCancelRestakeHandler =
  (_orch, _ctx, repeater) => async seat => {
    seat.exit(); // no funds exchanged
    // XXX how can we create a state record these all share?
    return repeater.disable();
  };

// /**
//  * XXX not currently used. Could we use a flow for a TimerWaker.waker?
//  *
//  * @satisfies {OrchestrationFlow}
//  * @param {Orchestrator} _orch
//  * @param {{
//  *   orchAccount: OrchestrationAccount<any> & StakingAccountActions;
//  *   validator: CosmosValidatorAddress;
//  * }} ctx
//  * @param {TimestampRecord} timestampRecord
//  */
// export const makeWakerHandler = async (
//   _orch,
//   { orchAccount, validator },
//   timestampRecord,
// ) => {
//   console.log('Wake Received', timestampRecord);
//   const amounts = await orchAccount.withdrawReward(validator);
//   if (amounts.length !== 1) {
//     throw Fail`Received ${amounts.length} amounts, only expected one.`;
//   }
//   if (!amounts[0].value) return;

//   return orchAccount.delegate(validator, amounts[0]);
// };
