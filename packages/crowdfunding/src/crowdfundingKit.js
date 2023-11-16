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
 *   campaignNode: StorageNode,
 *   funderAmounts: MapStore<ZCFSeat, Amount<'nat'>>,
 *   providerSeat: ZCFSeat,
 *   threshold: Amount<'nat'>,
 *   totalFunding: Amount<'nat'>,
 * }} Campaign
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
 *   storageNode: StorageNode;
 * }} opts
 */
export const prepareCrowdfundingKit = async (
  baggage,
  zcf,
  { feeBrand, storageNode },
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
   * @param {Campaign} campaign
   * @param {ZCFSeat} newFunderSeat
   */
  const addToPool = (campaign, newFunderSeat) => {
    const {
      give: { Contribution: given },
    } = newFunderSeat.getProposal();
    console.log('addToPool', campaign, newFunderSeat, given);
    given || Fail`newFunderSeat ${newFunderSeat} has invalid proposal`;
    campaign.funderAmounts.init(newFunderSeat, given);

    // return this campaign, be mindful of updating storage before it's read again
    const totalFunding = AmountMath.add(campaign.totalFunding, given);
    return { ...campaign, totalFunding };
  };

  /**
   * @param {Campaign} campaign
   */
  function processFundingThresholdReached(campaign) {
    // transfer the funds
    // ??? is this data structure too large in RAM?
    /** @type {TransferPart[]} */
    const transfers = Array.from(campaign.funderAmounts.entries()).map(
      // ??? what happens if we omit the AmountKeywordRecords
      ([funderSeat, amt]) => [
        funderSeat,
        campaign.providerSeat,
        { Contribution: amt },
        { Compensation: amt },
      ],
    );
    atomicRearrange(zcf, transfers);

    // exit all the seats
    campaign.providerSeat.exit();
    for (const seat of campaign.funderAmounts.keys()) {
      seat.exit();
    }

    // TODO remove seats that have been exited, removing them from totalFunding
    // XXX maybe instead mutate the collection within this function
  }

  async function provisionOfferHandler(state, providerSeat) {
    const { campaigns } = state;
    const {
      give: { Fee: given },
      want: { Compensation },
    } = providerSeat.getProposal();
    console.info('makeProvisionInvitation', given);

    const key = String(campaigns.getSize() + 1);
    const campaignNode = await E(
      E(storageNode).makeChildNode('campaigns'),
    ).makeChildNode(key);
    await E(campaignNode).setValue('RESERVED');
    const funderAmounts = makeScalarBigMapStore('funderAmounts', {
      durable: true,
    });

    campaigns.init(
      key,
      harden({
        campaignNode,
        funderAmounts,
        providerSeat,
        threshold: Compensation,
        totalFunding: AmountMath.makeEmpty(feeBrand),
      }),
    );
    // exit the seat when the campaign is fully funded
    return harden({ key });
  }

  /**
   *
   * @param ReturnType<typeof prepareCrowdfundingKit>
   */

  function makeProvisionInvitationHelper(state) {
    const offerHandler = async providerSeat =>
      provisionOfferHandler(state, providerSeat);

    return zcf.makeInvitation(
      offerHandler,
      'campaign',
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
    const { campaigns } = state;
    const campaign = campaigns.get(key);
    campaign || Fail`key ${key} not found`;

    const {
      give: { Contribution: given },
    } = fundingSeat.getProposal();
    console.info('makeFundingInvitation', given);
    const updatedCampaign = addToPool(campaign, fundingSeat);

    // check the threshold
    if (AmountMath.isGTE(updatedCampaign.totalFunding, campaign.threshold)) {
      console.info(`funding has been reached`);
      processFundingThresholdReached(campaign);
    }
    campaigns.set(key, updatedCampaign);
    // do not exit the seat until the threshold is met
  }

  /**
   * Create an invitation that will be exposed through the `public` facet of the contract, allowing participants to join the campaign.
   * The `key` acts as the address, directing participants to the correct campaign they wish to contribute to.
   * `state` maintains the campaign's context, like a guest list, capturing who is participating and the nature of their contributions.
   *
   * Accepting this invitation places a participant in the `fundingSeat`, where they are ready to make their contribution.
   * Here, `offerHandler` plays a crucial role in validating the participant's offer against the campaign's needs and guidelines,
   * ensuring that each contribution aligns seamlessly with the campaign's objectives.
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
      /** @type {MapStore<string, Campaign>} */
      campaigns: makeScalarBigMapStore('campaigns', { durable: true }),
    };
  };

  /**
   * Facets in Agoric smart contracts are similar to APIs. They provide specific interfaces
   * through which users or other contracts can interact with the contract.
   * Here facets implements interfaces defined in the CrowdfundingKitI interface.
   */
  const facets = {
    creator: {},
    public: {
      makeProvisionInvitation() {
        return makeProvisionInvitationHelper(this.state);
      },

      /**
       * Generates a campaign invitation.
       *
       * @param {object} opts
       * @param {string} opts.key
       */
      makeFundingInvitation({ key }) {
        return makeFundingInvitationHelper({ key }, this.state);
      },
    },
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
    facets,
  );

  return makeCrowdfundingKit;
};
harden(prepareCrowdfundingKit);
