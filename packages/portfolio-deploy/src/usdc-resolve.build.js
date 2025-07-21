/**
 * @file resolve USDC issuer/brand in bootstrap promise space,
 * which was not done in #59 when the USDC issuer was established.
 *
 * This is a combined builder and core eval.
 *
 * @see resolveUSDC
 * @see {@link https://ping.pub/agoric/gov/59 59. Start USDC (Noble) PSM} 2023-11-01
 */
/* global E */
/// <reference types="./core-eval-endowments.d.ts" />
/**
 * @import {BootstrapManifestPermit} from '@agoric/vats/src/core/lib-boot';
 * @import {DeployScriptFunction, CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 */
import { E } from '@endo/far';

const trace = (...args) => console.log('USDC-R', ...args);

/**
 * XXX: should add this to BootstrapPowers
 *
 * @typedef {{
 *   issuer: PromiseSpaceOf<{USDC: Issuer<'nat'>}>,
 *   brand: PromiseSpaceOf<{USDC: Brand<'nat'>}>,
 * }} USDCResolvePowers
 */

/** @param {BootstrapPowers & USDCResolvePowers} permitted */
export const resolveUSDC = async permitted => {
  trace('resolveUSDC...');
  const { agoricNames } = permitted.consume;

  /** @type {Promise<Issuer<'nat'>>} */
  const issuerP = E(agoricNames).lookup('issuer', 'USDC');
  const [issuer, brand] = await Promise.all([issuerP, E(issuerP).getBrand()]);

  const { USDC: produceIssuer } = permitted.issuer.produce;
  const { USDC: produceBrad } = permitted.brand.produce;

  produceIssuer.resolve(issuer);
  produceBrad.resolve(brand);

  trace('... resolveUSDC done', { issuer, brand });
};

export const getManifestForResolveUSDC = _utils => {
  return {
    manifest: {
      /** @type {BootstrapManifestPermit} */
      [resolveUSDC.name]: {
        consume: { agoricNames: true },
        issuer: { produce: { USDC: true } },
        brand: { produce: { USDC: true } },
      },
    },
  };
};

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async _utils =>
  harden({
    // Somewhat unorthodox, source the exports from this builder module
    sourceSpec: '@aglocal/portfolio-deploy/src/usdc-resolve.build.js',
    getManifestCall: [getManifestForResolveUSDC.name],
  });

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  // import dynamically so the module can work in CoreEval environment
  const dspModule = await import('@agoric/deploy-script-support');
  const { makeHelpers } = dspModule;
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('eval-usdc-resolve', defaultProposalBuilder);
};
