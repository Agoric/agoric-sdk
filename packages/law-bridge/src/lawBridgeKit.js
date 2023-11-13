import { Fail } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';
import { M, makeScalarBigMapStore, prepareExoClassKit } from '@agoric/vat-data';
import { atomicRearrange } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import { provideAll } from '@agoric/zoe/src/contractSupport/durability.js';
import { E } from '@endo/eventual-send';

const LawBridgeKitI = {
  creator: M.interface('LawBridgeKit creator facet', {}),
  public: M.interface('LawBridgeKit public facet', {
    makeBindingInvitation: M.call().returns(M.promise()),
    makeFundingInvitation: M.call().returns(M.promise()),
  }),
};

/**
 * @typedef {{
 * bindingNode: StorageNode,
 * funderAmounts: MapStore<ZCFSeat, Amount<'nat'>>,
 * providerSeat: ZCFSeat,
 * threshold: Amount<'nat'>,
 * totalFunding: Amount<'nat'>,
 * }} Binding
 */

/**
 * Generate the function comment for the given function.
 *
 * @param {import('@agoric/swingset-liveslots').Baggage} baggage
 * @param {ZCF} zcf - the zcf parameter
 * @param {{
 *   stableBrand: Brand;
 *   storageNode: StorageNode;
 *   marshaller: Marshaller;
 * }} opts
 */
export const prepareLawBridgeKit = async (
  baggage,
  zcf,
  { stableBrand, storageNode, marshaller },
) => {
  const { stableAmountShape } = await provideAll(baggage, {
    stableAmountShape: () => E(stableBrand).getAmountShape(),
  });

  const initState = () => {
    return {
      /** @type {MapStore<string, Binding>} */
      bindings: makeScalarBigMapStore('bindings'),
    };
  };

  /**
   *
   * @param {Binding} binding
   * @param {ZCFSeat} newFunderSeat
   */
  const addToPool = (binding, newFunderSeat) => {
    const {
      give: { Contribution: given },
    } = newFunderSeat.getProposal();
    console.log('addToPool', binding, newFunderSeat, given);
    given || Fail`newFunderSeat ${newFunderSeat} has invalid proposal`;
    binding.funderAmounts.init(newFunderSeat, given);

    // return this binding, be mindful of updating storage before it's read again
    const totalFunding = AmountMath.add(binding.totalFunding, given);

    // TODO remove seats that have been exited, removing them from totalFunding

    // check the threshold
    if (AmountMath.isGTE(totalFunding, binding.threshold)) {
      // funding has been reached
      console.info(`funding has been reached`);

      // transfer the funds
      // ??? is this data structure too large in RAM?
      /** @type {TransferPart[]} */
      const transfers = Array.from(binding.funderAmounts.entries()).map(
        // ??? what happens if we omit the AmountKeywordRecords
        ([funderSeat, amt]) => [
          funderSeat,
          binding.providerSeat,
          { Contribution: amt },
          { Compensation: amt },
        ],
      );
      atomicRearrange(zcf, transfers);

      // exit all the seats
      binding.providerSeat.exit();
      for (const seat of binding.funderAmounts.keys()) {
        seat.exit();
      }
    }
    // XXX maybe instead mutate the collection within this function
    return { ...binding, totalFunding };
  };

  const makeLawBridgeKit = prepareExoClassKit(
    baggage,
    'LawBridgeKit',
    LawBridgeKitI,
    initState,
    {
      creator: {},
      public: {
        /**
         * Generates a binding invitation.
         */
        makeBindingInvitation() {
          const { bindings } = this.state;

          const hook =
            /** @param {ZCFSeat} providerSeat */
            async providerSeat => {
              const {
                give: { Fee: given },
                want: { Compensation },
              } = providerSeat.getProposal();
              console.info('makeBindingInvitation', given);
              const key = String(bindings.getSize() + 1);
              const bindingNode = await E(
                E(storageNode).makeChildNode('bindings'),
              ).makeChildNode(key);
              await E(bindingNode).setValue('RESERVED');
              const funderAmounts = makeScalarBigMapStore('funderAmounts');
              bindings.init(
                key,
                harden({
                  bindingNode,
                  funderAmounts,
                  providerSeat,
                  threshold: Compensation,
                  totalFunding: AmountMath.makeEmpty(stableBrand),
                }),
              );
              // exit the seat when the binding is fully funded
            };

          return zcf.makeInvitation(
            hook,
            'binding',
            undefined,
            M.splitRecord({
              // TODO charge a buck
              //   give: { Fee: stableAmountShape },
            }),
          );
        },
        /**
         * Generates a binding invitation.
         *
         * @param {object} opts
         * @param {string} opts.key
         */
        makeFundingInvitation({ key }) {
          const { bindings } = this.state;

          const binding = bindings.get(key);
          binding || Fail`key ${key} not found`;

          const hook =
            /** @param {ZCFSeat} seat */
            async seat => {
              const {
                give: { Contribution: given },
              } = seat.getProposal();
              console.info('makeFundingInvitation', given);
              const updatedBinding = addToPool(binding, seat);
              bindings.set(key, updatedBinding);
              // do not exit the seat until the threshold is met
            };

          return zcf.makeInvitation(
            hook,
            'funding',
            undefined,
            M.splitRecord({
              give: { Contribution: stableAmountShape },
            }),
          );
        },
      },
    },
  );

  return makeLawBridgeKit;
};
harden(prepareLawBridgeKit);
