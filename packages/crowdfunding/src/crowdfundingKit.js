import { Fail } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';
import { M, makeScalarBigMapStore, prepareExoClassKit } from '@agoric/vat-data';
import { atomicRearrange } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import { provideAll } from '@agoric/zoe/src/contractSupport/durability.js';
import { E } from '@endo/eventual-send';

const CrowdfundingKitI = {
  creator: M.interface('CrowdfundingKit creator facet', {}),
  public: M.interface('CrowdfundingKit public facet', {
    makeProvisionInvitation: M.call().returns(M.promise()),
    makeFundingInvitation: M.call().returns(M.promise()),
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
      // TODO use RecorderKit to enforce shape ane provide a non-vstorage feed
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

    // assume this succeeds
    void publishStatus(pool);
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

    const key = String(pools.getSize() + 1);
    const poolNode = await E(
      E(storageNode).makeChildNode('pools'),
    ).makeChildNode(key);
    const funderAmounts = makeScalarBigMapStore('funderAmounts', {
      durable: true,
    });

    const pool = harden({
      poolNode,
      funderAmounts,
      providerSeat,
      threshold: Compensation,
      totalFunding: AmountMath.makeEmpty(feeBrand),
    });

    pools.init(key, pool);

    // assume this succeeds
    void publishStatus(pool);

    // exit the seat when the pool is fully funded
    return harden({ key });
  }

  /**
   * @param {MapStore<string, Pool>} pools
   */
  function makeProvisionInvitationHelper(pools) {
    const offerHandler = async providerSeat =>
      provisionOfferHandler(pools, providerSeat);

    return zcf.makeInvitation(
      offerHandler,
      'pool',
      undefined,
      M.splitRecord({
        // TODO charge a buck
        //   give: { Fee: stableAmountShape },
      }),
    );
  }

  /**
   * @param {object} opts
   * @param {string} opts.key
   * @param {object} state
   * @param {ZCFSeat} fundingSeat
   */
  function fundingOfferHandler({ key }, state, fundingSeat) {
    const { pools } = state;
    const pool = pools.get(key);
    pool || Fail`key ${key} not found`;

    const {
      give: { Contribution: given },
    } = fundingSeat.getProposal();
    console.info('makeFundingInvitation', given);
    const updatedPool = addToPool(pool, fundingSeat);

    // check the threshold
    if (AmountMath.isGTE(updatedPool.totalFunding, pool.threshold)) {
      console.info(`funding has been reached`);
      processFundingThresholdReached(pool);
    }
    pools.set(key, updatedPool);
    // do not exit the seat until the threshold is met
  }

  /**
   * Create an invitation that will be exposed through the `public` facet of the contract, allowing participants to join the pool.
   * The `key` acts as the address, directing participants to the correct pool they wish to contribute to.
   * `state` maintains the pool's context, like a guest list, capturing who is participating and the nature of their contributions.
   *
   * Accepting this invitation places a participant in the `fundingSeat`, where they are ready to make their contribution.
   * Here, `offerHandler` plays a crucial role in validating the participant's offer against the pool's needs and guidelines,
   * ensuring that each contribution aligns seamlessly with the pool's objectives.
   *
   * The invitation explicitly details the expected form of contribution, defined by `stableAmountShape`.
   * @param {object} opts
   * @param {string} opts.key
   * @param {object} state
   */
  function makeFundingInvitationHelper({ key }, state) {
    const offerHandler = async seat =>
      fundingOfferHandler({ key }, state, seat);

    return zcf.makeInvitation(
      offerHandler,
      'funding',
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
         * Generates a pool invitation.
         *
         * @param {object} opts
         * @param {string} opts.key
         */
        makeFundingInvitation({ key }) {
          return makeFundingInvitationHelper({ key }, this.state);
        },
      },
    },
  );

  return makeCrowdfundingKit;
};
harden(prepareCrowdfundingKit);
