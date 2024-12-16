/** ContractMeta, Permit for Fast USDC */
import {
  CosmosChainInfoShape,
  DenomDetailShape,
  DenomShape,
  OrchestrationPowersShape,
} from '@agoric/orchestration';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import {
  FastUSDCTermsShape,
  FeeConfigShape,
  FeedPolicyShape,
} from './type-guards.js';

/**
 * @import {Instance, StartParams} from '@agoric/zoe/src/zoeService/utils'
 * @import {BootstrapManifestPermit} from '@agoric/vats/src/core/lib-boot.js';
 * @import {TypedPattern} from '@agoric/internal'
 * @import {Marshaller} from '@agoric/internal/src/lib-chainStorage.js'
 * @import {OrchestrationPowers} from '@agoric/orchestration';
 * @import {FastUsdcSF} from './fast-usdc.contract.js';
 * @import {FastUSDCConfig} from './types.js'
 */

/** @type {TypedPattern<FastUSDCConfig>} */
export const FastUSDCConfigShape = M.splitRecord({
  terms: FastUSDCTermsShape,
  oracles: M.recordOf(M.string(), M.string()),
  feeConfig: FeeConfigShape,
  feedPolicy: FeedPolicyShape,
  chainInfo: M.recordOf(M.string(), CosmosChainInfoShape),
  assetInfo: M.arrayOf([DenomShape, DenomDetailShape]),
});

/** @satisfies {ContractMeta<FastUsdcSF>} */
export const meta = /** @type {const} */ ({
  name: 'fastUsdc',
  abbr: 'FUSD', // for tracer(s)
  // @ts-expect-error TypedPattern not recognized as record
  customTermsShape: FastUSDCTermsShape,
  privateArgsShape: {
    // @ts-expect-error TypedPattern not recognized as record
    ...OrchestrationPowersShape,
    assetInfo: M.arrayOf([DenomShape, DenomDetailShape]),
    chainInfo: M.recordOf(M.string(), CosmosChainInfoShape),
    feeConfig: FeeConfigShape,
    marshaller: M.remotable(),
    poolMetricsNode: M.remotable(),
  },
  deployConfigShape: FastUSDCConfigShape,
  adminRoles: {
    oracles: 'makeOperatorInvitation',
  },
});
harden(meta);

/**
 * @typedef { PromiseSpaceOf<{
 *   fastUsdcKit: FastUSDCKit
 *  }> & {
 *   installation: PromiseSpaceOf<{ fastUsdc: Installation<FastUsdcSF> }>;
 *   instance: PromiseSpaceOf<{ fastUsdc: Instance<FastUsdcSF> }>;
 *   issuer: PromiseSpaceOf<{ FastLP: Issuer }>;
 *   brand: PromiseSpaceOf<{ FastLP: Brand }>;
 * }} FastUSDCCorePowers
 *
 * @typedef {StartedInstanceKitWithLabel & {
 *   privateArgs: StartParams<FastUsdcSF>['privateArgs'];
 * }} FastUSDCKit
 */

/** @satisfies {BootstrapManifestPermit} */
export const permit = {
  produce: {
    fastUsdcKit: true,
  },
  consume: {
    chainStorage: true,
    chainTimerService: true,
    localchain: true,
    cosmosInterchainService: true,

    // limited distribution durin MN2: contract installation
    startUpgradable: true,
    zoe: true, // only getTerms() is needed. XXX should be split?

    // widely shared: name services
    agoricNames: true,
    namesByAddress: true,
    board: true,
  },
  issuer: {
    consume: { USDC: true },
    produce: { FastLP: true }, // UNTIL #10432
  },
  brand: {
    produce: { FastLP: true }, // UNTIL #10432
  },
  instance: {
    produce: { fastUsdc: true },
  },
  installation: {
    consume: { fastUsdc: true },
  },
};
harden(permit);

const POOL_METRICS = 'poolMetrics';

/**
 *
 * @param {OrchestrationPowers} orchestrationPowers
 * @param {Marshaller} marshaller
 * @param {FastUSDCConfig} config
 * @param {(...args: any[]) => void} trace
 * @returns {Promise<Parameters<FastUsdcSF>['1']>}
 */
export const makePrivateArgs = async (
  orchestrationPowers,
  marshaller,
  config,
  trace,
) => {
  const { storageNode } = orchestrationPowers;
  const poolMetricsNode = await E(storageNode).makeChildNode(POOL_METRICS);
  const { feeConfig } = config;
  trace('using fee config', feeConfig);

  return harden({
    ...orchestrationPowers,
    feeConfig,
    poolMetricsNode,
    marshaller,
    chainInfo: config.chainInfo,
    assetInfo: config.assetInfo,
  });
};
harden(makePrivateArgs);
