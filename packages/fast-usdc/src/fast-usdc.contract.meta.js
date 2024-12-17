/** ContractMeta, Permit for Fast USDC */
import {
  CosmosChainInfoShape,
  DenomDetailShape,
  DenomShape,
  OrchestrationPowersShape,
} from '@agoric/orchestration';
import { M } from '@endo/patterns';
import {
  FastUSDCTermsShape,
  FeeConfigShape,
  FeedPolicyShape,
} from './type-guards.js';
import { adminPermit, orchPermit } from './orch.start.js';

/**
 * @import {StartParams} from '@agoric/zoe/src/zoeService/utils'
 * @import {BootstrapManifest, BootstrapManifestPermit} from '@agoric/vats/src/core/lib-boot.js';
 * @import {ManifestBundleRef} from '@agoric/deploy-script-support/src/externalTypes.js'
 * @import {TypedPattern, Remote} from '@agoric/internal'
 * @import {Marshaller} from '@agoric/internal/src/lib-chainStorage.js'
 * @import {OrchestrationPowers} from '@agoric/orchestration';
 * @import {FastUsdcSF} from './fast-usdc.contract.js';
 * @import {FeedPolicy, FastUSDCConfig} from './types.js'
 */

/**
 * @import {LegibleCapData} from './utils/config-marshal.js'
 * @import {CorePowersG} from './orch.start.js';
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
export const permit = /** @type {const} */ ({
  produce: { [`${meta.name}Kit`]: true },
  consume: { ...orchPermit, ...adminPermit },
  instance: { produce: { [meta.name]: true } },
  installation: { consume: { [meta.name]: true } },
  issuer: { produce: { FastLP: true }, consume: { USDC: true } },
  brand: { produce: { FastLP: true } },
});
harden(permit);
