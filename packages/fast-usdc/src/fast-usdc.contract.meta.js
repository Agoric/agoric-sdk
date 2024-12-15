/** ContractMeta, Permit for Fast USDC */
import {
  CosmosChainInfoShape,
  DenomDetailShape,
  DenomShape,
  OrchestrationPowersShape,
} from '@agoric/orchestration';
import { M } from '@endo/patterns';
import { FastUSDCTermsShape, FeeConfigShape } from './type-guards.js';

/**
 * @import {FastUsdcSF} from './fast-usdc.contract.js';
 */

/** @satisfies {ContractMeta<FastUsdcSF>} */
export const meta = {
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
  adminRoles: {
    oracles: 'makeOperatorInvitation',
  },
};
harden(meta);

/**
 * @import {BootstrapManifestPermit} from '@agoric/vats/src/core/lib-boot.js';
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
