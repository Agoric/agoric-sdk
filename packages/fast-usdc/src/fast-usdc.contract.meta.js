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
import { startOrchContractG } from './fast-usdc.start.js';

/**
 * @import {StartParams} from '@agoric/zoe/src/zoeService/utils'
 * @import {BootstrapManifestPermit} from '@agoric/vats/src/core/lib-boot.js';
 * @import {TypedPattern, Remote} from '@agoric/internal'
 * @import {Marshaller} from '@agoric/internal/src/lib-chainStorage.js'
 * @import {OrchestrationPowers} from '@agoric/orchestration';
 * @import {FastUsdcSF} from './fast-usdc.contract.js';
 * @import {FeedPolicy, FastUSDCConfig} from './types.js'
 */

/**
 * @import {LegibleCapData} from './utils/config-marshal.js'
 * @import {CorePowersG} from './fast-usdc.start.js';
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
  /** @type {Record<keyof FastUSDCConfig, keyof StartedInstanceKit<FastUsdcSF>['creatorFacet']>} */
  adminRoles: {
    oracles: 'makeOperatorInvitation',
  },
});
harden(meta);

/** @satisfies {BootstrapManifestPermit} */
const orchPermit = /** @type {const} */ ({
  localchain: true,
  cosmosInterchainService: true,
  chainStorage: true,
  chainTimerService: true,
  agoricNames: true,

  // for publishing Brands and other remote object references
  board: true,

  // limited distribution durin MN2: contract installation
  startUpgradable: true,
  zoe: true, // only getTerms() is needed. XXX should be split?
});

/**
 * to find deposit facets for admin invitations
 *
 * @satisfies {BootstrapManifestPermit}
 */
const adminPermit = /** @type {const} */ ({
  namesByAddress: true,
});

/** @satisfies {BootstrapManifestPermit} */
export const permit = /** @type {const} */ ({
  produce: { [`${meta.name}Kit`]: true },
  consume: { ...orchPermit, ...adminPermit },
  instance: { produce: { [meta.name]: true } },
  installation: { consume: { [meta.name]: true } },
  issuer: {
    consume: { USDC: true },
    produce: { FastLP: true }, // UNTIL #10432
  },
  brand: {
    produce: { FastLP: true }, // UNTIL #10432
  },
});
harden(permit);

const POOL_METRICS = 'poolMetrics';

/**
 *
 * @param {OrchestrationPowers} orchestrationPowers
 * @param {Marshaller} marshaller
 * @param {FastUSDCConfig} config
 * @param {(...args: any[]) => void} trace
 * @returns {Promise<StartParams<FastUsdcSF>['privateArgs']>}
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

const FEED_POLICY = 'feedPolicy';

/**
 * @param {Remote<StorageNode>} node
 * @param {FeedPolicy} policy
 */
const publishFeedPolicy = async (node, policy) => {
  const feedPolicy = E(node).makeChildNode(FEED_POLICY);
  await E(feedPolicy).setValue(JSON.stringify(policy));
};

/**
 * @param {FastUSDCConfig} config
 * @param {StartedInstanceKit<FastUsdcSF> &
 *  { privateArgs: StartParams<FastUsdcSF>['privateArgs'] }
 * } kit
 * @param {(...args: any[]) => void} trace
 */
export const finishDeploy = async (config, kit, trace = console.log) => {
  const { storageNode } = kit.privateArgs;
  const { feedPolicy } = config;
  await publishFeedPolicy(storageNode, feedPolicy);

  const { creatorFacet } = kit;
  const addresses = await E(creatorFacet).publishAddresses();
  trace('contract orch account addresses', addresses);
  if (!config.noNoble) {
    const addr = await E(creatorFacet).connectToNoble();
    trace('noble intermediate recipient', addr);
  }
};

/**
 * @param {BootstrapPowers & CorePowersG<'fastUsdc', FastUsdcSF, typeof permit>} permitted
 * @param {{ options: LegibleCapData<FastUSDCConfig> }} config
 */
const startFastUSDC = async (permitted, config) => {
  const { config: conf, kit } = await startOrchContractG(
    meta,
    permit,
    makePrivateArgs,
    permitted,
    config,
  );
  // TODO: inline finishDeploy?
  // TODO: make a tracer?
  await finishDeploy(conf, kit);
};
