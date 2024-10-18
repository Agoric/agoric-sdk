import {
  EmptyProposalShape,
  InvitationShape,
} from '@agoric/zoe/src/typeGuards.js';
import { M } from '@endo/patterns';
import { E } from '@endo/far';
import { makeTracer } from '@agoric/internal';
import { TimestampRecordShape } from '@agoric/time';
import { Fail } from '@endo/errors';
import { withOrchestration } from '../utils/start-helper.js';
import * as flows from './restake.flows.js';
import { prepareCombineInvitationMakers } from '../exos/combine-invitation-makers.js';
import { CosmosOrchestrationInvitationMakersInterface } from '../exos/cosmos-orchestration-account.js';
import { ChainAddressShape } from '../typeGuards.js';

/**
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {TimerRepeater, TimestampRecord} from '@agoric/time';
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationPowers} from '../utils/start-helper.js';
 * @import {OrchestrationTools} from '../utils/start-helper.js';
 * @import {CosmosOrchestrationAccount} from '../exos/cosmos-orchestration-account.js';
 * @import {CosmosValidatorAddress} from '../types.js';
 */

const trace = makeTracer('RestakeContract');

/**
 * XXX consider moving to privateArgs / creatorFacet, as terms are immutable
 *
 * @typedef {{
 *   minimumDelay: bigint;
 *   minimumInterval: bigint;
 * }} RestakeContractTerms
 */

/**
 * TODO use RelativeTimeRecord
 *
 * @typedef {{
 *   delay: bigint;
 *   interval: bigint;
 * }} RepeaterOpts
 */

const RepeaterOptsShape = {
  delay: M.nat(),
  interval: M.nat(),
};
harden(RepeaterOptsShape);

/**
 * A contract that allows calls to make an OrchestrationAccount, and
 * subsequently schedule a restake (claim and stake rewards) on an interval.
 *
 * Leverages existing invitation makers like Delegate and combines them with
 * Restake and CancelRestake.
 *
 * @param {ZCF<RestakeContractTerms>} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 * }} _privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
const contract = async (zcf, { timerService }, zone, { orchestrateAll }) => {
  const RestakeInvitationMakersI = M.interface('RestakeInvitationMakers', {
    Restake: M.call(ChainAddressShape, RepeaterOptsShape).returns(M.promise()),
    CancelRestake: M.call().returns(M.promise()),
  });

  /**
   * A durable-ready exo that's returned to callers of `makeRestakeAccount`.
   * Each caller will have their own instance with isolated state.
   *
   * It serves three main purposes:
   *
   * - persist state for our custom invitationMakers
   * - provide invitationMakers and offer handlers for our restaking actions
   * - provide a TimerWaker handler for the repeater logic
   *
   * The invitationMaker offer handlers interface with `TimerService` using `E`
   * and remote calls. Since calls to `chainTimerService` are not cross-chain,
   * it's safe to write them using Promises.
   *
   * When we need to perform cross-chain actions, like in the `wake` handler, we
   * should use resumable code. Since our restake logic performs cross-chain
   * actions via `.withdrawReward()` and `delegate()`, `orchFns.wakerHandler()`
   * is written as an async-flow in {@link file://./restake.flows.js}
   */
  const makeRestakeKit = zone.exoClassKit(
    'RestakeExtraInvitationMaker',
    {
      invitationMakers: RestakeInvitationMakersI,
      waker: M.interface('Waker', {
        wake: M.call(TimestampRecordShape).returns(M.any()),
      }),
    },
    /**
     * @param {GuestInterface<CosmosOrchestrationAccount>} account
     */
    account =>
      /**
       * @type {{
       *   account: GuestInterface<CosmosOrchestrationAccount>;
       *   repeater: TimerRepeater | undefined;
       *   validator: CosmosValidatorAddress | undefined;
       * }}
       */ ({ account, repeater: undefined, validator: undefined }),
    {
      invitationMakers: {
        /**
         * @param {CosmosValidatorAddress} validator
         * @param {RepeaterOpts} opts
         * @returns {Promise<Invitation>}
         */
        Restake(validator, opts) {
          trace('Restake', validator);
          const { delay, interval } = opts;
          const { minimumDelay, minimumInterval } = zcf.getTerms();
          // TODO use AmounthMath
          delay >= minimumDelay || Fail`delay must be at least ${minimumDelay}`;
          interval >= minimumInterval ||
            Fail`interval must be at least ${minimumInterval}`;

          return zcf.makeInvitation(
            async () => {
              await null;
              this.state.validator = validator;
              if (this.state.repeater) {
                await E(this.state.repeater).disable();
                this.state.repeater = undefined;
              }
              const repeater = await E(timerService).makeRepeater(
                delay,
                interval,
              );
              this.state.repeater = repeater;
              await E(repeater).schedule(this.facets.waker);
            },
            'Restake',
            undefined,
            EmptyProposalShape,
          );
        },
        CancelRestake() {
          trace('Cancel Restake');
          return zcf.makeInvitation(
            async () => {
              const { repeater } = this.state;
              if (!repeater) throw Fail`No active repeater.`;
              await E(repeater).disable();
              this.state.repeater = undefined;
            },
            'Cancel Restake',
            undefined,
            EmptyProposalShape,
          );
        },
      },
      waker: {
        /** @param {TimestampRecord} timestampRecord */
        wake(timestampRecord) {
          trace('Waker Fired', timestampRecord);
          const { account, validator } = this.state;
          try {
            if (!account) throw Fail`No account`;
            if (!validator) throw Fail`No validator`;
            // eslint-disable-next-line no-use-before-define -- defined by orchestrateAll, necessarily after this
            orchFns.wakerHandler(account, validator, timestampRecord);
          } catch (e) {
            trace('Wake handler failed', e);
          }
        },
      },
    },
  );

  /** @type {any} XXX async membrane */
  const makeCombineInvitationMakers = prepareCombineInvitationMakers(
    zone,
    CosmosOrchestrationInvitationMakersInterface,
    RestakeInvitationMakersI,
  );

  const orchFns = orchestrateAll(flows, {
    makeCombineInvitationMakers,
    makeRestakeKit,
  });

  const publicFacet = zone.exo(
    'Restake Public Facet',
    M.interface('Restake PF', {
      makeRestakeAccountInvitation: M.callWhen().returns(InvitationShape),
    }),
    {
      makeRestakeAccountInvitation() {
        return zcf.makeInvitation(
          orchFns.makeRestakeAccount,
          'Make a Restake Account',
        );
      },
    },
  );

  return { publicFacet };
};

export const start = withOrchestration(contract);
harden(start);

/** @typedef {typeof start} RestakeSF */
