import { makeHelpers } from '@agoric/deploy-script-support';
import { AmountMath } from '@agoric/ertp';
import { multiplyBy, parseRatio } from '@agoric/ertp/src/ratio.js';
import { Far } from '@endo/far';
import { parseArgs } from 'node:util';
import { assertBech32Address } from '@agoric/orchestration/src/utils/address.js';
import { getManifestForReimburseManualIntervention } from './reimburse-manual-intervention.core.js';
import { toExternalConfig } from './utils/config-marshal.js';

/**
 * @import {CoreEvalBuilder, DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js'
 * @import {ReimbursementTerms} from './reimburse-manual-intervention.core.js'
 */

const usage = 'Use: --destinationAddress <address> --principal <amount>';

const xVatCtx = /** @type {const} */ ({
  /** @type {Brand<'nat'>} */
  USDC: Far('USDC Brand'),
});
const { USDC } = xVatCtx;
const USDC_DECIMALS = 6n;
const unit = AmountMath.make(USDC, 10n ** USDC_DECIMALS);

/**
 * @param {unknown} _utils
 * @param {ReimbursementTerms} terms
 * @satisfies {CoreEvalBuilder}
 */
const manualInterventionProposalBuilder = async (_utils, terms) => {
  return harden({
    sourceSpec: './reimburse-manual-intervention.core.js',
    /** @type {[string, Parameters<typeof getManifestForReimburseManualIntervention>[1]]} */
    getManifestCall: [
      getManifestForReimburseManualIntervention.name,
      { options: toExternalConfig(harden({ terms }), xVatCtx) },
    ],
  });
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  const {
    values: { destinationAddress, principal },
  } = parseArgs({
    args: endowments.scriptArgs,
    options: {
      destinationAddress: { type: 'string' },
      principal: { type: 'string' },
    },
  });
  assert(destinationAddress && principal, usage);
  assertBech32Address(destinationAddress);

  /** @type {ReimbursementTerms} */
  const feeTerms = {
    destinationAddress,
    principal: multiplyBy(unit, parseRatio(principal, USDC)),
  };
  await writeCoreEval('eval-reimburse-manual-intervention', utils =>
    manualInterventionProposalBuilder(utils, feeTerms),
  );
};
