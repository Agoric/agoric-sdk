// @jessie-check

import { prepareIssuerKit } from '@agoric/ertp';
import { handleParamGovernance } from '@agoric/governance';
import { makeTracer, StorageNodeShape } from '@agoric/internal';
import { wrapRemoteMarshaller } from '@agoric/internal/src/marshal/wrap-marshaller.js';
import { prepareDurablePublishKit } from '@agoric/notifier';
import { M } from '@agoric/store';
import { provideAll } from '@agoric/zoe/src/contractSupport/durability.js';
import { prepareRecorder } from '@agoric/zoe/src/contractSupport/recorder.js';
import { E } from '@endo/eventual-send';
import { reserveThenDeposit } from '../proposals/utils.js';
import { prepareFluxAggregatorKit } from './fluxAggregatorKit.js';

const trace = makeTracer('FluxAgg', false);
/**
 * @import {Baggage} from '@agoric/vat-data'
 * @import {TimerService} from '@agoric/time'
 * @import {Remote} from '@agoric/internal';
 * @import {ChainlinkConfig} from './fluxAggregatorKit.js';
 * @import {PrioritySendersManager} from '@agoric/internal/src/priority-senders.js';
 * @import {NameAdmin} from '@agoric/vats';
 * @import {QuoteKit} from './roundsManager.js';
 * @import {Invitation} from '@agoric/zoe';
 * @import {ContractMeta, ZCF} from '@agoric/zoe';
 * @import {Brand} from '@agoric/ertp';
 * @import {Amount} from '@agoric/ertp';
 * @import {Marshaller} from '@agoric/internal/src/lib-chainStorage.js';
 * @import {StorageNode} from '@agoric/internal/src/lib-chainStorage.js';
 * @import {ERef} from '@agoric/vow';
 */

/** @type {ContractMeta<typeof start>} */
export const meta = {
  // @ts-expect-error splitRecord loses the property keys
  privateArgsShape: M.splitRecord(
    {
      storageNode: StorageNodeShape,
      marshaller: M.eref(M.remotable('marshaller')),
      namesByAddressAdmin: M.any(),
    },
    {
      // always optional. XXX some code is including the key, set to null
      highPrioritySendersManager: M.or(
        M.remotable('prioritySenders manager'),
        M.null(),
      ),
      // only necessary on first invocation, not subsequent
      initialPoserInvitation: M.remotable('Invitation'),
    },
  ),
  upgradability: 'canUpgrade',
};
harden(meta);

/**
 * PriceAuthority for their median. Unlike the simpler `priceAggregator.js`,
 * this approximates the _Node Operator Aggregation_ logic of [Chainlink price
 * feeds](https://blog.chain.link/levels-of-data-aggregation-in-chainlink-price-feeds/).
 *
 * @param {ZCF<
 *   ChainlinkConfig & {
 *     timer: TimerService;
 *     brandIn: Brand<'nat'>;
 *     brandOut: Brand<'nat'>;
 *     description: string;
 *     unitAmountIn?: Amount<'nat'>;
 *   }
 * >} zcf
 * @param {{
 *   highPrioritySendersManager?: PrioritySendersManager;
 *   initialPoserInvitation: Invitation;
 *   marshaller: Remote<Marshaller>;
 *   namesByAddressAdmin: ERef<NameAdmin>;
 *   storageNode: Remote<StorageNode>;
 * }} privateArgs
 * @param {Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  trace('prepare with baggage keys', [...baggage.keys()]);

  // xxx uses contract baggage as issuerBagage, assumes one issuer in this contract
  /** @type {QuoteKit} */
  // @ts-expect-error cast
  const quoteIssuerKit = prepareIssuerKit(
    baggage,
    'quote',
    'set',
    undefined,
    undefined,
    { recoverySetsOption: 'noRecoverySets' },
  );

  const {
    highPrioritySendersManager,
    initialPoserInvitation,
    marshaller: remoteMarshaller,
    namesByAddressAdmin,
    storageNode,
  } = privateArgs;

  const { description, timer } = zcf.getTerms();

  trace('awaited args');

  const cachingMarshaller = wrapRemoteMarshaller(remoteMarshaller);

  const makeDurablePublishKit = prepareDurablePublishKit(
    baggage,
    'Price Aggregator publish kit',
  );
  const makeRecorder = prepareRecorder(baggage, cachingMarshaller);

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
    cachingMarshaller,
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
    await (highPrioritySendersManager &&
      E(highPrioritySendersManager).add(description, addr));
    return `added ${addr}`;
  };

  /**
   * Remove an oracle from aggregation and disable its facet.
   *
   * @param {string} addr
   */
  const removeOracle = async addr => {
    trace('removeOracle', addr);
    await E(faKit.creator).removeOracle(addr);
    await (highPrioritySendersManager &&
      E(highPrioritySendersManager).remove(description, addr));
    return `removed ${addr}`;
  };

  const governedApis = {
    /**
     * Add the specified oracles. May partially fail, such that some oracles are
     * added and others aren't.
     *
     * @param {string[]} addrs
     * @returns {Promise<PromiseSettledResult<string>[]>}
     */
    addOracles: addrs => {
      return Promise.allSettled(addrs.map(addOracle));
    },
    /**
     * Remove the specified oracles. May partially fail, such that some oracles
     * are removed and others aren't. If the oracle was never part of the set
     * that's a PromiseRejectedResult
     *
     * @param {string[]} addrs
     * @returns {Promise<PromiseSettledResult<string>[]>}
     */
    removeOracles: addrs => {
      return Promise.allSettled(addrs.map(removeOracle));
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
harden(start);

/** @typedef {typeof start} FluxStartFn */
