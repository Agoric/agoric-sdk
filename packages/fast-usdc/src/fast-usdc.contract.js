import { BrandShape } from '@agoric/ertp/src/typeGuards.js';
import { withOrchestration } from '@agoric/orchestration';
import { M } from '@endo/patterns';
import { assertAllDefined } from '@agoric/internal';
import { AssetKind } from '@agoric/ertp';
import { provideSingleton } from '@agoric/zoe/src/contractSupport/durability.js';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { prepareTransactionFeed } from './exos/transaction-feed.js';
import { prepareSettler } from './exos/settler.js';
import { prepareAdvancer } from './exos/advancer.js';
import { prepareStatusManager } from './exos/status-manager.js';
import { prepareLiquidityPoolKit } from './exos/liquidity-pool.js';

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
  const settler = prepareSettler(zone, { statusManager });
  const advancer = prepareAdvancer(zone, { feed, statusManager });
  const makeLiquidityPoolKit = prepareLiquidityPoolKit(
    zone,
    zcf,
    { USDC: terms.brands.USDC },
    { makeRecorderKit },
  );
  assertAllDefined({ feed, settler, advancer, statusManager });

  const creatorFacet = zone.exo('Fast USDC Creator', undefined, {
    simulateFeesFromAdvance(amount, payment) {
      console.log('UNTIL: advance fees are implemented');
      // eslint-disable-next-line no-use-before-define
      return poolKit.feeSink.receive(amount, payment);
    },
  });

  // NOTE: all kinds are defined above, before possible remote call.
  const shareMint = await provideSingleton(
    zone.mapStore('mint'),
    'PoolShare',
    () =>
      zcf.makeZCFMint('PoolShares', AssetKind.NAT, {
        decimalPlaces: 6,
      }),
  );
  const poolKit = zone.makeOnce('Liquidity Pool kit', () =>
    // @ts-expect-error makeLiquidityPoolKit isn't up to speed on Remote<>
    makeLiquidityPoolKit(shareMint, privateArgs.storageNode),
  );

  return harden({ creatorFacet, publicFacet: poolKit.public });
};
harden(contract);

export const start = withOrchestration(contract);
harden(start);
/** @typedef {typeof start} FastUsdcSF */
