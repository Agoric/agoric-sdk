import {
  hasIssuer,
  makeDurableIssuerKit,
  prepareIssuerKit,
} from '@agoric/ertp';
import { handleParamGovernance } from '@agoric/governance';
import { assertAllDefined, makeTracer } from '@agoric/internal';
import { prepareDurablePublishKit } from '@agoric/notifier';
import { provideAll } from '@agoric/zoe/src/contractSupport/durability.js';
import { prepareRecorder } from '@agoric/zoe/src/contractSupport/recorder.js';
import { E } from '@endo/eventual-send';
import { reserveThenDeposit } from '../proposals/utils.js';
import { prepareFluxAggregatorKit } from './fluxAggregatorKit.js';

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
 * @param {ZCF<import('./fluxAggregatorKit.js').ChainlinkConfig & {
 * timer: TimerService,
 * brandIn: Brand<'nat'>,
 * brandOut: Brand<'nat'>,
 * unitAmountIn?: Amount<'nat'>,
 * }>} zcf
 * @param {{
 * initialPoserInvitation: Invitation,
 * marshaller: Marshaller,
 * namesByAddressAdmin: ERef<import('@agoric/vats').NameAdmin>,
 * storageNode: StorageNode,
 * }} privateArgs
 * @param {Baggage} baggage
 */
export const prepare = async (zcf, privateArgs, baggage) => {
  trace('prepare with baggage keys', [...baggage.keys()]);

  // xxx uses contract baggage as issuerBagage, assumes one issuer in this contract
  /** @type {import('./roundsManager.js').QuoteKit} */
  const quoteIssuerKit = hasIssuer(baggage)
    ? prepareIssuerKit(baggage)
    : makeDurableIssuerKit(baggage, 'quote', 'set');

  const {
    initialPoserInvitation,
    marshaller,
    namesByAddressAdmin,
    storageNode,
  } = privateArgs;
  assertAllDefined({ initialPoserInvitation, marshaller, storageNode });

  const { timer } = zcf.getTerms();

  trace('awaited args');

  const makeDurablePublishKit = prepareDurablePublishKit(
    baggage,
    'Price Aggregator publish kit',
  );
  const makeRecorder = prepareRecorder(baggage, marshaller);

  const makeFluxAggregatorKit = await prepareFluxAggregatorKit(
    baggage,
    zcf,
    timer,
    quoteIssuerKit,
    storageNode,
    makeDurablePublishKit,
    makeRecorder,
  );

  const { faKit } = await provideAll(baggage, {
    faKit: () => makeFluxAggregatorKit(),
  });
  trace('got faKit', faKit);

  // cannot be stored in baggage because not durable
  // UNTIL https://github.com/Agoric/agoric-sdk/issues/4343
  const { makeDurableGovernorFacet } = handleParamGovernance(
    // @ts-expect-error FIXME include Governance params
    zcf,
    initialPoserInvitation,
    {
      // No governed parameters. Governance just for API methods.
    },
    storageNode,
    marshaller,
  );

  trace('got makeDurableGovernorFacet', makeDurableGovernorFacet);

  /**
   * Initialize a new oracle and send an invitation to control it.
   *
   * @param {string} addr
   */
  const addOracle = async addr => {
    trace('addOracle', addr);
    const invitation = await E(faKit.creator).makeOracleInvitation(addr);
    // XXX imported from 'proposals' path
    await reserveThenDeposit(
      `fluxAggregator oracle ${addr}`,
      namesByAddressAdmin,
      addr,
      [invitation],
    );
    return `added ${addr}`;
  };

  /**
   * Remove an oracle from aggregation and disable its facet.
   *
   * @param {string} oracleId
   */
  const removeOracle = async oracleId => {
    trace('removeOracle', oracleId);
    await E(faKit.creator).removeOracle(oracleId);
    return `removed ${oracleId}`;
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
    /**
     * Remove the specified oracles. May partially fail, such that some oracles are removed and others aren't.
     * If the oracle was never part of the set that's a PromiseRejectedResult
     *
     * @param {string[]} oracleIds
     * @returns {Promise<Array<PromiseSettledResult<string>>>}
     */
    removeOracles: oracleIds => {
      return Promise.allSettled(oracleIds.map(removeOracle));
    },
  };

  const { governorFacet } = makeDurableGovernorFacet(
    baggage,
    faKit.creator,
    governedApis,
  );
  trace('made governorFacet', governorFacet);

  return harden({
    creatorFacet: governorFacet,
    publicFacet: faKit.public,
  });
};
harden(prepare);
