/** @file core eval module to reimburse a manual intervention. */
import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';
import { fromExternalConfig } from './utils/config-marshal.js';

/**
 * @import {Amount, Brand, DepositFacet, Ratio} from '@agoric/ertp';
 * @import {FastUSDCCorePowers} from './start-fast-usdc.core.js';
 * @import {CopyRecord} from '@endo/pass-style'
 * @import {BootstrapManifestPermit} from '@agoric/vats/src/core/lib-boot.js'
 * @import {LegibleCapData} from './utils/config-marshal.js'
 */

/**
 * @typedef {{ destinationAddress: import('@agoric/orchestration').Bech32Address, principal: Amount<'nat'>} &
 *  CopyRecord
 * } ReimbursementTerms
 */

const issUSDC = 'USDC'; // issuer name

const trace = makeTracer('RUCF', true);

/**
 * Transactions that reached FAILED_FORWARD status before we had a retrier
 * (and stored failed forwards) were terminal and required manual payment.
 * OpCo made those transfers from its own funds. This will reimburse those payments.
 *
 * @param {BootstrapPowers & FastUSDCCorePowers } permittedPowers
 * @param {{ options: LegibleCapData<{ terms: ReimbursementTerms}> }} config
 */
export const reimburseManualIntervention = async (permittedPowers, config) => {
  trace('reimburseManualIntervention...', config.options);

  const { agoricNames } = permittedPowers.consume;
  /** @type {Brand<'nat'>} */
  const usdcBrand = await E(agoricNames).lookup('brand', issUSDC);
  /** @type {{ terms: ReimbursementTerms}} */
  const { terms } = fromExternalConfig(config.options, {
    USDC: usdcBrand,
  });

  const { creatorFacet } = await permittedPowers.consume.fastUsdcKit;
  await E(creatorFacet).sendFromSettlementAccount(
    terms.destinationAddress,
    terms.principal,
  );
  trace('done');
};
harden(reimburseManualIntervention);

/** @satisfies {BootstrapManifestPermit} */
const permit = {
  consume: {
    fastUsdcKit: true,
    agoricNames: true,
  },
};

/**
 * @param {unknown} _utils
 * @param {Parameters<typeof reimburseManualIntervention>[1]} config
 */
export const getManifestForReimburseManualIntervention = (
  _utils,
  { options },
) => {
  return { manifest: { [reimburseManualIntervention.name]: permit }, options };
};
