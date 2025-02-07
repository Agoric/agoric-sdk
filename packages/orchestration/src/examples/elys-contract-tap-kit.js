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
import { decodeBase64 } from '@endo/base64';
import {
  decodeBech32,
  encodeBech32,
} from '@agoric/cosmic-proto/address-hooks.js';

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
  stDenomOnElysTohostToAgoricChannelMap: M.remotable('stDenomOnElysToHostChannelMap'),
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
      // Taps ibc transfer and stake/unstake to/from stride
      tap: M.interface('StrideAutoStakeTap', {
        receiveUpcall: M.call(M.record()).returns(
          M.or(VowShape, M.undefined()),
        ),
      }),
      // Move stTokens to user's elys account from elysICA (Or do more with it in future)
      stTokensReceiveWatcher: M.interface('stTokensReceiveWatcher', {
        onFulfilled: M.call(M.bigint(), M.string(), ChainAddressShape).returns(
          VowShape,
        ),
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
        async receiveUpcall(event) {
          trace('receiveUpcall', event);

          // Receiving native from host chain
          const hostChainInfo = this.state.supportedHostChains.get(
            event.packet.source_channel,
          );
          if (
            hostChainInfo === undefined &&
            event.packet.source_channel !== this.state.elysToAgoricChannel
          ) {
            return;
          }

          const {
            localAccount,
            localAccountAddress,
            strideICAAccount,
            strideICAAddress,
            elysICAAccount,
            elysICAAddress,
            AgoricToElysChannel,
            stDenomOnElysTohostToAgoricChannelMap,
            elysChainId,
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
            // const channelFromHopToDest = hostChainInfo.hostToStrideChannel;
            await E(localAccount).transfer(
              hostChainInfo.hostICAAccountAddress,
              {
                denom: hostChainInfo.ibcDenomOnAgoric,
                value: BigInt(tx.amount),
              },
            );

            // Move fund to stride ICA account
            await E(hostChainInfo.hostICAAccount).transfer(strideICAAddress, {
              denom: hostChainInfo.nativeDenom,
              value: BigInt(tx.amount),
            });

            // Stake Tokens and get stTokens on strideICA wallet
            const strideLiquidStakeMsg = Any.toJSON(
              MsgLiquidStake.toProtoMsg({
                creator: strideICAAddress.value,
                amount: tx.amount.toString(),
                hostDenom: hostChainInfo.nativeDenom,
              }),
            );
            const resp = await E(strideICAAccount).executeEncodedTx([
              strideLiquidStakeMsg,
            ]);
            const strideLSDResponse = MsgLiquidStakeResponse.decode(
              decodeBase64(resp),
            );

            // TODO: verify the address derivation
            const senderElysAddress = deriveAddress(tx.sender, 'elys');
            const senderChainAddress = {
              chainId: elysChainId,
              encoding: 'bech32',
              value: senderElysAddress.toString(),
            };

            // Move stTokens from stride ICA to elys ICA
            return watch(
              E(strideICAAccount).transfer(elysICAAddress, {
                denom: strideLSDResponse.stToken.denom,
                value: BigInt(strideLSDResponse.stToken.amount),
              }),
              this.facets.stTokensReceiveWatcher,
              BigInt(strideLSDResponse.stToken.amount),
              strideLSDResponse.stToken.denom,
              senderChainAddress,
            );

            // Retrieve Native token from stTokens on elys
          } else {

            const hostToAgoricChannel =
              stDenomOnElysTohostToAgoricChannelMap.get(tx.denom);
            if (hostToAgoricChannel === undefined) {
              return;
            }
            const hostChainInfo = this.state.supportedHostChains.get(
              hostToAgoricChannel,
            );
            if (hostChainInfo === undefined) {
              return;
            }

            const ibcDenomOnAgoricFromElys = `ibc/${denomHash({ denom: `st${tx.denom}`, channelId: AgoricToElysChannel })}`;

            // Transfer to elys ICA account
            await E(localAccount).transfer(elysICAAddress, {
              denom: ibcDenomOnAgoricFromElys,
              value: BigInt(tx.amount),
            });

            // Move fund to stride ICA account from elysICA
            await E(elysICAAccount).transfer(strideICAAddress, {
              denom: tx.denom, // received from elys, sent to stride from elys
              value: BigInt(tx.amount),
            });

            // TODO: verify this
            const senderNativeAddress = deriveAddress(
              tx.sender,
              hostChainInfo.bech32Prefix,
            );

            // UnStake Tokens and get stTokens on strideICA wallet
            const strideRedeemStakeMsg = Any.toJSON(
              MsgRedeemStake.toProtoMsg({
                creator: strideICAAddress.value,
                amount: tx.amount.toString(),
                hostZone: hostChainInfo.chainId, // chainId of the host chain
                receiver: senderNativeAddress,
              }),
            );
            return watch(
              E(strideICAAccount).executeEncodedTx([strideRedeemStakeMsg]),
            );
          }
        },
      },
      stTokensReceiveWatcher: {
        /**
         * @param {void} _result
         * @param {bigint} amount
         * @param {string} denom
         * @param {ChainAddress} senderElysAddress
         */
        onFulfilled(_result, amount, denom, senderElysAddress) {
          const { elysICAAccount } = this.state;
          return watch(
            E(elysICAAccount).send(senderElysAddress, {
              denom,
              value: amount,
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
