import { Fail } from '@agoric/assert';
// ??? is it okay for a contract to import @agoric/internal?
import { allValues } from '@agoric/internal';
import { AmountMath } from '@agoric/ertp';
import { M, mustMatch, makeCopySet } from '@agoric/store';
import { makeScalarBigMapStore, prepareExoClassKit } from '@agoric/vat-data';
import { atomicRearrange } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import { provideAll } from '@agoric/zoe/src/contractSupport/durability.js';
import { E } from '@endo/eventual-send';

const CrowdfundingKitI = {
  creator: M.interface('CrowdfundingKit creator facet', {}),
  public: M.interface('CrowdfundingKit public facet', {
    getContributionTokenBrand: M.callWhen().returns(M.remotable('Brand')),
    makeProvisionInvitation: M.callWhen().returns(M.remotable('Invitation')),
    makeFundingInvitation: M.callWhen().returns(M.remotable('Invitation')),
  }),
};

/**
 * @typedef {{
 *   poolName?: string,
 * }} PoolData
 */

/**
 * @typedef {{
 *   amount: Amount<'nat'>,
 *   funderName?: string,
 * }} FunderData
 */

/**
 * @typedef {{
 *   poolNode: StorageNode,
 *   funderData: MapStore<ZCFSeat, FunderData>,
 *   providerSeat: ZCFSeat,
 *   threshold: Amount<'nat'>,
 *   totalFunding: Amount<'nat'>,
 * } & PoolData} Pool
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
 *   contributionTokenMint: ZCFMint<'copySet'>;
 *   feeBrand: Brand;
 *   marshaller: Marshaller;
 *   storageNode: StorageNode;
 * }} opts
 */
export const prepareCrowdfundingKit = async (
  baggage,
  zcf,
  { contributionTokenMint: providedMint, feeBrand, marshaller, storageNode },
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
   * @param {Partial<Exclude<FunderData, 'amount'>>} newFunderData
   */
  const addToPool = (pool, newFunderSeat, newFunderData) => {
    const {
      give: { Contribution: given },
    } = newFunderSeat.getProposal();
    console.log('addToPool', pool, newFunderSeat, given);
    given || Fail`newFunderSeat ${newFunderSeat} has invalid proposal`;
    pool.funderData.init(
      newFunderSeat,
      harden({ ...newFunderData, amount: given }),
    );

    // return this pool, be mindful of updating storage before it's read again
    const totalFunding = AmountMath.add(pool.totalFunding, given);
    return { ...pool, totalFunding };
  };

  /**
   * @param {Pool} pool
   * @param {{poolKey: string} & Pick<ReturnType<initState>, 'contributionTokenMint'>} options
   */
  async function processFundingThresholdReached(
    pool,
    { poolKey, contributionTokenMint: mint },
  ) {
    const { poolName } = pool;
    const { brand } = mint.getIssuerRecord();
    // transfer the funds
    // ??? is this data structure too large in RAM?
    /** @type {TransferPart[]} */
    const transfers = Array.from(pool.funderData.entries()).map(
      // ??? what happens if we omit the AmountKeywordRecords
      ([funderSeat, funderData]) => {
        const { amount, funderName } = funderData;
        const giftAmount = AmountMath.make(
          brand,
          makeCopySet([{ poolKey, poolName, funderName }]),
        );
        mint.mintGains({ ContributionToken: giftAmount }, funderSeat);
        return [
          funderSeat,
          pool.providerSeat,
          { Contribution: amount },
          { Compensation: amount },
        ];
      },
    );
    atomicRearrange(zcf, transfers);

    // exit all the seats
    pool.providerSeat.exit();
    for (const seat of pool.funderData.keys()) {
      seat.exit();
    }

    // TODO remove seats that have been exited, removing them from totalFunding
    // XXX maybe instead mutate the collection within this function
  }

  /**
   * @param {MapStore<string, Pool>} pools
   * @param {ZCFSeat} providerSeat
   * @param {Partial<PoolData>} [offerArgs]
   */
  async function provisionOfferHandler(
    pools,
    providerSeat,
    offerArgs = harden({}),
  ) {
    const {
      give: { Fee: given },
      want: { Compensation },
    } = providerSeat.getProposal();
    console.info('makeProvisionInvitation', given);

    mustMatch(offerArgs, M.splitRecord({}, { poolName: M.string() }));
    const { poolName } = offerArgs;

    const poolKey = String(pools.getSize() + 1);
    const poolNodeP = E(E(storageNode).makeChildNode('pools')).makeChildNode(
      poolKey,
    );
    const funderData = makeScalarBigMapStore('funderData', {
      durable: true,
    });

    /** @type {Pool} */
    const pool = await allValues({
      poolName,
      poolNode: poolNodeP,
      funderData,
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
    const offerHandler = async (providerSeat, offerArgs) =>
      provisionOfferHandler(pools, providerSeat, offerArgs);

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
   * @param {Partial<Exclude<FunderData, 'amount'>>} [offerArgs]
   */
  async function fundingOfferHandler(
    { poolKey },
    state,
    funderSeat,
    offerArgs = harden({}),
  ) {
    const { pools, contributionTokenMint } = state;
    const storedPool = pools.get(poolKey);
    storedPool || Fail`poolKey ${poolKey} not found`;

    mustMatch(offerArgs, M.splitRecord({}, { funderName: M.string() }));
    const { funderName } = offerArgs;
    const {
      give: { Contribution: given },
    } = funderSeat.getProposal();
    console.info('makeFundingInvitation', given);

    await null;
    const updatedPool = addToPool(storedPool, funderSeat, { funderName });

    // check the threshold
    if (AmountMath.isGTE(updatedPool.totalFunding, updatedPool.threshold)) {
      console.info(`funding has been reached`);
      await processFundingThresholdReached(updatedPool, {
        poolKey,
        contributionTokenMint,
      });
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
   * @param {string} poolKey
   * @param {ReturnType<initState>} state
   */
  function makeFundingInvitationHelper(poolKey, state) {
    state.pools.has(poolKey) || Fail`poolKey ${poolKey} not found`;

    const offerHandler = async (seat, offerArgs) =>
      fundingOfferHandler({ poolKey }, state, seat, offerArgs);

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
      contributionTokenMint: providedMint,
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
        async getContributionTokenBrand() {
          const { state } = this;
          const issuerKit = await E(
            state.contributionTokenMint,
          ).getIssuerRecord();
          return issuerKit.brand;
        },

        makeProvisionInvitation() {
          const { state } = this;
          return makeProvisionInvitationHelper(state.pools);
        },

        /**
         * Generates an invitation to fund a pool.
         *
         * @param {object} opts
         * @param {string} opts.poolKey
         */
        makeFundingInvitation({ poolKey }) {
          const { state } = this;
          return makeFundingInvitationHelper(poolKey, state);
        },
      },
    },
  );

  return makeCrowdfundingKit;
};
harden(prepareCrowdfundingKit);
