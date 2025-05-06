import { M, mustMatch } from '@endo/patterns';
import { E } from '@endo/far';
import { VowShape } from '@agoric/vow';
import { makeTracer } from '@agoric/internal';
import { atob } from '@endo/base64';
import { ChainAddressShape } from '../typeGuards.js';

const trace = makeTracer('AutoStakeItTap');

/**
 * @import {IBCChannelID, VTransferIBCEvent} from '@agoric/vats';
 * @import {VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {TargetApp} from '@agoric/vats/src/bridge-target.js';
 * @import {ChainAddress, CosmosValidatorAddress, Denom, OrchestrationAccount, StakingAccountActions} from '@agoric/orchestration';
 * @import {FungibleTokenPacketData} from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 * @import {TypedPattern} from '@agoric/internal';
 */

/**
 * @typedef {{
 *   stakingAccount: ERef<OrchestrationAccount<any> & StakingAccountActions>;
 *   localAccount: ERef<OrchestrationAccount<{ chainId: 'agoric' }>>;
 *   validator: CosmosValidatorAddress;
 *   localChainAddress: ChainAddress;
 *   remoteChainAddress: ChainAddress;
 *   sourceChannel: IBCChannelID;
 *   remoteDenom: Denom;
 *   localDenom: Denom;
 * }} StakingTapState
 */

/** @type {TypedPattern<StakingTapState>} */
const StakingTapStateShape = {
  stakingAccount: M.remotable('CosmosOrchestrationAccount'),
  localAccount: M.remotable('LocalOrchestrationAccount'),
  validator: ChainAddressShape,
  localChainAddress: ChainAddressShape,
  remoteChainAddress: ChainAddressShape,
  sourceChannel: M.string(),
  remoteDenom: M.string(),
  localDenom: M.string(),
};
harden(StakingTapStateShape);

/**
 * @param {Zone} zone
 * @param {VowTools} vowTools
 */
const prepareStakingTapKit = (zone, { watch }) => {
  return zone.exoClassKit(
    'StakingTapKit',
    {
      tap: M.interface('AutoStakeItTap', {
        receiveUpcall: M.call(M.record()).returns(
          M.or(VowShape, M.undefined()),
        ),
      }),
      transferWatcher: M.interface('TransferWatcher', {
        onFulfilled: M.call(M.undefined())
          .optional(M.bigint())
          .returns(VowShape),
      }),
    },
    /** @param {StakingTapState} initialState */
    initialState => {
      mustMatch(initialState, StakingTapStateShape);
      return harden(initialState);
    },
    {
      tap: {
        /**
         * Transfers from localAccount to stakingAccount, then delegates from
         * the stakingAccount to `validator` if the expected token (remoteDenom)
         * is received.
         *
         * @param {VTransferIBCEvent} event
         */
        receiveUpcall(event) {
          trace('receiveUpcall', event);

          // ignore packets from unknown channels
          if (event.packet.source_channel !== this.state.sourceChannel) {
            return;
          }

          const tx = /** @type {FungibleTokenPacketData} */ (
            JSON.parse(atob(event.packet.data))
          );
          trace('receiveUpcall packet data', tx);

          const { remoteDenom, localChainAddress } = this.state;
          // ignore outgoing transfers
          if (tx.receiver !== localChainAddress.value) {
            return;
          }
          // only interested in transfers of `remoteDenom`
          if (tx.denom !== remoteDenom) {
            return;
          }

          const { localAccount, localDenom, remoteChainAddress } = this.state;
          return watch(
            E(localAccount).transfer(remoteChainAddress, {
              denom: localDenom,
              value: BigInt(tx.amount),
            }),
            this.facets.transferWatcher,
            BigInt(tx.amount),
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

/**
 * Provides a {@link TargetApp} that reacts to an incoming IBC transfer by:
 *
 * 1. transferring the funds to the staking account specified at initialization
 * 2. delegating the funds to the validator specified at initialization
 *
 * XXX consider a facet with a method for changing the validator
 *
 * XXX consider logic for multiple stakingAccounts + denoms
 *
 * @param {Zone} zone
 * @param {VowTools} vowTools
 * @returns {(
 *   ...args: Parameters<ReturnType<typeof prepareStakingTapKit>>
 * ) => ReturnType<ReturnType<typeof prepareStakingTapKit>>['tap']}
 */
export const prepareStakingTap = (zone, vowTools) => {
  const makeKit = prepareStakingTapKit(zone, vowTools);
  return (...args) => makeKit(...args).tap;
};

/** @typedef {ReturnType<typeof prepareStakingTap>} MakeStakingTap */
/** @typedef {ReturnType<MakeStakingTap>} StakingTap */
