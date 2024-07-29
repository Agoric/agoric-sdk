import { M, mustMatch } from '@endo/patterns';
import { E } from '@endo/far';
import { Fail } from '@endo/errors';
import { TimestampRecordShape } from '@agoric/time';
import { VowShape } from '@agoric/vow';
import { makeTracer } from '@agoric/internal';
import { EmptyProposalShape } from '@agoric/zoe/src/typeGuards.js';
import { ChainAddressShape, DenomAmountShape } from '../typeGuards.js';

const trace = makeTracer('RestakeKit');

/**
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {CosmosValidatorAddress, DenomAmount, OrchestrationAccount, StakingAccountActions} from '@agoric/orchestration';
 * @import {Remote} from '@agoric/internal';
 * @import {TimestampRecord, TimerService, TimerRepeater} from '@agoric/time';
 */

/**
 * @typedef {{
 *   orchAccount: OrchestrationAccount<any> & StakingAccountActions;
 *   validator: CosmosValidatorAddress;
 * }} RestakeWakerState
 */

/**
 * @param {Zone} zone
 * @param {VowTools} vowTools
 */
const prepareRestakeWakerKit = (zone, { watch }) => {
  return zone.exoClassKit(
    'RestakeWakerKit',
    {
      waker: M.interface('RestakeWaker', {
        wake: M.call(TimestampRecordShape).returns(M.any()),
      }),
      withdrawRewardsHandler: M.interface('WithdrawRewardsHandle', {
        onFulfilled: M.call(M.arrayOf(DenomAmountShape))
          .optional(M.arrayOf(M.undefined()))
          .returns(VowShape),
      }),
    },
    /**
     * @param {OrchestrationAccount<any> & StakingAccountActions} orchAccount
     * @param {CosmosValidatorAddress} validator
     * @returns {RestakeWakerState}
     */
    (orchAccount, validator) => harden({ orchAccount, validator }),
    {
      waker: {
        /** @param {TimestampRecord} timestampRecord */
        wake(timestampRecord) {
          trace('Wake Received', timestampRecord);
          const { orchAccount, validator } = this.state;
          return watch(
            E(orchAccount).withdrawReward(validator),
            this.facets.withdrawRewardsHandler,
          );
        },
      },
      withdrawRewardsHandler: {
        /** @param {DenomAmount[]} amounts */
        onFulfilled(amounts) {
          trace('Withdrew Rewards', amounts);
          if (amounts.length !== 1) {
            // XXX post to vstorage, else this effectively dropped on the ground
            throw Fail`Received ${amounts.length} amounts, only expected one.`;
          }
          if (!amounts[0].value) return;
          const { orchAccount, validator } = this.state;
          return watch(E(orchAccount).delegate(validator, amounts[0]));
        },
      },
    },
    {
      stateShape: {
        orchAccount: M.remotable('OrchestrationAccount'),
        validator: ChainAddressShape,
      },
    },
  );
};

/**
 * @param {Zone} zone
 * @param {VowTools} vowTools
 * @returns {(
 *   ...args: Parameters<ReturnType<typeof prepareRestakeWakerKit>>
 * ) => ReturnType<ReturnType<typeof prepareRestakeWakerKit>>['waker']}
 */
export const prepareRestakeWaker = (zone, vowTools) => {
  const makeKit = prepareRestakeWakerKit(zone, vowTools);
  return (...args) => makeKit(...args).waker;
};

/** @typedef {ReturnType<typeof prepareRestakeWaker>} MakeRestakeWaker */

/**
 * @typedef {{
 *   orchAccount: OrchestrationAccount<any> & StakingAccountActions;
 *   restakeRepeater: TimerRepeater | undefined;
 * }} RestakeHolderState
 */

const RepeaterStateShape = {
  orchAccount: M.remotable('OrchestrationAccount'),
  restakeRepeater: M.or(M.remotable('TimerRepeater'), M.undefined()),
};

/**
 * @typedef {{
 *   delay: bigint;
 *   interval: bigint;
 * }} RepeaterOpts
 */

export const RepeaterOptsShape = {
  delay: M.nat(),
  interval: M.nat(),
};

/**
 * @typedef {{
 *   minimumDelay: bigint;
 *   minimumInterval: bigint;
 * }} RestakeParams
 */

export const restakeInvitaitonGuardShape = {
  Restake: M.call(ChainAddressShape, RepeaterOptsShape).returns(M.promise()),
  CancelRestake: M.call().returns(M.promise()),
};

/**
 * XXX no longer used
 *
 * @param {Zone} zone
 * @param {object} opts
 * @param {VowTools} opts.vowTools
 * @param {ZCF} opts.zcf
 * @param {Remote<TimerService>} opts.timer
 * @param {ReturnType<typeof prepareRestakeWaker>} opts.makeRestakeWaker
 * @param {RestakeParams} opts.params
 */
export const prepareRestakeHolderKit = (
  zone,
  {
    vowTools: { watch, asVow },
    zcf,
    timer,
    makeRestakeWaker,
    params: { minimumDelay, minimumInterval },
  },
) => {
  return zone.exoClassKit(
    'RestakeHolderKit',
    {
      invitationMakers: M.interface('InvitationMakers', {
        ...restakeInvitaitonGuardShape,
      }),
      holder: M.interface('Holder', {
        restake: M.call(ChainAddressShape, RepeaterOptsShape).returns(VowShape),
        cancelRestake: M.call().returns(VowShape),
      }),
    },
    /**
     * @param {OrchestrationAccount<any> & StakingAccountActions} orchAccount
     */
    orchAccount => {
      return /** @type {RestakeHolderState} */ (
        harden({
          orchAccount,
          restakeRepeater: undefined,
        })
      );
    },
    {
      invitationMakers: {
        /**
         * @param {CosmosValidatorAddress} validator
         * @param {RepeaterOpts} opts
         * @returns {Promise<Invitation>}
         */
        Restake(validator, opts) {
          trace('Restake', validator, opts);
          return zcf.makeInvitation(
            seat => {
              seat.exit();
              return watch(this.facets.holder.restake(validator, opts));
            },
            'Restake',
            undefined,
            EmptyProposalShape,
          );
        },
        CancelRestake() {
          trace('Cancel Restake');
          return zcf.makeInvitation(
            seat => {
              seat.exit();
              return watch(this.facets.holder.cancelRestake());
            },
            'Cancel Restake',
            undefined,
            EmptyProposalShape,
          );
        },
      },
      holder: {
        /**
         * @param {CosmosValidatorAddress} validator
         * @param {RepeaterOpts} opts
         * @returns {Vow<TimestampRecord>}
         */
        restake(validator, opts) {
          trace('restake', validator, opts);
          return asVow(() => {
            mustMatch(
              validator,
              ChainAddressShape,
              'invalid validator address',
            );
            mustMatch(opts, RepeaterOptsShape, 'invalid repeater options');
            const { delay, interval } = opts;
            delay >= minimumDelay ||
              Fail`delay must be at least ${minimumDelay}`;
            interval >= minimumInterval ||
              Fail`interval must be at least ${minimumInterval}`;
            if (this.state.restakeRepeater) {
              // TODO block on this
              E(this.state.restakeRepeater.disable());
            }
            const restakeWaker = makeRestakeWaker(
              this.state.orchAccount,
              validator,
            );
            console.debug('restakeWaker', restakeWaker);
            return watch(
              E.when(E(timer).makeRepeater(delay, interval), repeater => {
                this.state.restakeRepeater = repeater;
                console.debug('new repeater', repeater);
                return E(repeater).schedule(restakeWaker);
                // XXX on success, post to vstorage
                // XXX orch-acct needs to expose its recorder kit writer
              }),
            );
          });
        },
        cancelRestake() {
          if (!this.state.restakeRepeater) {
            throw Fail`Restake not active.`;
          }
          return watch(E(this.state.restakeRepeater).disable());
        },
      },
    },
    {
      stateShape: RepeaterStateShape,
    },
  );
};

/** @typedef {ReturnType<typeof prepareRestakeHolderKit>} MakeRestakeHolderKit */
/** @typedef {ReturnType<MakeRestakeHolderKit>} RestakeHolderKit */
