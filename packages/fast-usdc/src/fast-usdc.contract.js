import { BrandShape } from '@agoric/ertp/src/typeGuards.js';
import { withOrchestration } from '@agoric/orchestration';
import { M } from '@endo/patterns';
import { assertAllDefined, makeTracer } from '@agoric/internal';
import { AssetKind } from '@agoric/ertp';
import { provideSingleton } from '@agoric/zoe/src/contractSupport/durability.js';
import { prepareTransactionFeed } from './exos/transaction-feed.js';
import { prepareSettler } from './exos/settler.js';
import { prepareAdvancer } from './exos/advancer.js';
import { prepareStatusManager } from './exos/status-manager.js';
import { prepareLiquidityPoolKit } from './exos/liquidity-pool.js';

const trace = makeTracer('FastUsdc');

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

  const statusManager = prepareStatusManager(zone);
  const feed = prepareTransactionFeed(zone);
  const makeSettler = prepareSettler(zone, { statusManager });
  const { chainHub, vowTools } = tools;
  const makeAdvancer = prepareAdvancer(zone, {
    chainHub,
    feed,
    log: trace,
    statusManager,
    vowTools,
  });
  assertAllDefined({ feed, makeAdvancer, makeSettler, statusManager });

  const makeLiquidityPoolKit = prepareLiquidityPoolKit(zone, zcf, {
    USDC: terms.brands.USDC,
  });
  assertAllDefined({ feed, makeSettler, makeAdvancer, statusManager });

  const creatorFacet = zone.exo('Fast USDC Creator', undefined, {});

  // NOTE: all kinds are defined above, before possible remote call.
  const shareMint = await provideSingleton(
    zone.mapStore('mint'),
    'PoolShare',
    () =>
      zcf.makeZCFMint('PoolShares', AssetKind.NAT, {
        decimalPlaces: 6,
      }),
  );
  const publicFacet = zone.makeOnce(
    'Fast USDC Public',
    () => makeLiquidityPoolKit(shareMint).public,
  );

  return harden({ creatorFacet, publicFacet });
};
harden(contract);

export const start = withOrchestration(contract);
harden(start);
/** @typedef {typeof start} FastUsdcSF */
