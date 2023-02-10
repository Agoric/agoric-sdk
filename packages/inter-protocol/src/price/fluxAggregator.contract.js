import { AssetKind, makeIssuerKit } from '@agoric/ertp';
import { handleParamGovernance } from '@agoric/governance';
import { assertAllDefined, makeTracer } from '@agoric/internal';
import { E } from '@endo/eventual-send';
import { provideFluxAggregator } from './fluxAggregator.js';

const trace = makeTracer('FluxAgg');
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
 * initialPoserInvitation: Invitation,
 * marshaller: Marshaller,
 * quoteMint?: ERef<Mint<'set'>>,
 * storageNode: ERef<StorageNode>,
 * }} privateArgs
 * @param {Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  trace('start');
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

  const {
    initialPoserInvitation,
    marshaller,
    storageNode: storageNodeP,
  } = privateArgs;
  assertAllDefined({ initialPoserInvitation, marshaller, storageNodeP });

  const timer = await timerP;
  const storageNode = await storageNodeP;

  trace('awaited args');

  const fa = provideFluxAggregator(
    baggage,
    zcf,
    timer,
    quoteKit,
    storageNode,
    marshaller,
  );
  trace('got fa', fa);

  const { augmentPublicFacet, makeGovernorFacet } = await handleParamGovernance(
    // @ts-expect-error FIXME include Governance params
    zcf,
    initialPoserInvitation,
    {
      // No governed parameters. Governance just for API methods.
    },
    storageNode,
    marshaller,
  );

  trace('got param governance');

  const governedApis = {
    initOracle: fa.creatorFacet.initOracle,
  };

  const governorFacet = makeGovernorFacet(fa.creatorFacet, governedApis);
  return harden({
    creatorFacet: governorFacet,
    // XXX this is a lot of API to put on every public facet
    publicFacet: augmentPublicFacet(fa.publicFacet),
  });
};
harden(start);
