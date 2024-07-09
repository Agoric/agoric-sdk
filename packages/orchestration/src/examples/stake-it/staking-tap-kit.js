import { M } from '@endo/patterns';
import { E } from '@endo/far';
import { VowShape } from '@agoric/vow';
import { Fail } from '@endo/errors';

/**
 * @import {IBCEvent} from '@agoric/vats';
 * @import {VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {TargetApp} from '@agoric/vats/src/bridge-target.js';
 * @import {CosmosValidatorAddress, Denom, OrchestrationAccount} from '@agoric/orchestration';
 */

/**
 * @typedef {{
 *   stakingAccount: OrchestrationAccount<any>;
 *   localAccount: OrchestrationAccount<{ chainId: 'agoric' }>;
 *   validator: CosmosValidatorAddress;
 *   remoteDenom: Denom;
 *   localDenom: Denom;
 * }} StakingTapState
 */

/**
 * @param {Zone} zone
 * @param {VowTools} vowTools
 */
const prepareMakeStakingTapKit = (zone, { watch }) => {
  return zone.exoClassKit(
    'StakingTap',
    {
      tap: M.interface('TransferStakeTap', {
        receiveUpcall: M.call(M.record()).returns(VowShape),
      }),
      transferWatcher: M.interface('TransferWatcher', {
        onFulfilled: M.call(M.undefined())
          .optional(M.bigint())
          .returns(VowShape),
      }),
    },
    /** @param {StakingTapState} state */
    state => /** @type {StakingTapState} */ (harden(state)),
    {
      tap: {
        /**
         * Transfers from localAccount to stakingAccount, then delegates from
         * the stakingAccount to `validator`.
         *
         * @param {IBCEvent<'receivePacket'>} event
         */
        receiveUpcall(event) {
          const { localAccount, stakingAccount, validator, localDenom } =
            this.state;
          localAccount || Fail`localAccount not found`;
          stakingAccount || Fail`stakingAccount not found`;
          validator.address || Fail`validatorAddr.address not found`;

          const stakingAccountAddress = stakingAccount.getAddress();
          const { packet } = event;
          console.debug('@@@packet', packet);
          console.debug('@@@event', event);
          // TODO get amount of transfer from packet
          // TODO only if denom = localDenom
          const value = 10n;
          return watch(
            E(localAccount).transfer(
              {
                denom: localDenom,
                value,
              },
              stakingAccountAddress,
            ),
            this.facets.transferWatcher,
            value,
          );
        },
      },
      transferWatcher: {
        /**
         * @param {void} _result
         * @param {bigint} value the qty of uatom to delegate
         */
        onFulfilled(_result, value) {
          const { stakingAccount, validator, remoteDenom } = this.state;
          return watch(
            // @ts-expect-error Property 'delegate' does not exist on type 'EMethods<Required<OrchestrationAccountI>>'
            E(stakingAccount).delegate(validator, {
              denom: remoteDenom,
              value,
            }),
          );
        },
      },
    },
  );
};

/** @typedef {ReturnType<typeof prepareMakeStakingTapKit>} MakeStakingTapKit */
/** @typedef {ReturnType<MakeStakingTapKit>} StakingTapKit */

/**
 * Provides a {@link TargetApp} that reacts to an incoming IBC transfer by:
 *
 * 1. transferring the funds to the staking account specified at initialization
 * 2. delegating the funds to the validator specified at initialization
 *
 * @example import { prepareMakeStakingTap } from './staking-tap-kit.js';
 *
 * const makeStakingTapKit = prepareMakeStakingTap(zone, vowTools); const tap =
 * makeStakingTapKit({ localAccount, localAccount, stakingAccount, validator,
 * remoteDenom, localDenom });
 *
 * await E(localAccount).monitorTransfers(tap);
 *
 * @param {Zone} zone
 * @param {VowTools} vowTools
 * @returns {(
 *   ...args: Parameters<ReturnType<typeof prepareMakeStakingTapKit>>
 * ) => StakingTapKit['tap']}
 */
export const prepareMakeStakingTap = (zone, vowTools) => {
  const makeKit = prepareMakeStakingTapKit(zone, vowTools);
  return (...args) => makeKit(...args).tap;
};
/** @typedef {ReturnType<typeof prepareMakeStakingTap>} MakeStakingTap */
/** @typedef {StakingTapKit['tap']} StakingTap */
