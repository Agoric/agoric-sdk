import { M, mustMatch } from '@endo/patterns';
import { E } from '@endo/far';
import { VowShape } from '@agoric/vow';
import { makeTracer } from '@agoric/internal';
import { atob } from '@endo/base64';
import { ChainAddressShape } from '../typeGuards.js';
import { denomHash } from '../utils/denomHash.js';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import {
  MsgLiquidStake,
  MsgLiquidStakeResponse,
  MsgRedeemStake,
} from '../../cosmic-proto/dist/codegen/stride/stakeibc/tx.js';
import {
  decodeBech32,
  encodeBech32,
} from '@agoric/cosmic-proto/address-hooks.js';
import { tryDecodeResponse } from '../utils/cosmos.js';

const trace = makeTracer('StrideStakingTap');

/**
 * @import {IBCChannelID, VTransferIBCEvent} from '@agoric/vats';
 * @import {VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {TargetApp} from '@agoric/vats/src/bridge-target.js';
 * @import {ChainAddress, OrchestrationAccount} from '@agoric/orchestration';
 * @import {FungibleTokenPacketData} from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 * @import {TypedPattern} from '@agoric/internal';
 */

/**
 * @typedef {{
 *   hostToAgoricChannel: IBCChannelID;
 *   nativeDenom: string;
 *   ibcDenomOnAgoric: string;
 *   hostICAAccount: ERef<OrchestrationAccount<any>>;
 *   hostICAAccountAddress: ChainAddress;
 *   chainId: string;
 *   bech32Prefix: string;
 * }} SupportedHostChainShape
 */
const SupportedHostChainShape = {
  hostToAgoricChannel: M.string(),
  nativeDenom: M.string(),
  ibcDenomOnAgoric: M.string(),
  hostICAAccount: M.remotable('HostAccountICA'),
  hostICAAccountAddress: ChainAddressShape,
  chainId: M.string(),
  bech32Prefix: M.string(),
};
harden(SupportedHostChainShape);

/**
 * @typedef {{
 *   localAccount: ERef<OrchestrationAccount<{ chainId: 'agoric' }>>;
 *   localAccountAddress: ChainAddress;
 *   strideICAAccount: ERef<OrchestrationAccount<{ chainId: 'stride-1' }>>;
 *   strideICAAddress: ChainAddress;
 *   elysICAAccount: ERef<OrchestrationAccount<{ chainId: string }>>;
 *   elysICAAddress: ChainAddress;
 *   supportedHostChains: MapStore<string, SupportedHostChainShape>;
 *   elysToAgoricChannel: IBCChannelID;
 *   AgoricToElysChannel: IBCChannelID;
 *   stDenomOnElysTohostToAgoricChannelMap: MapStore<string, string>;
 *   elysChainId: string;
 * }} StakingTapState
 */
/** @type {TypedPattern<StakingTapState>} */
const StakingTapStateShape = {
  localAccount: M.remotable('LocalOrchestrationAccount'),
  localAccountAddress: ChainAddressShape,
  strideICAAccount: M.remotable('StrideICAAccount'),
  strideICAAddress: ChainAddressShape,
  elysICAAccount: M.remotable('ElysICAAccount'),
  elysICAAddress: ChainAddressShape,
  supportedHostChains: M.remotable('MapStore'),
  elysToAgoricChannel: M.string(),
  AgoricToElysChannel: M.string(),
  stDenomOnElysTohostToAgoricChannelMap: M.remotable(
    'stDenomOnElysToHostChannelMap',
  ),
  elysChainId: M.string(),
};
harden(StakingTapStateShape);

/**
 * @param {Zone} zone
 * @param {VowTools} vowTools
 */
const prepareStrideStakingTapKit = (zone, { watch }) => {
  return zone.exoClassKit(
    'StrideStakingTapKit',
    {
      // Taps ibc transfer and start the stake/unstake to/from stride
      tap: M.interface('StrideAutoStakeTap', {
        receiveUpcall: M.call(M.record()).returns(
          M.or(VowShape, M.undefined()),
        ),
      }),
      watchAndMoveFromHostToStride: M.interface(
        'WatchAndMoveFromHostToStride',
        {
          onFulfilled: M.call(
            M.bigint(),
            M.string(),
            M.string(),
            M.any(),
          ).returns(M.or(VowShape, M.undefined())),
        },
      ),
      watchAndLiquidStakeOnStride: M.interface('WatchAndLiquidStakeOnStride', {
        // move from host to stride
        onFulfilled: M.call(M.string(), M.string(), M.string()).returns(
          M.or(VowShape, M.undefined()),
        ),
      }),
      watchAndSendSTtokensToUsersElysAccount: M.interface(
        'WatchAndSendSTtokensToUsersElysAccount',
        {
          // move from host to stride
          onFulfilled: M.call(M.string()).returns(VowShape),
        },
      ),
      watchAndMoveFromElysToStride: M.interface(
        'WatchAndMoveFromElysToStride',
        {
          onFulfilled: M.call(M.bigint(), M.string(), M.string()).returns(
            M.or(VowShape, M.undefined()),
          ),
        },
      ),
      watchAndRedeemOnStride: M.interface('WatchAndRedeemOnStride', {
        // move from host to stride
        onFulfilled: M.call(
          M.string(),
          M.string(),
          M.string(),
          M.string(),
        ).returns(M.or(VowShape, M.undefined())),
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
         * @param {VTransferIBCEvent} event
         */
        receiveUpcall(event) {
          trace('receiveUpcall', event);

          // Receiving native from host chain
          
          if (
            !this.state.supportedHostChains.has(
              event.packet.source_channel,
            ) &&
            event.packet.source_channel !== this.state.elysToAgoricChannel
          ) {
            return;
          }

          const hostChainInfo = this.state.supportedHostChains.get(
            event.packet.source_channel,
          );

          const {
            localAccount,
            localAccountAddress,
            elysICAAddress,
            AgoricToElysChannel,
            stDenomOnElysTohostToAgoricChannelMap,
          } = this.state;

          const tx = /** @type {FungibleTokenPacketData} */ (
            JSON.parse(atob(event.packet.data))
          );
          trace('receiveUpcall packet data', tx);

          // ignore the outgoing transfers
          if (tx.receiver !== localAccountAddress.value) {
            return;
          }

          if (hostChainInfo !== undefined) {
            if (tx.denom !== hostChainInfo.nativeDenom) {
              return;
            }
            trace('LiquidStake: Moving funds to host-chain')
            return watch(
              E(localAccount).transfer(hostChainInfo.hostICAAccountAddress, {
                denom: hostChainInfo.ibcDenomOnAgoric,
                value: BigInt(tx.amount),
              }),
              this.facets.watchAndMoveFromHostToStride,
              BigInt(tx.amount),
              hostChainInfo.nativeDenom,  // tx.denom == hostChainInfo.nativeDenom
              tx.sender,
              hostChainInfo.hostICAAccount,
            );
          } else {
            // Retrieve Native token from stTokens on elys
            const hostToAgoricChannel =
              stDenomOnElysTohostToAgoricChannelMap.get(tx.denom);
            if (hostToAgoricChannel === undefined) {
              return;
            }
            const hostChainInfo =
              this.state.supportedHostChains.get(hostToAgoricChannel);
            if (hostChainInfo === undefined) {
              return;
            }

            const ibcDenomOnAgoricFromElys = `ibc/${denomHash({ denom: `st${tx.denom}`, channelId: AgoricToElysChannel })}`;

            trace('LiquidStakeRedeem: Moving funds to elys')
            // Transfer to elys ICA account
            return watch(
              E(localAccount).transfer(elysICAAddress, {
                denom: ibcDenomOnAgoricFromElys,
                value: BigInt(tx.amount),
              }),
              this.facets.watchAndMoveFromElysToStride,
              tx.amount,
              tx.denom,
              tx.sender,
              hostChainInfo.bech32Prefix,
              hostChainInfo.chainId,
            );
          }
        },
      },
      // Move from host to stride chainAddress
      watchAndMoveFromHostToStride: {
        /**
         * @param {void} _result
         * @param {bigint} amount
         * @param {string} denom
         * @param {string} senderAddress
         * @param {ERef<OrchestrationAccount<{ chainId: string }>>} fromRemoteAccount
         */
        onFulfilled(_result, amount, denom, senderAddress, fromRemoteAccount) {
          const { strideICAAddress } = this.state;
          trace('LiquidStake: Moving funds to stride from host')
          return watch(
            E(fromRemoteAccount).transfer(strideICAAddress, {
              denom,
              value: amount,
            }),
            this.facets.watchAndLiquidStakeOnStride,
            amount.toString(),
            denom,
            senderAddress,
          );
        },
      },
      // Move from elys to stride chainAddress
      watchAndMoveFromElysToStride: {
        /**
         * @param {void} _result
         * @param {string} amount
         * @param {string} denom
         * @param {string} senderAddress
         * @param {string} hostChainPrefix
         * @param {string} hostChainId
         */
        onFulfilled(
          _result,
          amount,
          denom,
          senderAddress,
          hostChainPrefix,
          hostChainId,
        ) {
          const { strideICAAddress, elysICAAccount } = this.state;
          trace('LiquidStakeRedeem: Moving funds to stride from elys')
          return watch(
            E(elysICAAccount).transfer(strideICAAddress, {
              denom,
              value: BigInt(amount),
            }),
            this.facets.watchAndRedeemOnStride,
            amount,
            senderAddress,
            hostChainPrefix,
            hostChainId,
          );
        },
      },
      // Move from elys to stride chainAddress
      watchAndRedeemOnStride: {
        /**
         * @param {void} _result
         * @param {string} amount
         * @param {string} senderAddress
         * @param {string} hostChainPrefix,
         * @param {string} hostChainId,
         */
        onFulfilled(
          _result,
          amount,
          senderAddress,
          hostChainPrefix,
          hostChainId,
        ) {
          const { strideICAAddress, strideICAAccount } = this.state;

          // TODO: verify address derivation
          const senderNativeAddress = deriveAddress(
            senderAddress,
            hostChainPrefix,
          );
          trace(`Derived Native address from elys address ${senderAddress} is ${senderNativeAddress}`)

          // UnStake Tokens and get stTokens on strideICA wallet
          const strideRedeemStakeMsg = Any.toJSON(
            MsgRedeemStake.toProtoMsg({
              creator: strideICAAddress.value,
              amount: amount,
              hostZone: hostChainId,
              receiver: senderNativeAddress,
            }),
          );

          trace('LiquidStakeRedeem: unstaking now')
          return watch(
            E(strideICAAccount).executeEncodedTx([strideRedeemStakeMsg]),
          );
        },
      },
      // Liquid Stake on stride chain
      watchAndLiquidStakeOnStride: {
        /**
         * @param {void} _result
         * @param {string} amount
         * @param {string} nativeDenom
         * @param {string} senderAddress
         */
        onFulfilled(_result, amount, nativeDenom, senderAddress) {
          const { strideICAAccount, strideICAAddress } = this.state;

          const strideLiquidStakeMsg = Any.toJSON(
            MsgLiquidStake.toProtoMsg({
              creator: strideICAAddress.value,
              amount: amount.toString(),
              hostDenom: nativeDenom,
            }),
          );

          trace('LiquidStake: Calling liquid stake')
          return watch(
            E(strideICAAccount).executeEncodedTx([strideLiquidStakeMsg]),
            this.facets.watchAndSendSTtokensToUsersElysAccount,
            senderAddress,
          );
        },
      },
      // Decode response and send the stTokens to user's account
      watchAndSendSTtokensToUsersElysAccount: {
        /**
         * @param {string} result
         * @param {string} senderAddress
         */
        onFulfilled(result, senderAddress) {
          const { strideICAAccount, elysChainId } = this.state;

          const strideLSDResponse = tryDecodeResponse(
            result,
            MsgLiquidStakeResponse.fromProtoMsg,
          );
          trace(
            'Stride staking response Mock(Proto Decoded) : ',
            strideLSDResponse,
          );

          // TODO: verify the address derivation
          const senderElysAddress = deriveAddress(senderAddress, 'elys');
          trace(`Derived Elys address from ${senderAddress} is ${senderElysAddress}`)

          /** @type {ChainAddress} */
          const senderChainAddress = {
            chainId: elysChainId,
            encoding: 'bech32',
            value: senderElysAddress.toString(),
          };

          trace('LiquidStake: Moving funds to elys from stride')
          // Move stTokens from stride ICA to user's elys address
          return watch(
            E(strideICAAccount).transfer(senderChainAddress, {
              denom: strideLSDResponse.stToken.denom,
              value: BigInt(strideLSDResponse.stToken.amount),
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
 * @param {Zone} zone
 * @param {VowTools} vowTools
 * @returns {(
 *   ...args: Parameters<ReturnType<typeof prepareStrideStakingTapKit>>
 * ) => ReturnType<ReturnType<typeof prepareStrideStakingTapKit>>['tap']}
 */
export const prepareStrideStakingTap = (zone, vowTools) => {
  const makeKit = prepareStrideStakingTapKit(zone, vowTools);
  return (...args) => makeKit(...args).tap;
};

/** @typedef {ReturnType<typeof prepareStrideStakingTap>} MakeStrideStakingTap */
/** @typedef {ReturnType<MakeStrideStakingTap>} StakingTap */

const deriveAddress = (sender, hrp) => {
  const { prefix, bytes } = decodeBech32(sender);
  const derivedAddress = encodeBech32(hrp, bytes);
  return harden(derivedAddress);
};

// Add retries in ibc Transfer
