import { BrandShape } from '@agoric/ertp/src/typeGuards.js';
import { withOrchestration } from '@agoric/orchestration';
import { M } from '@endo/patterns';
import { assertAllDefined, makeTracer } from '@agoric/internal';
import { AssetKind } from '@agoric/ertp';
import { provideSingleton } from '@agoric/zoe/src/contractSupport/durability.js';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
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

  const { makeRecorderKit } = prepareRecorderKitMakers(
    zone.mapStore('vstorage'),
    privateArgs.marshaller,
  );

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
  const makeLiquidityPoolKit = prepareLiquidityPoolKit(
    zone,
    zcf,
    terms.brands.USDC,
    { makeRecorderKit },
  );
  assertAllDefined({ feed, makeSettler, makeAdvancer, statusManager });

  const creatorFacet = zone.exo('Fast USDC Creator', undefined, {
    simulateFeesFromAdvance(amount, payment) {
      console.log('🚧🚧 UNTIL: advance fees are implemented 🚧🚧');
      // eslint-disable-next-line no-use-before-define
      return poolKit.feeSink.receive(amount, payment);
    },
  });

  // ^^^ Define all kinds above this line. Keep remote calls below. vvv

  // NOTE: Using a ZCFMint is helpful for the usual reasons (
  // synchronous mint/burn, keeping assets out of contract vats, ...).
  // And there's just one pool, which suggests building it with zone.exo().
  //
  // But zone.exo() defines a kind and
  // all kinds have to be defined before any remote calls,
  // such as the one to the zoe vat as part of making a ZCFMint.
  //
  // So we use zone.exoClassKit above to define the liquidity pool kind
  // and pass the shareMint into the maker / init function.

  const shareMint = await provideSingleton(
    zone.mapStore('mint'),
    'PoolShare',
    () =>
      zcf.makeZCFMint('PoolShares', AssetKind.NAT, {
        decimalPlaces: 6,
      }),
  );

  const poolKit = zone.makeOnce('Liquidity Pool kit', () =>
    makeLiquidityPoolKit(shareMint, privateArgs.storageNode),
  );

  return harden({ creatorFacet, publicFacet: poolKit.public });
};
harden(contract);

export const start = withOrchestration(contract);
harden(start);
/** @typedef {typeof start} FastUsdcSF */
