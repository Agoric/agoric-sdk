import { Fail } from '@agoric/assert';
// ??? is it okay for a contract to import @agoric/internal?
import { allValues } from '@agoric/internal';
import { AmountMath } from '@agoric/ertp';
import { M } from '@agoric/store';
import { makeScalarBigMapStore, prepareExoClassKit } from '@agoric/vat-data';
import { atomicRearrange } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import { provideAll } from '@agoric/zoe/src/contractSupport/durability.js';
import { E } from '@endo/eventual-send';

const CrowdfundingKitI = {
  creator: M.interface('CrowdfundingKit creator facet', {}),
  public: M.interface('CrowdfundingKit public facet', {
    makeProvisionInvitation: M.callWhen().returns(M.remotable('Invitation')),
    makeFundingInvitation: M.callWhen().returns(M.remotable('Invitation')),
  }),
};

/**
 * @typedef {{
 *   poolNode: StorageNode,
 *   funderAmounts: MapStore<ZCFSeat, Amount<'nat'>>,
 *   providerSeat: ZCFSeat,
 *   threshold: Amount<'nat'>,
 *   totalFunding: Amount<'nat'>,
 * }} Pool
 */

/**
 * @typedef {Pick<Pool, 'threshold' | 'totalFunding'>} PoolStatus
 */

/**
 * Initialize the crowdfunding contract environment. Configure the contract by setting
 * up feeBrand storageNode (for vstorage access). The result is a CrowdfundingKit,
 * from which the distinct creator and public facets are extracted and returned, ready for interaction.
 *
 * @param {import('@agoric/swingset-liveslots').Baggage} baggage
 * @param {ZCF} zcf - the zcf parameter
 * @param {{
 *   feeBrand: Brand;
 *   marshaller: Marshaller;
 *   storageNode: StorageNode;
 * }} opts
 */
export const prepareCrowdfundingKit = async (
  baggage,
  zcf,
  { feeBrand, marshaller, storageNode },
) => {
  /**
   * Initially, when the contract starts, retrieve stableAmountShape from feeBrand.
   * Once retrieved, these values are stored in 'baggage'.
   * In subsequent contract upgrades or initializations, instead of making remote calls again, `provideAll`
   * efficiently fetches these values from the baggage. This process guarantees that the contract can be
   * upgraded or re-initialized without needing to contact other vats (for feeBrand).
   */
  const { stableAmountShape } = await provideAll(baggage, {
    stableAmountShape: () => E(feeBrand).getAmountShape(),
  });

  /**
   * @param {Pool} pool
   */
  const publishStatus = async ({ poolNode, threshold, totalFunding }) => {
    /** @type {PoolStatus} */
    const status = {
      threshold,
      totalFunding,
    };
    const encoded = await E(marshaller).toCapData(status);

    await E(poolNode).setValue(
      // TODO use RecorderKit to enforce shape and provide a non-vstorage feed
      JSON.stringify(encoded),
    );
  };

  /**
   * @param {Pool} pool
   * @param {ZCFSeat} newFunderSeat
   */
  const addToPool = (pool, newFunderSeat) => {
    const {
      give: { Contribution: given },
    } = newFunderSeat.getProposal();
    console.log('addToPool', pool, newFunderSeat, given);
    given || Fail`newFunderSeat ${newFunderSeat} has invalid proposal`;
    pool.funderAmounts.init(newFunderSeat, given);

    // return this pool, be mindful of updating storage before it's read again
    const totalFunding = AmountMath.add(pool.totalFunding, given);
    return { ...pool, totalFunding };
  };

  /**
   * @param {Pool} pool
   */
  function processFundingThresholdReached(pool) {
    // transfer the funds
    // ??? is this data structure too large in RAM?
    /** @type {TransferPart[]} */
    const transfers = Array.from(pool.funderAmounts.entries()).map(
      // ??? what happens if we omit the AmountKeywordRecords
      ([funderSeat, amt]) => [
        funderSeat,
        pool.providerSeat,
        { Contribution: amt },
        { Compensation: amt },
      ],
    );
    atomicRearrange(zcf, transfers);

    // exit all the seats
    pool.providerSeat.exit();
    for (const seat of pool.funderAmounts.keys()) {
      seat.exit();
    }

    // TODO remove seats that have been exited, removing them from totalFunding
    // XXX maybe instead mutate the collection within this function
  }

  /**
   * @param {MapStore<string, Pool>} pools
   * @param {ZCFSeat} providerSeat
   */
  async function provisionOfferHandler(pools, providerSeat) {
    const {
      give: { Fee: given },
      want: { Compensation },
    } = providerSeat.getProposal();
    console.info('makeProvisionInvitation', given);

    const poolKey = String(pools.getSize() + 1);
    const poolNodeP = E(E(storageNode).makeChildNode('pools')).makeChildNode(
      poolKey,
    );
    const funderAmounts = makeScalarBigMapStore('funderAmounts', {
      durable: true,
    });

    /** @type {Pool} */
    const pool = await allValues({
      poolNode: poolNodeP,
      funderAmounts,
      providerSeat,
      threshold: Compensation,
      totalFunding: AmountMath.makeEmpty(feeBrand),
    });

    pools.init(poolKey, pool);

    // assume this succeeds
    void publishStatus(pool);

    // exit the seat when the pool is fully funded
    return harden({ poolKey });
  }

  /**
   * @param {MapStore<string, Pool>} pools
   */
  function makeProvisionInvitationHelper(pools) {
    const offerHandler = async providerSeat =>
      provisionOfferHandler(pools, providerSeat);

    return zcf.makeInvitation(
      offerHandler,
      'crowdfund pool',
      undefined,
      M.splitRecord({
        // TODO charge a buck
        //   give: { Fee: stableAmountShape },
      }),
    );
  }

  /**
   * @param {object} opts
   * @param {string} opts.poolKey
   * @param {ReturnType<initState>} state
   * @param {ZCFSeat} funderSeat
   */
  function fundingOfferHandler({ poolKey }, state, funderSeat) {
    const { pools } = state;
    const storedPool = pools.get(poolKey);
    storedPool || Fail`poolKey ${poolKey} not found`;

    const {
      give: { Contribution: given },
    } = funderSeat.getProposal();
    console.info('makeFundingInvitation', given);
    const updatedPool = addToPool(storedPool, funderSeat);

    // check the threshold
    if (AmountMath.isGTE(updatedPool.totalFunding, updatedPool.threshold)) {
      console.info(`funding has been reached`);
      processFundingThresholdReached(updatedPool);
    }
    pools.set(poolKey, updatedPool);

    // assume this succeeds
    void publishStatus(updatedPool);

    // do not exit the seat until the threshold is met
  }

  /**
   * Create an invitation that will be exposed through the `public` facet of the contract, allowing participants to join the pool.
   * The `poolKey` acts as the address, directing participants to the correct pool they wish to contribute to.
   * `state` maintains the pool's context, like a guest list, capturing who is participating and the nature of their contributions.
   *
   * Accepting this invitation places a participant in the `fundingSeat`, where they are ready to make their contribution.
   * Here, `offerHandler` plays a crucial role in validating the participant's offer against the pool's needs and guidelines,
   * ensuring that each contribution aligns seamlessly with the pool's objectives.
   *
   * The invitation explicitly details the expected form of contribution, defined by `stableAmountShape`.
   * @param {object} opts
   * @param {string} opts.poolKey
   * @param {ReturnType<initState>} state
   */
  function makeFundingInvitationHelper({ poolKey }, state) {
    state.pools.has(poolKey) || Fail`poolKey ${poolKey} not found`;

    const offerHandler = async seat =>
      fundingOfferHandler({ poolKey }, state, seat);

    return zcf.makeInvitation(
      offerHandler,
      'contribute to a crowdfund pool',
      undefined,
      M.splitRecord({
        give: { Contribution: stableAmountShape },
      }),
    );
  }

  /**
   * initState function initializes the initial state of the contract. This state is then accessible
   * within the facets through this.state, providing a shared and consistent data context for
   * various functionalities of the contract.
   */
  const initState = () => {
    return {
      /** @type {MapStore<string, Pool>} */
      pools: makeScalarBigMapStore('pools', { durable: true }),
    };
  };

  /**
   * prepareExoClassKit initializes a class with multiple facets and state, suitable for
   * complex smart contracts like CrowdfundingKit.
   * CrowdfundingKitI outlines the structure and expected functionalities of the facets,
   * and initState sets up the initial state required for these implementations to operate
   * effectively within the contract.
   */
  const makeCrowdfundingKit = prepareExoClassKit(
    baggage,
    'CrowdfundingKit',
    CrowdfundingKitI,
    initState,
    // define facets inline to infer the type for `this`
    {
      creator: {},
      public: {
        makeProvisionInvitation() {
          return makeProvisionInvitationHelper(this.state.pools);
        },

        /**
         * Generates an invitation to fund a pool.
         *
         * @param {object} opts
         * @param {string} opts.poolKey
         */
        makeFundingInvitation({ poolKey }) {
          return makeFundingInvitationHelper({ poolKey }, this.state);
        },
      },
    },
  );

  return makeCrowdfundingKit;
};
harden(prepareCrowdfundingKit);
