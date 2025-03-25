// @ts-check
import { M, mustMatch } from '@endo/patterns';
import { VowShape } from '@agoric/vow';
import { makeTracer } from '@agoric/internal';
import { atob } from '@endo/base64';
import { CosmosChainAddressShape } from '../typeGuards.js';

const trace = makeTracer('EvmTap');

/**
 * @import {IBCChannelID, VTransferIBCEvent} from '@agoric/vats';
 * @import {VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {TargetApp} from '@agoric/vats/src/bridge-target.js';
 * @import {CosmosChainAddress, Denom, OrchestrationAccount} from '@agoric/orchestration';
 * @import {FungibleTokenPacketData} from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 * @import {TypedPattern} from '@agoric/internal';
 */

/**
 * @typedef {{
 *   localAccount: ERef<OrchestrationAccount<{ chainId: 'agoric' }>>;
 *   localChainAddress: CosmosChainAddress;
 *   sourceChannel: IBCChannelID;
 *   remoteDenom: Denom;
 *   localDenom: Denom;
 * }} EvmTapState
 */

/** @type {TypedPattern<EvmTapState>} */
const EvmTapStateShape = {
  localAccount: M.remotable('LocalOrchestrationAccount'),
  localChainAddress: CosmosChainAddressShape,
  sourceChannel: M.string(),
  remoteDenom: M.string(),
  localDenom: M.string(),
};
harden(EvmTapStateShape);

/**
 * @param {Zone} zone
 * @param {VowTools} vowTools
 */
const prepareEvmTapKit = (zone, vowTools) => {
  console.log(vowTools);
  return zone.exoClassKit(
    'EvmTapKit',
    {
      tap: M.interface('EvmTap', {
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
    /** @param {EvmTapState} initialState */
    initialState => {
      mustMatch(initialState, EvmTapStateShape);
      return harden(initialState);
    },
    {
      tap: {
        /**
         * @param {VTransferIBCEvent} event
         */
        receiveUpcall(event) {
          trace('receiveUpcall', event);

          const tx = /** @type {FungibleTokenPacketData} */ (
            JSON.parse(atob(event.packet.data))
          );
          trace('receiveUpcall packet data', tx);

          trace('receiveUpcall completed');
        },
      },
      transferWatcher: {
        /**
         * @param {void} _result
         * @param {bigint} value the qty of uatom to delegate
         */
        onFulfilled(_result, value) {
          trace('onFulfilled _result:', JSON.stringify(_result));
          trace('onFulfilled value:', JSON.stringify(value));
          trace('onFulfilled state:', JSON.stringify(this.state));
        },
      },
    },
  );
};

/**
 * Provides a {@link TargetApp} that reacts to an incoming IBC transfer
 *
 * @param {Zone} zone
 * @param {VowTools} vowTools
 * @returns {(
 *   ...args: Parameters<ReturnType<typeof prepareEvmTapKit>>
 * ) => ReturnType<ReturnType<typeof prepareEvmTapKit>>['tap']}
 */
export const prepareEvmTap = (zone, vowTools) => {
  const makeKit = prepareEvmTapKit(zone, vowTools);
  return (...args) => makeKit(...args).tap;
};

/** @typedef {ReturnType<typeof prepareEvmTap>} MakeEvmTap */
/** @typedef {ReturnType<MakeEvmTap>} EvmTap */
