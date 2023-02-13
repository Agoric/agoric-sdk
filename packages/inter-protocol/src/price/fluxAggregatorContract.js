import { AssetKind, makeIssuerKit } from '@agoric/ertp';
import { handleParamGovernance } from '@agoric/governance';
import { assertAllDefined, makeTracer } from '@agoric/internal';
import { E } from '@endo/eventual-send';
import { reserveThenDeposit } from '../proposals/utils.js';
import { provideFluxAggregator } from './fluxAggregator.js';

const trace = makeTracer('FluxAgg', false);
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
 * namesByAddressAdmin: ERef<import('@agoric/vats').NameAdmin>,
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
    namesByAddressAdmin,
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

  const { makeGovernorFacet } = await handleParamGovernance(
    // @ts-expect-error FIXME include Governance params
    zcf,
    initialPoserInvitation,
    {
      // No governed parameters. Governance just for API methods.
    },
    storageNode,
    marshaller,
  );

  /**
   * Initialize a new oracle and send an invitation to administer it.
   *
   * @param {string} addr
   */
  const addOracle = async addr => {
    const invitation = await E(fa.creatorFacet).makeOracleInvitation(addr);
    // XXX imported from 'proposals' path
    await reserveThenDeposit(
      `fluxAggregator oracle ${addr}`,
      namesByAddressAdmin,
      addr,
      [invitation],
    );
    return `added ${addr}`;
  };

  const governedApis = {
    /**
     * Add the specified oracles. May partially fail, such that some oracles are added and others aren't.
     *
     * @param {string[]} oracleIds
     * @returns {Promise<Array<PromiseSettledResult<string>>>}
     */
    addOracles: oracleIds => {
      return Promise.allSettled(oracleIds.map(addOracle));
    },
  };

  const governorFacet = makeGovernorFacet(fa.creatorFacet, governedApis);
  return harden({
    creatorFacet: governorFacet,
    publicFacet: fa.publicFacet,
  });
};
harden(start);
