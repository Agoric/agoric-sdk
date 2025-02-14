import { makeTracer } from '@agoric/internal';
import { registerChainsAndAssets } from '../utils/chain-hub-helper.js';
import { withOrchestration } from '../utils/start-helper.js';
import { prepareStrideStakingTap } from './elys-contract-tap-kit.js';
import * as flows from './elys-contract.flow.js';
import { FeeConfigShape } from './elys-contract-type-gaurd.js';
import { E } from '@endo/far';

const trace = makeTracer('ContractInstantiation');

const interfaceTODO = undefined;
/**
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationPowers, OrchestrationTools} from '../utils/start-helper.js';
 * @import {CosmosChainInfo, Denom, DenomDetail} from '../types.js';
 * import { FeeConfig } from './elys-contract-type-gaurd.js';
 */

/**
 * To be wrapped with `withOrchestration`.
 *
 * @param {ZCF} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 *   chainInfo?: Record<string, CosmosChainInfo>;
 *   assetInfo?: [Denom, DenomDetail & { brandKey?: string }][];
 *   feeConfig: FeeConfigShape,
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
  // TODO: Add assertions for privateArgs feeInfo
  const { chainHub, orchestrateAll, vowTools } = tools;

  const makeStrideStakingTap = prepareStrideStakingTap(
    zone.subZone('strideStakingTap'),
    tools,
  );

  const { makeICAHookAccounts } = orchestrateAll(flows, {
    makeStrideStakingTap,
    chainHub,
  });

  registerChainsAndAssets(
    chainHub,
    zcf.getTerms().brands,
    privateArgs.chainInfo,
    privateArgs.assetInfo,
  );

  const passablesupportedHostChains = zone.mapStore('supportedHostChains');
  const stDenomOnElysTohostToAgoricChannelMap = zone.mapStore(
    'stDenomOnElysToHostChannelMap',
  );

  const icaAndLocalAccount = zone.makeOnce('icaAndLocalAccount', _key =>
    makeICAHookAccounts({
      chainNames: allowedChains,
      supportedHostChains: passablesupportedHostChains,
      stDenomOnElysTohostToAgoricChannelMap,
      feeConfig: privateArgs.feeConfig,
    }),
  );

  const { when } = vowTools;

  return {
    publicFacet: zone.exo('Public', interfaceTODO, {
      getLocalAddress: () => E(when(icaAndLocalAccount)).getAddress(),
    }),
    creatorFacet: zone.exo('MyCreator', undefined, {}),
  };
};

export const start = withOrchestration(contract);
harden(start);

// TODO: Send these params during initialisation of the contract
const allowedChains = ['cosmoshub'];
harden(allowedChains);
