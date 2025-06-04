import { makeTracer } from '@agoric/internal';
import { Fail } from '@endo/errors';
import { E } from '@endo/far';
import { M, mustMatch } from '@endo/patterns';
import { VowShape } from '@agoric/vow';
import { registerChainsAndAssets } from '../utils/chain-hub-helper.js';
import { prepareChainHubAdmin } from '../exos/chain-hub-admin.js';
import { withOrchestration } from '../utils/start-helper.js';
import * as flows from './elys-contract.flows.js';
import {
  FeeConfigShape,
  validateFeeConfigShape,
} from './elys-contract-type-gaurd.js';
import { ChainAddressShape } from '../typeGuards.js';

const trace = makeTracer('ContractInstantiation');

const interfaceTODO = undefined;
/**
 * @typedef {(
 *   orch: Orchestrator,
 *   ctx: any,
 *   incomingIbcTransferEvent: any,
 *   state: any,
 * ) => Promise<void>} TokenMovementAndStrideLSDFlow
 */

/**
 * @import {CosmosChainInfo, Denom, DenomDetail} from '../types.js';
 * @import {IBCChannelID, VTransferIBCEvent} from '@agoric/vats';
 * @import {Zone} from '@agoric/zone';
 * @import {TargetApp} from '@agoric/vats/src/bridge-target.js';
 * @import {CosmosChainAddress, OrchestrationAccount, Orchestrator} from '@agoric/orchestration';
 * @import {TypedPattern} from '@agoric/internal';
 * @import {OrchestrationTools, OrchestrationPowers} from '../utils/start-helper.js';
 * @import {Passable} from '@endo/pass-style'
 */

/**
 * @typedef {{
 *   hostToAgoricChannel: IBCChannelID;
 *   nativeDenom: string;
 *   ibcDenomOnAgoric: string;
 *   ibcDenomOnStride: string;
 *   hostICAAccount: OrchestrationAccount<any>;
 *   hostICAAccountAddress: CosmosChainAddress;
 *   bech32Prefix: string;
 * }} SupportedHostChainShape
 */
const SupportedHostChainShape = {
  hostToAgoricChannel: M.string(),
  nativeDenom: M.string(),
  ibcDenomOnAgoric: M.string(),
  ibcDenomOnStride: M.string(),
  hostICAAccount: M.any(),
  hostICAAccountAddress: ChainAddressShape,
  bech32Prefix: M.string(),
};
harden(SupportedHostChainShape);

/**
 * @typedef {{
 *   localAccount: OrchestrationAccount<{ chainId: string }>;
 *   localAccountAddress: CosmosChainAddress;
 *   strideICAAccount: OrchestrationAccount<{ chainId: string }>;
 *   strideICAAddress: CosmosChainAddress;
 *   elysICAAccount: OrchestrationAccount<{ chainId: string }>;
 *   elysICAAddress: CosmosChainAddress;
 *   supportedHostChains: MapStore<string, SupportedHostChainShape>;
 *   elysToAgoricChannel: IBCChannelID;
 *   AgoricToElysChannel: IBCChannelID;
 *   stDenomOnElysTohostToAgoricChannelMap: MapStore<string, string>;
 *   agoricBech32Prefix: string;
 *   strideBech32Prefix: string;
 *   elysBech32Prefix: string;
 *   feeConfig: FeeConfigShape;
 * }} StrideStakingTapState
 */
/** @type {TypedPattern<StrideStakingTapState>} */
const StakingTapStateShape = {
  localAccount: M.any(),
  localAccountAddress: ChainAddressShape,
  strideICAAccount: M.any(),
  strideICAAddress: ChainAddressShape,
  elysICAAccount: M.any(),
  elysICAAddress: ChainAddressShape,
  supportedHostChains: M.any(),
  elysToAgoricChannel: M.string(),
  AgoricToElysChannel: M.string(),
  stDenomOnElysTohostToAgoricChannelMap: M.any(),
  agoricBech32Prefix: M.string(),
  strideBech32Prefix: M.string(),
  elysBech32Prefix: M.string(),
  feeConfig: FeeConfigShape,
};
harden(StakingTapStateShape);

/**
 * To be wrapped with `withOrchestration`.
 *
 * @param {ZCF} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 *   chainInfo?: Record<string, CosmosChainInfo>;
 *   assetInfo?: [Denom, DenomDetail & { brandKey?: string }][];
 *   feeConfig: FeeConfigShape;
 *   allowedChains: string[];
 *   storageNode: StorageNode;
 * }} privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
const contract = async (
  zcf,
  privateArgs,
  zone,
  tools, // orchestration tools
) => {
  trace('Instantiating ElysContract');
  const isValid = validateFeeConfigShape(privateArgs.feeConfig);
  if (!isValid) {
    throw Fail`Invalid fee config`;
  }
  trace('Fee is valid moving further...');
  
  const { chainHub, orchestrateAll, vowTools } = tools;
  
  /**
   * Provides a {@link TargetApp} that reacts to an incoming IBC transfer.
  */
  const makeStrideStakingTap = zone.exoClass(
    'StrideStakingTapKit',
    // Taps ibc transfer and start the stake/unstake to/from stride
    M.interface('StrideAutoStakeTap', {
      receiveUpcall: M.call(M.record()).returns(M.or(VowShape, M.undefined())),
    }),
    /** @param {StrideStakingTapState & Passable} initialState */
    initialState => {
      mustMatch(initialState, StakingTapStateShape);
      return harden(initialState);
    },
    {
      /**
       * @param {VTransferIBCEvent & Passable} event
       */
      receiveUpcall(event) {
        trace('receiveUpcall', event);

        const state = this.state;
        const localAccount =
          /** @type {OrchestrationAccount<{ chainId: string }> & Passable} */ (
            this.state.localAccount
          );
        const strideICAAccount =
          /** @type {OrchestrationAccount<{ chainId: string }> & Passable} */ (
            this.state.strideICAAccount
          );
        const elysICAAccount =
          /** @type {OrchestrationAccount<{ chainId: string }> & Passable} */ (
            this.state.elysICAAccount
          );

        orchFns.tokenMovementAndStrideLSDFlow(
          event,
          localAccount,
          state.localAccountAddress,
          strideICAAccount,
          state.strideICAAddress,
          elysICAAccount,
          state.elysICAAddress,
          state.supportedHostChains,
          state.elysToAgoricChannel,
          state.AgoricToElysChannel,
          state.stDenomOnElysTohostToAgoricChannelMap,
          state.agoricBech32Prefix,
          state.strideBech32Prefix,
          state.elysBech32Prefix,
          state.feeConfig,
        );
      },
    },
  );

  const orchFns = orchestrateAll(flows, {
    makeStrideStakingTap,
    chainHub,
  });

  
  trace('Registering Chains and assets...');
  registerChainsAndAssets(
    chainHub,
    zcf.getTerms().brands,
    privateArgs.chainInfo,
    privateArgs.assetInfo,
  );
  trace('Chains and assets are registered, moving further...');
  const passablesupportedHostChains = zone.mapStore('supportedHostChains');
  const stDenomOnElysTohostToAgoricChannelMap = zone.mapStore(
    'stDenomOnElysToHostChannelMap',
  );

  trace('Creating ICA account...');
  const icaAndLocalAccount = zone.makeOnce('icaAndLocalAccount', _key =>
    orchFns.makeICAHookAccounts({
      chainNames: privateArgs.allowedChains,
      supportedHostChains: passablesupportedHostChains,
      stDenomOnElysTohostToAgoricChannelMap,
      feeConfig: privateArgs.feeConfig,
    }),
  );
  trace('ICA accounts created...');

  // set local account address in storage node
  const { when } = vowTools;

  
  
  const address = await E(when(icaAndLocalAccount)).getAddress();
  const creatorFacet = zone.exo('Elys Creator', undefined, {
    getLocalAddress () { return address},
    async prepareChainHubAdmin () { return prepareChainHubAdmin(zone, chainHub); },
  });
  // const storageNode = await E(privateArgs.storageNode).makeChildNode('address');
  // await E(privateArgs.storageNode).setValue( JSON.stringify(address) );

  return {
    publicFacet: zone.exo('Public', interfaceTODO, {
      getLocalAddress: () => address,
    }),
    creatorFacet,
  };
};

export const start = withOrchestration(contract);
harden(start);

/** @typedef {typeof start} ElysContract */
