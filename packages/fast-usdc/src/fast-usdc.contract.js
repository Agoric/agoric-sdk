import { BrandShape } from '@agoric/ertp/src/typeGuards.js';
import { withOrchestration } from '@agoric/orchestration';
import { M } from '@endo/patterns';
import { assertAllDefined } from '@agoric/internal';
import { prepareTransactionFeed } from './exos/transaction-feed.js';
import { prepareSettler } from './exos/settler.js';
import { prepareAdvancer } from './exos/advancer.js';
import { prepareStatusManager } from './exos/status-manager.js';

/**
 * @import {OrchestrationPowers, OrchestrationTools} from '@agoric/orchestration/src/utils/start-helper.js';
 * @import {Zone} from '@agoric/zone';
 */

/**
 * @typedef {{
 *   poolFee: Amount<'nat'>;
 *   contractFee: Amount<'nat'>;
 * }} FastUsdcTerms
 */
const NatAmountShape = { brand: BrandShape, value: M.nat() };
export const meta = {
  customTermsShape: {
    contractFee: NatAmountShape,
    poolFee: NatAmountShape,
  },
};
harden(meta);

/**
 * @param {ZCF<FastUsdcTerms>} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 * }} privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
export const contract = async (zcf, privateArgs, zone, tools) => {
  assert(tools, 'no tools');
  const terms = zcf.getTerms();
  assert('USDC' in terms.brands, 'no USDC brand');
  assert('PoolShares' in terms.brands, 'no PoolShares brand');

  const statusManager = prepareStatusManager(zone);
  const feed = prepareTransactionFeed(zone);
  const settler = prepareSettler(zone, { statusManager });
  const advancer = prepareAdvancer(zone, { feed, statusManager });
  assertAllDefined({ feed, settler, advancer, statusManager });

  const creatorFacet = zone.exo('Fast USDC Creator', undefined, {});

  return harden({ creatorFacet });
};
harden(contract);

export const start = withOrchestration(contract);
harden(start);
/** @typedef {typeof start} FastUsdcSF */
