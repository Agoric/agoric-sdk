import { AssetKind, makeIssuerKit } from '@agoric/ertp';
import { assertAllDefined } from '@agoric/internal';
import { E } from '@endo/eventual-send';
import { provideFluxAggregator } from './fluxAggregator.js';

/**
 * @typedef {import('@agoric/vat-data').Baggage} Baggage
 * @typedef {import('@agoric/time/src/types').TimerService} TimerService
 */

/**
 * PriceAuthority for their median. Unlike the simpler `priceAggregator.js`, this approximates
 * the *Node Operator Aggregation* logic of [Chainlink price
 * feeds](https://blog.chain.link/levels-of-data-aggregation-in-chainlink-price-feeds/).
 *
 * @param {ZCF<import('./fluxAggregator.js').ChainlinkConfig & {
 * timer: TimerService,
 * brandIn: Brand<'nat'>,
 * brandOut: Brand<'nat'>,
 * unitAmountIn?: Amount<'nat'>,
 * }>} zcf
 * @param {{
 * marshaller: Marshaller,
 * quoteMint?: ERef<Mint<'set'>>,
 * storageNode: ERef<StorageNode>,
 * }} privateArgs
 * @param {Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const { timer: timerP } = zcf.getTerms();

  const quoteMintP =
    privateArgs.quoteMint || makeIssuerKit('quote', AssetKind.SET).mint;
  const [quoteMint, quoteIssuerRecord] = await Promise.all([
    quoteMintP,
    zcf.saveIssuer(E(quoteMintP).getIssuer(), 'Quote'),
  ]);
  const quoteKit = {
    ...quoteIssuerRecord,
    mint: quoteMint,
  };

  const { marshaller, storageNode: storageNodeP } = privateArgs;
  assertAllDefined({ marshaller, storageNodeP });

  const timer = await timerP;
  const storageNode = await storageNodeP;

  const fa = provideFluxAggregator(
    baggage,
    zcf,
    timer,
    quoteKit,
    storageNode,
    marshaller,
  );

  return harden({
    creatorFacet: fa.creatorFacet,
    publicFacet: fa.publicFacet,
  });
};
harden(start);
