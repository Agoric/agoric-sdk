import { M, mustMatch } from '@endo/patterns';
import { E } from '@endo/far';
import { VowShape } from '@agoric/vow';
import { makeTracer } from '@agoric/internal';
import { ChainAddressShape } from '../typeGuards.js';
import * as tokenflows from './elys-contract-token.flow.js';

const trace = makeTracer('StrideStakingTap');

/**
 * @typedef {(
 *   orch: Orchestrator,
 *   ctx: any,
 *   incomingIbcTransferEvent: any,
 *   state: any
 * ) => Promise<void>} TokenMovementAndStrideLSDFlow
 */

/**
 * @import {IBCChannelID, VTransferIBCEvent} from '@agoric/vats';
 * @import {VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {TargetApp} from '@agoric/vats/src/bridge-target.js';
 * @import {ChainAddress, OrchestrationAccount, Orchestrator} from '@agoric/orchestration';
 * @import {FungibleTokenPacketData} from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 * @import {TypedPattern} from '@agoric/internal';
 * @import {OrchestrationPowers, OrchestrationTools} from '../utils/start-helper.js';
 * @import {Passable} from '@endo/pass-style'
 */

/**
 * @typedef {{
 *   hostToAgoricChannel: IBCChannelID;
 *   nativeDenom: string;
 *   ibcDenomOnAgoric: string;
 *   ibcDenomOnStride: string;
 *   hostICAAccount: OrchestrationAccount<any>;
 *   hostICAAccountAddress: ChainAddress;
 *   bech32Prefix: string;
 * }} SupportedHostChainShape
 */
const SupportedHostChainShape = {
  hostToAgoricChannel: M.string(),
  nativeDenom: M.string(),
  ibcDenomOnAgoric: M.string(),
  ibcDenomOnStride: M.string(),
  hostICAAccount: M.remotable('HostAccountICA'),
  hostICAAccountAddress: ChainAddressShape,
  bech32Prefix: M.string(),
};
harden(SupportedHostChainShape);

/**
 * @typedef {{
 *   localAccount: OrchestrationAccount<{ chainId: string }>;
 *   localAccountAddress: ChainAddress;
 *   strideICAAccount: OrchestrationAccount<{ chainId: string }>;
 *   strideICAAddress: ChainAddress;
 *   elysICAAccount: OrchestrationAccount<{ chainId: string }>;
 *   elysICAAddress: ChainAddress;
 *   supportedHostChains: MapStore<string, SupportedHostChainShape>;
 *   elysToAgoricChannel: IBCChannelID;
 *   AgoricToElysChannel: IBCChannelID;
 *   stDenomOnElysTohostToAgoricChannelMap: MapStore<string, string>;
 *   agoricBech32Prefix: string;
 *   strideBech32Prefix: string;
 *   elysBech32Prefix: string;
 * }} StrideStakingTapState
 */
/** @type {TypedPattern<StrideStakingTapState>} */
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
  agoricBech32Prefix: M.string(),
  strideBech32Prefix: M.string(),
  elysBech32Prefix: M.string(),
};
harden(StakingTapStateShape);

/**
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
const prepareStrideStakingTapKit = (zone, tools) => {
  return zone.exoClassKit(
    'StrideStakingTapKit',
    {
      // Taps ibc transfer and start the stake/unstake to/from stride
      tap: M.interface('StrideAutoStakeTap', {
        receiveUpcall: M.call(M.record()).returns(
          M.or(VowShape, M.undefined()),
        ),
      }),
      voidWatcher: M.interface('voidWatcher', {
        nothingDoer: M.call(M.undefined()).returns(
          M.undefined(),
        ),
      })
    },
    // @param {StrideStakingTapState & import('@endo/marshal').Passable} initialState
    /** @param {StrideStakingTapState & Passable} initialState */
    initialState => {
      mustMatch(initialState, StakingTapStateShape);
      return harden(initialState);
    },
    {
      tap: {
        /**
         * @param {VTransferIBCEvent &  Passable} event
         */
        receiveUpcall(event) {
          trace('receiveUpcall', event);
          const {orchestrateAll,vowTools} = tools;
          const {watch} = vowTools;
          const state = this.state;
          const { tokenMovementAndStrideLSDFlow } = orchestrateAll(tokenflows, {});
          return watch(tokenMovementAndStrideLSDFlow(
            harden(event),
            harden(state),
          ));
        },
      },
      voidWatcher: {
        nothingDoer() {
         return;
        },
      }
    },
  );
};

/**
 * Provides a {@link TargetApp} that reacts to an incoming IBC transfer by:
 *
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 * @returns {(
 *   ...args: Parameters<ReturnType<typeof prepareStrideStakingTapKit>>
 * ) => ReturnType<ReturnType<typeof prepareStrideStakingTapKit>>['tap']}
 */
export const prepareStrideStakingTap = (zone, tools) => {
  const makeKit = prepareStrideStakingTapKit(zone, tools);
  return (...args) => makeKit(...args).tap;
};

/** @typedef {ReturnType<typeof prepareStrideStakingTap>} MakeStrideStakingTap */
/** @typedef {ReturnType<MakeStrideStakingTap>} StakingTap */

// Add retries in ibc Transfer
