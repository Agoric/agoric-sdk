/** ContractMeta, Permit for Fast USDC */
import { E } from '@endo/far';
import { makeTracer } from '@agoric/internal/src/debug.js';
import { meta, permit } from './fast-usdc.contract.meta.js';
import { makeGetManifest, startOrchContract } from './orch.start.js';

/**
 * @import {Marshaller} from '@agoric/internal/src/lib-chainStorage.js'
 * @import {OrchestrationPowers} from '@agoric/orchestration';
 *
 * XXX these 2 could/should be down in the platform somewhere
 * @import {LegibleCapData} from './utils/config-marshal.js'
 * @import {CorePowersG} from './orch.start.js';
 *
 * @import {FastUsdcSF} from './fast-usdc.contract.js';
 * @import {FastUSDCConfig} from './types.js'
 */

const POOL_METRICS = 'poolMetrics';
const FEED_POLICY = 'feedPolicy';

const trace = makeTracer(`FUSDC-Start`, true);

/**
 *
 * @param {OrchestrationPowers} orchestrationPowers
 * @param {Marshaller} marshaller
 * @param {FastUSDCConfig} config
 * @returns {Promise<Parameters<FastUsdcSF>[1]>}
 */
export const makePrivateArgs = async (
  orchestrationPowers,
  marshaller,
  config,
) => {
  const { feeConfig, chainInfo, assetInfo } = config;
  trace('using fee config', feeConfig);

  const { storageNode } = orchestrationPowers;
  const poolMetricsNode = await E(storageNode).makeChildNode(POOL_METRICS);

  return harden({
    ...orchestrationPowers,
    feeConfig,
    poolMetricsNode,
    marshaller,
    chainInfo,
    assetInfo,
  });
};
harden(makePrivateArgs);

/**
 * @param {BootstrapPowers & CorePowersG<'fastUsdc', FastUsdcSF, typeof permit>} permitted
 * @param {{ options: LegibleCapData<FastUSDCConfig> }} configStruct
 */
export const startFastUSDC = async (permitted, configStruct) => {
  const { config, kit } = await startOrchContract(
    meta,
    permit,
    makePrivateArgs,
    permitted,
    configStruct,
  );

  const { storageNode } = kit.privateArgs;
  const { feedPolicy } = config;
  const policyNode = E(storageNode).makeChildNode(FEED_POLICY);
  await E(policyNode).setValue(JSON.stringify(feedPolicy));

  const { creatorFacet } = kit;
  const addresses = await E(creatorFacet).publishAddresses();
  trace('contract orch account addresses', addresses);
  if (!config.noNoble) {
    const addr = await E(creatorFacet).connectToNoble();
    trace('noble intermediate recipient', addr);
  }
};

// XXX hm... we need to preserve the function name.
export const getManifestForFastUSDC = (u, d) =>
  makeGetManifest(startFastUSDC, permit, meta.name)(u, d);
